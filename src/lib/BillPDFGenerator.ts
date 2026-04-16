import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { toast } from "react-hot-toast";
import { Bill } from "../types";
import { formatCurrency, formatDate } from "./utils";

export const generateBillPDF = async (bill: Bill, action: "save" | "print" = "save") => {
  const loadingToast = toast.loading(action === "print" ? "Preparing print..." : "Generating PDF...");
  
  try {
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
    const mrp = item.mrp || 0;
    const discount = mrp > 0 ? ((mrp - item.price) / mrp) * 100 : 0;
    return [
      (index + 1).toString(),
      item.productName,
      mrp.toFixed(2),
      discount.toFixed(1) + "%",
      item.price.toFixed(2),
      item.qty.toString(),
      item.total.toFixed(2),
    ];
  });

  const totalQty = bill.items.reduce((sum, item) => sum + item.qty, 0);

  autoTable(doc, {
    startY: 45,
    head: [["Sl. No.", "Particulars", "MRP", "Percentage", "Rate", "Qty", "Net Amount"]],
    body: tableData,
    foot: [[
      { content: "Total", colSpan: 5, styles: { halign: 'right' } },
      { content: totalQty.toString(), styles: { halign: 'center' } },
      { content: bill.subtotal.toFixed(2), styles: { halign: 'center' } }
    ]],
    showFoot: "lastPage",
    theme: "grid", // Changed to grid for better structure
    styles: {
      font: "times",
      fontSize: 8,
      cellPadding: 0.3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      halign: "center",
    },
    headStyles: {
      fontStyle: "bold",
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      halign: "center",
      valign: "middle",
    },
    footStyles: {
      fontStyle: "bold",
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 10 }, // Sl. No.
      1: { cellWidth: 35 }, // Particulars
      2: { cellWidth: 16 }, // MRP
      3: { cellWidth: 18 }, // Percentage
      4: { cellWidth: 17 }, // Rate
      5: { cellWidth: 10 }, // Qty
      6: { cellWidth: 22 }, // Net Amount
    },
    margin: { left: margin, right: margin, bottom: 5 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i < pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`${i}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 2, { align: "center" });
  }
  doc.setPage(pageCount);

  let finalY = (doc as any).lastAutoTable.finalY + 3;
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerHeight = 40; // Reduced estimated height for Payment Section + Totals + Footer

  // Check if we need a new page for the summary and footer to avoid overlapping
  // Only push to new page if it physically won't fit
  if (finalY + footerHeight > pageHeight) {
    doc.addPage();
    finalY = 10; // Start near top of new page
  }

  // PAYMENT SECTION
  doc.setFontSize(baseFontSize * 0.8);
  doc.setFont("times", "bold");
  doc.text("Payment Details:", margin, finalY);
  
  doc.setFontSize(baseFontSize * 0.7);
  doc.setFont("times", "normal");
  doc.text("UPI ID: chayanika822@iob", margin, finalY + 3);

  // QR CODE
  const qrSize = 18;
  try {
    const qrDataUrl = await QRCode.toDataURL("upi://pay?pa=chayanika822@iob&pn=CHAYANIKA&cu=INR");
    doc.addImage(qrDataUrl, "PNG", margin, finalY + 5, qrSize, qrSize);
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    doc.rect(margin, finalY + 5, qrSize, qrSize);
    doc.text("QR", margin + qrSize / 2, finalY + 5 + qrSize / 2, { align: "center" });
    doc.text("CODE", margin + qrSize / 2, finalY + 5 + qrSize / 2 + 3, { align: "center" });
  }
  doc.text("SCAN & PAY", margin + qrSize / 2, finalY + qrSize + 8, { align: "center" });

  // RIGHT: TOTALS
  doc.setFontSize(baseFontSize * 0.8);
  doc.setFont("times", "normal");
  const rightAlignX = pageWidth - margin;
  const previousDue = bill.grandTotal - bill.subtotal;
  doc.text(`Sub Total:  ${bill.subtotal.toFixed(2)}`, rightAlignX, finalY + 3, { align: "right" });
  doc.text(`Previous Due:  ${previousDue.toFixed(2)}`, rightAlignX, finalY + 7, { align: "right" });
  doc.text(`Paid Amount:  ${bill.paidAmount.toFixed(2)}`, rightAlignX, finalY + 11, { align: "right" });
  doc.text(`Balance Due:  ${bill.dueAmount.toFixed(2)}`, rightAlignX, finalY + 15, { align: "right" });

  // FOOTER
  const footerY = doc.internal.pageSize.getHeight() - 12;
  
  // LEFT: Owner Signature
  // Placeholder base64 for the signature image. Replace this with the actual base64 string of the signature.
  const signatureBase64 = "data:image/jpeg;base64,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"; 
  try {
    doc.addImage(signatureBase64, "JPEG", margin, footerY - 12, 25, 10);
  } catch (e) {
    console.error("Failed to add signature image", e);
  }
  
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
  const filename = `CHAYANIKA_BILL_${bill.billNo}_${bill.customerName.replace(/\s+/g, "_")}.pdf`;
  
  // More robust mobile/touch detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   (window.innerWidth <= 800) ||
                   (navigator.maxTouchPoints > 0);

  // Prepare file for sharing
  const pdfBlob = doc.output("blob");
  const file = new File([pdfBlob], filename, { type: "application/pdf" });

  // Fallback for environments where navigator.share is missing or fails (like some Applix versions)
  if (action === "print") {
    doc.autoPrint();
    if (isMobile) {
      try {
        doc.save(filename);
        toast.dismiss(loadingToast);
        toast.success("Bill saved to downloads. You can print it from there.");
      } catch (e) {
        toast.dismiss(loadingToast);
        toast.error("Failed to save bill");
      }
    } else {
      try {
        const pdfBlobUrl = doc.output("bloburl");
        const printWindow = window.open(pdfBlobUrl, "_blank");
        toast.dismiss(loadingToast);
        if (!printWindow) {
          doc.save(filename);
          toast.success("Bill saved (popup was blocked)");
        }
      } catch (e) {
        doc.save(filename);
        toast.dismiss(loadingToast);
      }
    }
  } else {
    try {
      doc.save(filename);
      toast.dismiss(loadingToast);
      toast.success("PDF saved to your device downloads");
    } catch (e) {
      console.error("Save failed", e);
      try {
        const dataUri = doc.output('datauristring');
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = filename;
        link.target = '_self';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.dismiss(loadingToast);
        toast.success("Saved via alternative method");
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error("Could not save PDF");
      }
    }
  }
} catch (err) {
  toast.dismiss(loadingToast);
  toast.error("Error generating bill");
  console.error(err);
}
};
