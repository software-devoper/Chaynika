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
  doc.text("M/s CHAYANIKA", margin, 15);
  
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

  // Bill No and Date
  doc.setFontSize(baseFontSize);
  doc.setFont("times", "bold");
  doc.text(`Bill No: ${bill.billNo}`, margin, 40);
  doc.text(`Date: ${formatDate(bill.date)}`, pageWidth - margin, 40, { align: "right" });

  // Divider Line
  doc.setDrawColor(200);
  doc.line(margin, 42, pageWidth - margin, 42);

  // TABLE
  const tableData = bill.items.map((item, index) => {
    const mrp = item.mrp || 0;
    const discount = mrp > 0 ? ((mrp - item.price) / mrp) * 100 : 0;
    const printedUnit = item.selectedUnitType === "secondary" && item.secondaryUnit ? item.secondaryUnit : (item.unit || "Pcs");
    return [
      (index + 1).toString(),
      item.productName,
      mrp.toFixed(2),
      `${item.qty} ${printedUnit}`,
      item.price.toFixed(2),
      discount.toFixed(1) + "%",
      item.total.toFixed(2),
    ];
  });

  const totalQty = bill.items.reduce((sum, item) => sum + item.qty, 0);

  autoTable(doc, {
    startY: 45,
    head: [["Sl No.", "Particulars", "MRP", "Qty", "Rate", "Percentage", "Net Amount"]],
    body: tableData,
    foot: [[
      { content: "Total", colSpan: 3, styles: { halign: 'right' } },
      { content: totalQty.toString(), styles: { halign: 'center' } },
      { content: "", colSpan: 2 },
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
      0: { cellWidth: 10 }, // Sl No.
      1: { cellWidth: 35 }, // Particulars
      2: { cellWidth: 16 }, // MRP
      3: { cellWidth: 16 }, // Qty
      4: { cellWidth: 17 }, // Rate
      5: { cellWidth: 14 }, // Percentage
      6: { cellWidth: 20 }, // Net Amount
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
  const rightAlignX = pageWidth - margin;
  const prevDue = bill.previousDue || 0;
  
  doc.setFontSize(baseFontSize * 1.1);
  doc.setFont("times", "normal");
  doc.text(`Previous Due:  ${prevDue.toFixed(2)}`, rightAlignX, finalY + 3, { align: "right" });
  doc.text(`Paid Amount:  ${bill.paidAmount.toFixed(2)}`, rightAlignX, finalY + 8, { align: "right" });
  
  doc.setFontSize(baseFontSize * 1.2);
  doc.setFont("times", "bold");
  doc.text(`Bill Amount:  ${bill.subtotal.toFixed(2)}`, rightAlignX, finalY + 13, { align: "right" });
  
  doc.setFontSize(baseFontSize * 1.2);
  doc.text(`Balance Due:  ${bill.dueAmount.toFixed(2)}`, rightAlignX, finalY + 18, { align: "right" });

  // FOOTER
  const footerY = doc.internal.pageSize.getHeight() - 12;
  
  // LEFT: Receiver Signature
  doc.setFontSize(baseFontSize * 0.8);
  doc.setFont("times", "normal");
  doc.text(" Receiver", margin, footerY);
  doc.text("(Customer Signature)", margin, footerY + 4);
  doc.line(margin, footerY + 8, margin + 30, footerY + 8);
  doc.text(`Date:`, margin, footerY + 12);

  // CENTER: TOTAL AMOUNT (3x larger)
  doc.setFontSize(baseFontSize * 2.5);
  doc.setFont("times", "bold");
  doc.text(`${bill.grandTotal.toFixed(2)}`, pageWidth / 2, footerY + 5, { align: "center" });
  doc.setFontSize(baseFontSize * 0.8);
  doc.text("TOTAL AMOUNT", pageWidth / 2, footerY - 5, { align: "center" });

  // RIGHT: Owner Signature
  doc.setFontSize(baseFontSize * 0.8);
  doc.setFont("times", "normal");
  doc.text("Owner Signature", pageWidth - margin, footerY, { align: "right" });
  doc.line(pageWidth - margin - 30, footerY + 5, pageWidth - margin, footerY + 5);

  // Save or Print PDF
  const safeCustomerName = bill.customerName ? bill.customerName.replace(/[^a-z0-9]/gi, "_") : "Unknown";
  const filename = `CHAYANIKA_BILL_${bill.billNo || "Draft"}_${safeCustomerName}.pdf`;
  
  // More robust mobile detection (avoiding touch points check for desktop touch laptops)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   (window.innerWidth <= 768);

  if (action === "print") {
    try {
      doc.autoPrint();
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      const printWindow = window.open(pdfUrl, "_blank");
      toast.dismiss(loadingToast);
      
      if (!printWindow) {
        // Fallback for pop-up blockers - try an iframe
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = pdfUrl;
        document.body.appendChild(iframe);
        
        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow?.print();
            // We don't remove the iframe immediately to allow print dialog to handle it
          }, 500);
        };
        toast.success("Opening print dialog...");
      } else {
        toast.success("Print dialog opened");
      }
    } catch (e) {
      console.error("Print failed", e);
      // Final fallback to save only if print attempt totally fails
      doc.save(filename);
      toast.dismiss(loadingToast);
      toast.success("Print failed, bill saved to downloads");
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
