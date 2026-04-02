import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Bill } from "../types";
import { formatCurrency, formatDate } from "./utils";

// Placeholder QR Code Base64 (A simple black square for now)
const QR_CODE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5QYIDhYmXvX5AAAAKklEQVR42u3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4MvQAAAbK781AAAAAASUVORK5CYII=";

export const generateBillPDF = (bill: Bill) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const baseFontSize = 10;

  // Set Font - Times New Roman is built-in
  doc.setFont("times", "normal");

  // HEADER - LEFT COLUMN
  doc.setFontSize(baseFontSize * 1.05);
  doc.setFont("times", "bold");
  doc.text("M/s CHAYANIKA (KALINDI)", margin, 15);
  
  doc.setFontSize(baseFontSize * 0.9);
  doc.setFont("times", "normal");
  doc.text("Kalindi, Purba Medinipur", margin, 20);
  doc.text("Mobile: 9832116317", margin, 24);
  doc.text("Email: chayanikakalindi@gmail.com", margin, 28);

  // HEADER - RIGHT COLUMN
  doc.setFontSize(baseFontSize * 0.9);
  doc.text("CREDIT", pageWidth - margin, 15, { align: "right" });
  
  doc.setFontSize(baseFontSize * 1.05);
  doc.setFont("times", "bold");
  doc.text(bill.customerName, pageWidth - margin, 20, { align: "right" });
  
  doc.setFontSize(baseFontSize * 0.9);
  doc.setFont("times", "normal");
  doc.text(bill.customerAddress || "N/A", pageWidth - margin, 24, { align: "right" });
  
  const phoneText = bill.additionalPhones && bill.additionalPhones.length > 0
    ? `Ph: ${bill.customerPhone}, ${bill.additionalPhones.join(", ")}`
    : `Ph: ${bill.customerPhone}`;
  
  doc.text(phoneText, pageWidth - margin, 28, { align: "right" });

  if (bill.customerEmail) {
    doc.text(bill.customerEmail, pageWidth - margin, 32, { align: "right" });
  }

  // Bill No
  doc.setFontSize(baseFontSize);
  doc.setFont("times", "bold");
  doc.text(`Bill No: ${bill.billNo}`, margin, 40);

  // Divider Line
  doc.setDrawColor(200);
  doc.line(margin, 42, pageWidth - margin, 42);

  // TABLE
  const tableData = bill.items.map((item, index) => {
    return [
      index + 1,
      item.productName,
      item.price.toFixed(2),
      item.qty,
      item.total.toFixed(2),
    ];
  });

  const totalQty = bill.items.reduce((sum, item) => sum + item.qty, 0);

  autoTable(doc, {
    startY: 45,
    head: [["Sl. No.", "Product", "Rate", "Qty", "Net Amount"]],
    body: tableData,
    foot: [[`Total Qty: ${totalQty}`, "", "", "", bill.subtotal.toFixed(2)]],
    theme: "plain",
    styles: {
      font: "times",
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fontStyle: "bold",
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
    },
    footStyles: {
      fontStyle: "bold",
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 12 },
      2: { halign: "right" },
      3: { halign: "center" },
      4: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // PAYMENT SECTION
  // LEFT: UPI ID
  doc.setFontSize(baseFontSize * 0.8);
  doc.setFont("times", "normal");
  doc.text("UPI ID: chayanika822@iob", margin, finalY + 15);

  // CENTER: QR CODE
  const qrSize = 30;
  const qrX = (pageWidth / 2) - (qrSize / 2);
  doc.setFont("times", "bold");
  doc.text("CHAYANIKA", pageWidth / 2, finalY + 5, { align: "center" });
  doc.addImage(QR_CODE_BASE64, "PNG", qrX, finalY + 7, qrSize, qrSize);
  doc.setFontSize(baseFontSize * 0.7);
  doc.text("SCAN & PAY", pageWidth / 2, finalY + qrSize + 11, { align: "center" });

  // RIGHT: TOTALS
  doc.setFontSize(baseFontSize * 0.9);
  doc.setFont("times", "normal");
  const rightAlignX = pageWidth - margin;
  const previousDue = bill.grandTotal - bill.subtotal;
  doc.text(`Subtotal:  ${bill.subtotal.toFixed(2)}`, rightAlignX, finalY + 5, { align: "right" });
  doc.text(`Previous Due:  ${previousDue.toFixed(2)}`, rightAlignX, finalY + 10, { align: "right" });
  doc.text(`Paid Amount:  ${bill.paidAmount.toFixed(2)}`, rightAlignX, finalY + 15, { align: "right" });
  doc.text(`Balance Due:  ${bill.dueAmount.toFixed(2)}`, rightAlignX, finalY + 20, { align: "right" });

  // FOOTER
  const footerY = doc.internal.pageSize.getHeight() - 25;
  
  // LEFT: Owner Signature
  doc.setFontSize(baseFontSize * 0.8);
  doc.text("Owner Signature", margin, footerY);
  doc.line(margin, footerY + 5, margin + 30, footerY + 5);
  doc.text(`Date: ${formatDate(bill.date)}`, margin, footerY + 10);

  // CENTER: TOTAL AMOUNT (3x larger)
  doc.setFontSize(baseFontSize * 2.5);
  doc.setFont("times", "bold");
  doc.text(`${bill.grandTotal.toFixed(2)}`, pageWidth / 2, footerY + 5, { align: "center" });
  doc.setFontSize(baseFontSize * 0.8);
  doc.text("TOTAL AMOUNT", pageWidth / 2, footerY - 5, { align: "center" });

  // RIGHT: Customer Signature
  doc.setFontSize(baseFontSize * 0.8);
  doc.setFont("times", "normal");
  doc.text("Receiver", pageWidth - margin, footerY, { align: "right" });
  doc.text("(Customer Signature)", pageWidth - margin, footerY + 4, { align: "right" });
  doc.line(pageWidth - margin - 30, footerY + 8, pageWidth - margin, footerY + 8);

  // Save PDF
  const filename = `bill_${bill.billNo}_${bill.customerName.replace(/\s+/g, "_")}_${new Date(bill.date).toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
};
