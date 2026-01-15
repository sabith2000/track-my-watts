// client/src/utils/exportHelper.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import apiClient from '../services/api';

// --- HELPER: FORMATTING ---
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
};

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '-';
    return `₹${Number(amount).toFixed(2)}`;
};

// --- HELPER: FILE NAMING ---
const generateFileName = (prefix, cycle, extension) => {
    // Dates for readability
    const start = new Date(cycle.startDate).toISOString().split('T')[0];
    
    // Timestamp for uniqueness (HHMMSS)
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, ''); 

    return `TrackMyWatts_${prefix}_${start}_${timeStr}.${extension}`;
};

// --- MAIN EXCEL FUNCTION ---
export const exportToExcel = async (cycleId) => {
    try {
        // 1. FETCH FULL DATA
        const response = await apiClient.get(`/billing-cycles/${cycleId}/export-data`);
        const { cycle, readings, analytics } = response.data;

        const wb = XLSX.utils.book_new();

        // --- SHEET 1: SUMMARY ---
        const summaryData = [
            { A: "ELECTRICITY BILL REPORT", B: "" },
            { A: "Generated On:", B: new Date().toLocaleString() },
            { A: "", B: "" },
            { A: "BILLING SUMMARY", B: "" },
            { A: "Period:", B: `${formatDate(cycle.startDate)} to ${formatDate(cycle.endDate)}` },
            { A: "Status:", B: cycle.status.toUpperCase() },
            { A: "Total Consumption:", B: `${cycle.totalUnits} units` },
            { A: "Total Amount:", B: formatCurrency(cycle.totalCost) },
            { A: "", B: "" },
            { A: "METER BREAKDOWN", B: "" },
            { A: "Meter Name", B: "Type", C: "Units", D: "Cost" }
        ];
        
        if (cycle.meterDetails) {
            cycle.meterDetails.forEach(m => {
                summaryData.push({ A: m.meterName, B: m.meterType, C: m.units, D: m.cost });
            });
        }
        
        summaryData.push({ A: "", B: "" });
        summaryData.push({ A: "ANALYTICS SNAPSHOT", B: "" });
        summaryData.push({ A: "Avg Daily Use:", B: `${analytics.averageDailyConsumption} units/day` });
        summaryData.push({ A: "Peak Usage Day:", B: `${formatDate(analytics.peakUsageDay)} (${analytics.peakUsageAmount} units)` });

        const wsSummary = XLSX.utils.json_to_sheet(summaryData, { skipHeader: true });
        wsSummary['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

        // --- SHEET 2: RAW READINGS ---
        const readingsData = [
            ["Date", "Meter Name", "Type", "Reading Value", "Consumed"] // Header
        ];
        readings.forEach(r => {
            readingsData.push([
                formatDate(r.date),
                r.meterName,
                r.meterType,
                r.readingValue,
                r.unitsConsumed
            ]);
        });
        const wsReadings = XLSX.utils.aoa_to_sheet(readingsData);
        wsReadings['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsReadings, "Raw Readings");

        // --- SHEET 3: ANALYTICS ---
        const analyticsData = [
            ["Metric", "Value"],
            ["Days in Cycle", analytics.daysInCycle],
            ["Total Readings", analytics.totalReadingsCount],
            ["Average Daily Consumption", analytics.averageDailyConsumption],
            ["Peak Usage Amount", analytics.peakUsageAmount],
            ["Peak Usage Date", formatDate(analytics.peakUsageDay)]
        ];
        const wsAnalytics = XLSX.utils.aoa_to_sheet(analyticsData);
        wsAnalytics['!cols'] = [{ wch: 25 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsAnalytics, "Analytics");

        // DOWNLOAD
        const fileName = generateFileName('Report', cycle, 'xlsx');
        XLSX.writeFile(wb, fileName);
        return true;

    } catch (error) {
        console.error("Excel Export Error:", error);
        throw error;
    }
};

// --- MAIN PDF FUNCTION ---
export const exportToPDF = async (cycleId) => {
    try {
        // 1. FETCH FULL DATA
        const response = await apiClient.get(`/billing-cycles/${cycleId}/export-data`);
        const { cycle } = response.data;

        const doc = new jsPDF();

        // BRANDING HEADER
        doc.setFillColor(79, 70, 229); // Indigo-600
        doc.rect(0, 0, 210, 40, 'F');
        doc.setFontSize(24);
        doc.setTextColor(255, 255, 255);
        doc.text("Electricity Statement", 14, 25);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 25);

        // SUMMARY BOX
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text("Billing Summary", 14, 55);
        doc.setDrawColor(200);
        doc.line(14, 58, 196, 58);

        const startY = 65;
        // Left Column
        doc.setFontSize(10);
        doc.text("Billing Period:", 14, startY);
        doc.setFont("helvetica", "bold");
        doc.text(`${formatDate(cycle.startDate)} - ${formatDate(cycle.endDate)}`, 45, startY);
        
        doc.setFont("helvetica", "normal");
        doc.text("Status:", 14, startY + 8);
        doc.setFont("helvetica", "bold");
        doc.text(cycle.status.toUpperCase(), 45, startY + 8);

        // Right Column (Total Box)
        doc.setFillColor(243, 244, 246);
        doc.roundedRect(120, 50, 76, 25, 2, 2, 'F');
        doc.setFont("helvetica", "normal");
        doc.text("Total Amount Due:", 125, 60);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text(formatCurrency(cycle.totalCost), 125, 70);
        doc.setTextColor(0);

        // METER TABLE
        const tableRows = cycle.meterDetails.map(m => [
            m.meterName,
            m.meterType,
            `${m.units} units`,
            formatCurrency(m.cost)
        ]);

        // Total Row
        tableRows.push([
            { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `${cycle.totalUnits}`, styles: { fontStyle: 'bold' } },
            { content: formatCurrency(cycle.totalCost), styles: { fontStyle: 'bold', textColor: [0, 100, 0] } }
        ]);

        autoTable(doc, {
            startY: 90,
            head: [["Meter Name", "Type", "Consumption", "Cost"]],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: 255 },
            styles: { fontSize: 10, cellPadding: 6 },
            alternateRowStyles: { fillColor: [249, 250, 251] }
        });

        // NOTES
        if (cycle.notes) {
            const finalY = (doc).lastAutoTable.finalY + 15;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Remarks:", 14, finalY);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(80);
            const splitNotes = doc.splitTextToSize(cycle.notes, 180);
            doc.text(splitNotes, 14, finalY + 6);
        }

        // FOOTER
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Track My Watts - Personal Energy Manager", 105, 285, { align: "center" });

        // DOWNLOAD
        const fileName = generateFileName('Bill', cycle, 'pdf');
        doc.save(fileName);
        return true;

    } catch (error) {
        console.error("PDF Export Error:", error);
        throw error;
    }
};