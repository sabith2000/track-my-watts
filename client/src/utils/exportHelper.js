// client/src/utils/exportHelper.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import apiClient from '../services/api';

// --- HELPER: FORMATTING ---
const formatDate = (dateString) => {
    if (!dateString) return 'Present'; 
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
};

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
    return Number(amount).toFixed(2);
};

// --- HELPER: FILE NAMING ---
const generateFileName = (prefix, cycle, extension) => {
    const start = new Date(cycle.startDate).toISOString().split('T')[0];
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, ''); 
    return `TrackMyWatts_${prefix}_${start}_${timeStr}.${extension}`;
};

// --- EXCEL STYLING ---
const applyHeaderStyle = (row) => {
    row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
};

const applyDataBorderStyle = (row) => {
    row.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
};

// --- MAIN EXCEL FUNCTION ---
export const exportToExcel = async (cycleId) => {
    try {
        const response = await apiClient.get(`/billing-cycles/${cycleId}/export-data`);
        const { cycle, readings, analytics } = response.data;

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Track My Watts';
        workbook.created = new Date();

        // 1. SUMMARY SHEET
        const wsSummary = workbook.addWorksheet('Summary', { properties: { tabColor: { argb: 'FF4F46E5' } } });
        
        wsSummary.mergeCells('A1:D1');
        const titleCell = wsSummary.getCell('A1');
        titleCell.value = 'ELECTRICITY BILLING REPORT';
        titleCell.font = { size: 16, bold: true, color: { argb: 'FF4F46E5' } };
        titleCell.alignment = { horizontal: 'center' };

        wsSummary.getCell('A2').value = `Generated: ${new Date().toLocaleString()}`;
        wsSummary.getCell('A3').value = `Period: ${formatDate(cycle.startDate)} - ${formatDate(cycle.endDate)}`;
        wsSummary.getCell('A4').value = `Status: ${cycle.status.toUpperCase()}`;

        // Header
        const summaryHeaderRow = wsSummary.getRow(6);
        summaryHeaderRow.values = ['Meter Name', 'Type', 'Consumption (Units)', 'Cost (Rs.)'];
        applyHeaderStyle(summaryHeaderRow);

        // Data Rows
        if (cycle.meterDetails) {
            cycle.meterDetails.forEach(m => {
                const row = wsSummary.addRow([m.meterName, m.meterType, m.units, m.cost]);
                applyDataBorderStyle(row);
                // Alignment
                row.getCell(3).alignment = { horizontal: 'right' };
                row.getCell(4).alignment = { horizontal: 'right' };
                // Format
                row.getCell(3).numFmt = '#,##0.00'; 
                row.getCell(4).numFmt = '#,##0.00'; 
            });
        }

        // Total Row
        const totalRow = wsSummary.addRow(['TOTAL', '', cycle.totalUnits, cycle.totalCost]);
        totalRow.font = { bold: true };
        totalRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        applyDataBorderStyle(totalRow);
        
        // Fix Total Alignment & Format
        totalRow.getCell(3).alignment = { horizontal: 'right' };
        totalRow.getCell(4).alignment = { horizontal: 'right' };
        totalRow.getCell(3).numFmt = '#,##0.00';
        totalRow.getCell(4).numFmt = '"Rs. "#,##0.00';

        // Analytics
        wsSummary.addRow([]);
        wsSummary.addRow(['ANALYTICS SNAPSHOT']).font = { bold: true, color: { argb: 'FF4F46E5' } };
        wsSummary.addRow(['Avg Daily Use', `${analytics.averageDailyConsumption} units/day`]);
        wsSummary.addRow(['Peak Usage', `${analytics.peakUsageAmount} units (${formatDate(analytics.peakUsageDay)})`]);

        wsSummary.columns = [{ width: 25 }, { width: 20 }, { width: 22 }, { width: 20 }];

        // 2. READINGS SHEET
        const wsReadings = workbook.addWorksheet('Raw Readings');
        const readingsHeader = wsReadings.getRow(1);
        readingsHeader.values = ['Date', 'Meter Name', 'Type', 'Reading Value', 'Consumed (Units)'];
        applyHeaderStyle(readingsHeader);

        readings.forEach(r => {
            const row = wsReadings.addRow([
                new Date(r.date),
                r.meterName,
                r.meterType,
                r.readingValue, // Using the fixed value from backend
                r.unitsConsumed
            ]);
            applyDataBorderStyle(row);
            row.getCell(1).numFmt = 'dd-mmm-yyyy';
            row.getCell(4).alignment = { horizontal: 'right' };
            row.getCell(5).alignment = { horizontal: 'right' };
        });

        wsReadings.columns = [{ width: 15 }, { width: 25 }, { width: 20 }, { width: 18 }, { width: 18 }];

        // 3. ANALYTICS SHEET
        const wsAnalytics = workbook.addWorksheet('Analytics');
        const analyticsHeader = wsAnalytics.getRow(1);
        analyticsHeader.values = ['Metric', 'Value'];
        applyHeaderStyle(analyticsHeader);

        const analyticsRows = [
            ['Days in Cycle', analytics.daysInCycle],
            ['Total Readings', analytics.totalReadingsCount],
            ['Avg Daily Consumption', `${analytics.averageDailyConsumption} units`],
            ['Peak Usage Amount', `${analytics.peakUsageAmount} units`],
            ['Peak Usage Date', new Date(analytics.peakUsageDay)]
        ];

        analyticsRows.forEach(r => {
            const row = wsAnalytics.addRow(r);
            applyDataBorderStyle(row);
            if(r[0] === 'Peak Usage Date') row.getCell(2).numFmt = 'dd-mmm-yyyy';
        });
        wsAnalytics.columns = [{ width: 30 }, { width: 35 }];

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = generateFileName('Report', cycle, 'xlsx');
        saveAs(new Blob([buffer]), fileName);
        return true;

    } catch (error) {
        console.error("Excel Export Error:", error);
        throw error;
    }
};

// --- MAIN PDF FUNCTION ---
export const exportToPDF = async (cycleId) => {
    try {
        const response = await apiClient.get(`/billing-cycles/${cycleId}/export-data`);
        const { cycle } = response.data;

        const doc = new jsPDF();

        // 1. Header
        doc.setFillColor(79, 70, 229); 
        doc.rect(0, 0, 210, 35, 'F');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text("Electricity Statement", 14, 22);
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 196, 22, { align: 'right' });

        // 2. Summary
        const startY = 50;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text("Billing Period:", 14, startY);
        doc.setFont("helvetica", "bold");
        doc.text(`${formatDate(cycle.startDate)}  -  ${formatDate(cycle.endDate)}`, 45, startY);
        doc.setFont("helvetica", "normal");
        doc.text("Status:", 14, startY + 6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(cycle.status === 'active' ? '008000' : '505050');
        doc.text(cycle.status.toUpperCase(), 45, startY + 6);

        // Amount Box
        doc.setFillColor(243, 244, 246);
        doc.roundedRect(130, 42, 66, 22, 2, 2, 'F');
        doc.setTextColor(0,0,0);
        doc.setFont("helvetica", "normal");
        doc.text("Amount Due:", 135, 49);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text(`Rs. ${formatCurrency(cycle.totalCost)}`, 192, 58, { align: 'right' });

        // 3. Table Data
        const tableBody = cycle.meterDetails.map(m => [
            m.meterName,
            m.meterType,
            m.units,
            m.cost
        ]);

        const tableFoot = [
            ['TOTAL', '', cycle.totalUnits, cycle.totalCost]
        ];

        autoTable(doc, {
            startY: 75,
            head: [["Meter Name", "Type", "Units Consumed", "Cost (Rs.)"]],
            body: tableBody,
            foot: tableFoot,
            theme: 'grid',
            
            // STYLING
            headStyles: { fillColor: [79, 70, 229], halign: 'center' },
            // FOOTER STYLE: explicit borders
            footStyles: { 
                fillColor: [243, 244, 246], 
                textColor: [0, 0, 0], 
                fontStyle: 'bold',
                lineWidth: 0.1,        // Draw borders
                lineColor: [200, 200, 200] // Light gray border
            },
            styles: { fontSize: 10, cellPadding: 4, valign: 'middle' },
            
            columnStyles: {
                0: { halign: 'left' },   
                1: { halign: 'center' }, 
                2: { halign: 'right' },  
                3: { halign: 'right', cellWidth: 35 } 
            },
            
            didParseCell: function (data) {
                // FORMATTING
                if (data.section === 'body' || data.section === 'foot') {
                    if (data.column.index === 3) data.cell.text = formatCurrency(data.cell.raw);
                    if (data.column.index === 2) data.cell.text = Number(data.cell.raw).toFixed(2);
                    
                    // Footer Merger
                    if (data.section === 'foot' && data.column.index === 0) {
                        data.cell.styles.halign = 'center';
                        data.cell.colSpan = 2;
                    }
                }
            },
            alternateRowStyles: { fillColor: [249, 250, 251] }
        });

        // 4. Footer
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