// client/src/utils/exportHelper.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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
    const start = new Date(cycle.startDate).toISOString().split('T')[0];
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, ''); 
    return `TrackMyWatts_${prefix}_${start}_${timeStr}.${extension}`;
};

// --- EXCEL STYLING HELPERS ---
const applyHeaderStyle = (row) => {
    row.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' } // Indigo-600
        };
        cell.font = {
            color: { argb: 'FFFFFFFF' }, // White
            bold: true,
            size: 11
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });
};

const applyDataBorderStyle = (row) => {
    row.eachCell((cell) => {
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
};

// --- MAIN EXCEL FUNCTION (Robust) ---
export const exportToExcel = async (cycleId) => {
    try {
        // 1. FETCH FULL DATA
        const response = await apiClient.get(`/billing-cycles/${cycleId}/export-data`);
        const { cycle, readings, analytics } = response.data;

        // 2. CREATE WORKBOOK
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Track My Watts';
        workbook.created = new Date();

        // ==========================================
        // SHEET 1: SUMMARY
        // ==========================================
        const wsSummary = workbook.addWorksheet('Summary', { properties: { tabColor: { argb: 'FF4F46E5' } } });
        
        // Title
        wsSummary.mergeCells('A1:D1');
        const titleCell = wsSummary.getCell('A1');
        titleCell.value = 'ELECTRICITY BILLING REPORT';
        titleCell.font = { size: 16, bold: true, color: { argb: 'FF4F46E5' } };
        titleCell.alignment = { horizontal: 'center' };

        // Meta Info
        wsSummary.getCell('A2').value = `Generated On: ${new Date().toLocaleString()}`;
        wsSummary.getCell('A3').value = `Period: ${formatDate(cycle.startDate)} to ${formatDate(cycle.endDate)}`;
        wsSummary.getCell('A4').value = `Status: ${cycle.status.toUpperCase()}`;

        // Summary Table Header (Row 6)
        const summaryHeaderRow = wsSummary.getRow(6);
        summaryHeaderRow.values = ['Meter Name', 'Type', 'Consumption (Units)', 'Cost (INR)'];
        applyHeaderStyle(summaryHeaderRow);

        // Meter Data Rows
        if (cycle.meterDetails) {
            cycle.meterDetails.forEach(m => {
                const row = wsSummary.addRow([m.meterName, m.meterType, m.units, m.cost]);
                applyDataBorderStyle(row);
                // Currency Format
                row.getCell(4).numFmt = '"₹"#,##0.00'; 
                row.getCell(3).numFmt = '#,##0.00" u"';
            });
        }

        // Totals Row
        const totalRow = wsSummary.addRow(['TOTAL', '', cycle.totalUnits, cycle.totalCost]);
        totalRow.font = { bold: true };
        totalRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        totalRow.getCell(4).numFmt = '"₹"#,##0.00';
        applyDataBorderStyle(totalRow);

        // Analytics Snapshot
        wsSummary.addRow([]);
        wsSummary.addRow(['ANALYTICS SNAPSHOT']).font = { bold: true, color: { argb: 'FF4F46E5' } };
        wsSummary.addRow(['Avg Daily Use', `${analytics.averageDailyConsumption} units/day`]);
        wsSummary.addRow(['Peak Usage Day', `${formatDate(analytics.peakUsageDay)} (${analytics.peakUsageAmount} units)`]);

        // Column Widths
        wsSummary.columns = [
            { width: 25 }, { width: 20 }, { width: 20 }, { width: 20 }
        ];

        // ==========================================
        // SHEET 2: RAW READINGS
        // ==========================================
        const wsReadings = workbook.addWorksheet('Raw Readings');
        
        const readingsHeader = wsReadings.getRow(1);
        readingsHeader.values = ['Date', 'Meter Name', 'Type', 'Reading Value', 'Consumed (Units)'];
        applyHeaderStyle(readingsHeader);

        readings.forEach(r => {
            const row = wsReadings.addRow([
                new Date(r.date), // Real Date Object
                r.meterName,
                r.meterType,
                r.readingValue,
                r.unitsConsumed
            ]);
            applyDataBorderStyle(row);
            row.getCell(1).numFmt = 'dd-mmm-yyyy'; // Excel Date Format
        });

        wsReadings.columns = [
            { width: 15 }, { width: 25 }, { width: 20 }, { width: 15 }, { width: 18 }
        ];

        // ==========================================
        // SHEET 3: ANALYTICS DATA
        // ==========================================
        const wsAnalytics = workbook.addWorksheet('Analytics Data');
        const analyticsHeader = wsAnalytics.getRow(1);
        analyticsHeader.values = ['Metric', 'Value'];
        applyHeaderStyle(analyticsHeader);

        const analyticsRows = [
            ['Days in Cycle', analytics.daysInCycle],
            ['Total Readings', analytics.totalReadingsCount],
            ['Avg Daily Consumption', analytics.averageDailyConsumption],
            ['Peak Usage Amount', analytics.peakUsageAmount],
            ['Peak Usage Date', new Date(analytics.peakUsageDay)]
        ];

        analyticsRows.forEach(r => {
            const row = wsAnalytics.addRow(r);
            applyDataBorderStyle(row);
            if (r[0] === 'Peak Usage Date') row.getCell(2).numFmt = 'dd-mmm-yyyy';
        });

        wsAnalytics.columns = [{ width: 30 }, { width: 25 }];

        // 3. WRITE & SAVE
        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = generateFileName('Report', cycle, 'xlsx');
        saveAs(new Blob([buffer]), fileName);
        return true;

    } catch (error) {
        console.error("Excel Export Error:", error);
        throw error;
    }
};

// --- MAIN PDF FUNCTION (Visual Polish) ---
export const exportToPDF = async (cycleId) => {
    try {
        const response = await apiClient.get(`/billing-cycles/${cycleId}/export-data`);
        const { cycle } = response.data;

        const doc = new jsPDF();

        // HEADER STRIP
        doc.setFillColor(79, 70, 229); // Indigo-600
        doc.rect(0, 0, 210, 35, 'F');
        
        // Title
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text("Electricity Statement", 14, 22);
        
        // Date Right
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 196, 22, { align: 'right' });

        // SUMMARY SECTION
        const startY = 50;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        
        // Left Info
        doc.text("Billing Period:", 14, startY);
        doc.setFont("helvetica", "bold");
        doc.text(`${formatDate(cycle.startDate)}  -  ${formatDate(cycle.endDate)}`, 45, startY);
        
        doc.setFont("helvetica", "normal");
        doc.text("Status:", 14, startY + 6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(cycle.status === 'active' ? '008000' : '505050');
        doc.text(cycle.status.toUpperCase(), 45, startY + 6);

        // Right Info (Total Box)
        doc.setFillColor(243, 244, 246);
        doc.roundedRect(130, 42, 66, 22, 2, 2, 'F');
        doc.setTextColor(0,0,0);
        doc.setFont("helvetica", "normal");
        doc.text("Amount Due:", 135, 49);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text(formatCurrency(cycle.totalCost), 192, 58, { align: 'right' });

        // METER TABLE
        const tableRows = cycle.meterDetails.map(m => [
            m.meterName,
            m.meterType,
            m.units,  // Raw number for alignment
            m.cost    // Raw number for alignment
        ]);

        // Total Row
        tableRows.push([
            { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'center' } },
            { content: cycle.totalUnits, styles: { fontStyle: 'bold' } },
            { content: cycle.totalCost, styles: { fontStyle: 'bold', textColor: [0, 128, 0] } }
        ]);

        autoTable(doc, {
            startY: 75,
            head: [["Meter Name", "Type", "Units", "Cost"]],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], halign: 'center' },
            // STRIPING & ALIGNMENT
            styles: { fontSize: 10, cellPadding: 4, valign: 'middle' },
            columnStyles: {
                0: { halign: 'left' },   // Name
                1: { halign: 'center' }, // Type
                2: { halign: 'right' },  // Units
                3: { halign: 'right', cellWidth: 30 }   // Cost
            },
            didParseCell: function (data) {
                // Format Currency/Units explicitly in the cell hook
                if (data.section === 'body' && (data.column.index === 3)) {
                    data.cell.text = formatCurrency(data.cell.raw);
                }
                if (data.section === 'body' && (data.column.index === 2)) {
                    data.cell.text = `${data.cell.raw}`; // Just text
                }
            },
            alternateRowStyles: { fillColor: [249, 250, 251] }
        });

        // FOOTER
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Track My Watts - Personal Energy Manager", 105, 290, { align: "center" });

        const fileName = generateFileName('Bill', cycle, 'pdf');
        doc.save(fileName);
        return true;

    } catch (error) {
        console.error("PDF Export Error:", error);
        throw error;
    }
};