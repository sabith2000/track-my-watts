// client/src/utils/exportHelper.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
};

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '-';
    return `₹${amount.toFixed(2)}`;
};

// --- EXCEL EXPORT LOGIC ---
export const exportToExcel = (cycle) => {
    const data = [
        { A: "ELECTRICITY BILL REPORT", B: "" },
        { A: "Generated On:", B: new Date().toLocaleString() },
        { A: "", B: "" }, // Spacer
        { A: "BILLING SUMMARY", B: "" },
        { A: "Start Date:", B: formatDate(cycle.startDate) },
        { A: "End Date:", B: formatDate(cycle.endDate) },
        { A: "Status:", B: cycle.status.toUpperCase() },
        { A: "Total Consumption:", B: `${cycle.totalUnits} units` },
        { A: "Total Cost:", B: formatCurrency(cycle.totalCost) },
        { A: "", B: "" }, // Spacer
        { A: "METER BREAKDOWN", B: "" },
        { A: "Meter Name", B: "Type", C: "Units Consumed", D: "Cost (INR)" } // Headers
    ];

    // Add Meter Rows
    if (cycle.meterDetails) {
        cycle.meterDetails.forEach(m => {
            data.push({
                A: m.meterName,
                B: m.meterType,
                C: m.units,
                D: m.cost
            });
        });
    }

    // Add Notes if any
    if (cycle.notes) {
        data.push({ A: "", B: "" });
        data.push({ A: "NOTES", B: cycle.notes });
    }

    // Create Sheet
    const ws = XLSX.utils.json_to_sheet(data, { skipHeader: true });
    
    // Column Widths
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Billing_Report");
    XLSX.writeFile(wb, `Bill_Report_${cycle.startDate.split('T')[0]}.xlsx`);
};

// --- PDF EXPORT LOGIC ---
export const exportToPDF = (cycle) => {
    const doc = new jsPDF();

    // 1. Header Section
    doc.setFillColor(79, 70, 229); // Indigo Brand Color
    doc.rect(0, 0, 210, 40, 'F'); // Top Bar
    
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("Electricity Bill Receipt", 14, 25);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 160, 25);

    // 2. Summary Box
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Billing Cycle Summary", 14, 55);
    
    doc.setDrawColor(200);
    doc.line(14, 58, 196, 58); // Underline

    doc.setFontSize(10);
    const startY = 65;
    doc.text(`Period:`, 14, startY);
    doc.setFont("helvetica", "bold");
    doc.text(`${formatDate(cycle.startDate)}  to  ${formatDate(cycle.endDate)}`, 40, startY);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Status:`, 14, startY + 8);
    doc.setFont("helvetica", "bold");
    doc.text(cycle.status.toUpperCase(), 40, startY + 8);

    // Total Cost Highlight
    doc.setFillColor(243, 244, 246); // Gray bg
    doc.roundedRect(120, 50, 76, 25, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Total Amount Due:", 125, 60);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(formatCurrency(cycle.totalCost), 125, 69);
    doc.setTextColor(0); // Reset color

    // 3. Meter Table
    const tableColumn = ["Meter Name", "Type", "Consumption (Units)", "Cost (INR)"];
    const tableRows = [];

    if (cycle.meterDetails) {
        cycle.meterDetails.forEach(m => {
            tableRows.push([
                m.meterName, 
                m.meterType, 
                m.units, 
                formatCurrency(m.cost)
            ]);
        });
    }

    // Add Total Row to table
    tableRows.push([
        { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: cycle.totalUnits, styles: { fontStyle: 'bold' } },
        { content: formatCurrency(cycle.totalCost), styles: { fontStyle: 'bold', textColor: [0, 128, 0] } }
    ]);

    autoTable(doc, {
        startY: 90,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 },
    });

    // 4. Notes Section
    if (cycle.notes) {
        const finalY = (doc).lastAutoTable.finalY + 15;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Notes / Remarks:", 14, finalY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        
        // Wrap text logic
        const splitNotes = doc.splitTextToSize(cycle.notes, 180);
        doc.text(splitNotes, 14, finalY + 6);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Track My Watts - Personal Energy Manager", 105, 290, { align: "center" });

    doc.save(`Bill_${cycle.startDate.split('T')[0]}.pdf`);
};