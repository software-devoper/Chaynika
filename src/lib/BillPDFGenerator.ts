import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { Bill } from "../types";
import { formatCurrency, formatDate } from "./utils";

export const generateBillPDF = async (bill: Bill, action: "save" | "print" = "save") => {
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
    // Assuming product info is needed for MRP, but it's not in BillItem.
    // For now, I'll assume discount is 0 if not available.
    const discount = 0; // Placeholder
    return [
      (index + 1).toString(),
      item.productName,
      item.price.toFixed(2),
      discount.toFixed(2) + "%",
      item.qty.toString(),
      item.total.toFixed(2),
    ];
  });

  const totalQty = bill.items.reduce((sum, item) => sum + item.qty, 0);

  autoTable(doc, {
    startY: 45,
    head: [["Sl. No.", "Product", "Rate", "Disc(%)", "Qty", "Net Amount"]],
    body: tableData,
    foot: [[`Total Qty: ${totalQty}`, "", "", "", "", bill.subtotal.toFixed(2)]],
    theme: "grid", // Changed to grid for better structure
    styles: {
      font: "times",
      fontSize: 9,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fontStyle: "bold",
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      halign: "center",
      valign: "middle",
    },
    footStyles: {
      fontStyle: "bold",
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      halign: "right",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" }, // Sl. No.
      1: { cellWidth: 40, halign: "left" },   // Product
      2: { cellWidth: 20, halign: "right" },  // Rate
      3: { cellWidth: 18, halign: "center" }, // Disc(%)
      4: { cellWidth: 12, halign: "center" }, // Qty
      5: { cellWidth: 26, halign: "right" },  // Net Amount
    },
    margin: { left: margin, right: margin },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // PAYMENT SECTION
  doc.setFontSize(baseFontSize * 0.9);
  doc.setFont("times", "bold");
  doc.text("Payment Details:", margin, finalY);
  
  doc.setFontSize(baseFontSize * 0.8);
  doc.setFont("times", "normal");
  doc.text("UPI ID: chayanika822@iob", margin, finalY + 5);

  // QR CODE
  const qrSize = 25;
  try {
    const qrDataUrl = await QRCode.toDataURL("upi://pay?pa=chayanika822@iob&pn=CHAYANIKA&cu=INR");
    doc.addImage(qrDataUrl, "PNG", margin, finalY + 8, qrSize, qrSize);
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    doc.rect(margin, finalY + 8, qrSize, qrSize);
    doc.text("QR", margin + qrSize / 2, finalY + 8 + qrSize / 2, { align: "center" });
    doc.text("CODE", margin + qrSize / 2, finalY + 8 + qrSize / 2 + 3, { align: "center" });
  }
  doc.text("SCAN & PAY", margin + qrSize / 2, finalY + qrSize + 12, { align: "center" });

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

  // Save or Print PDF
  const filename = `bill_${bill.billNo}_${bill.customerName.replace(/\s+/g, "_")}_${new Date(bill.date).toISOString().split("T")[0]}.pdf`;
  
  if (action === "print") {
    doc.autoPrint();
    const pdfBlobUrl = doc.output("bloburl");
    window.open(pdfBlobUrl, "_blank");
  } else {
    doc.save(filename);
  }
};
