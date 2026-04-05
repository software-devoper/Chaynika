import React, { useState, useEffect } from "react";
import { Search, FileText, Trash2, X, Download, Printer, User, Phone, MapPin, Mail, Calendar, Hash } from "lucide-react";
import { toast } from "react-hot-toast";
import { Bill } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";
import { generateBillPDF } from "../lib/BillPDFGenerator";
import { billApi } from "../lib/api";
import { auth } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";

export default function BillHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  useEffect(() => {
    const unsubscribe = billApi.getAll((data) => {
      console.log("Bills received from API:", data);
      setBills(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredBills = bills.filter(
    (b) =>
      b.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customerPhone.includes(searchTerm) ||
      b.additionalPhones?.some(p => p.includes(searchTerm))
  );

  const handleViewDetails = (bill: Bill) => {
    setSelectedBill(bill);
  };

  const handleDownloadPDF = async (bill: Bill) => {
    await generateBillPDF(bill, "save");
  };

  const handlePrintPDF = async (bill: Bill) => {
    await generateBillPDF(bill, "print");
  };

  const handleDelete = async (bill: Bill) => {
    console.log(`Attempting to delete bill object:`, JSON.stringify(bill));
    const id = bill.id;
    if (!id) {
      toast.error("Invalid bill ID");
      console.error("Bill object missing ID:", JSON.stringify(bill));
      return;
    }
    if (!auth.currentUser) {
      toast.error("You must be logged in to delete a bill");
      return;
    }
    if (window.confirm("Are you sure you want to delete this bill?")) {
      try {
        await billApi.delete(id);
        toast.success("Bill deleted successfully");
      } catch (err) {
        console.error(`Failed to delete bill with ID: ${id}`, err);
        toast.error("Failed to delete bill");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          type="text"
          placeholder="Search by Customer Name, Bill No., or Phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-primary border border-accent/10 rounded-xl pl-12 pr-4 py-3 text-text focus:border-accent outline-none transition-all"
        />
      </div>

      <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
        <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
          <thead>
            <tr className="border-b border-accent/10 text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-4 font-medium">Bill No.</th>
              <th className="px-4 py-4 font-medium">Customer Name</th>
              <th className="px-4 py-4 font-medium">Phone</th>
              <th className="px-4 py-4 font-medium">Date</th>
              <th className="px-4 py-4 font-medium text-right">Grand Total</th>
              <th className="px-4 py-4 font-medium text-right">Due</th>
              <th className="px-4 py-4 font-medium text-center">Status</th>
              <th className="px-4 py-4 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredBills.map((bill, index) => (
              <tr key={`${bill.id}-${index}`} className="border-b border-accent/5 hover:bg-primary/50 transition-colors">
                <td className="px-4 py-4 font-bold text-accent">{bill.billNo}</td>
                <td className="px-4 py-4 font-medium">{bill.customerName}</td>
                <td className="px-4 py-4 text-muted">
                  {bill.customerPhone}
                  {bill.additionalPhones && bill.additionalPhones.length > 0 && (
                    <div className="text-[10px] opacity-70">
                      {bill.additionalPhones.join(", ")}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 text-muted">{formatDate(bill.date)}</td>
                <td className="px-4 py-4 text-right font-bold">{formatCurrency(bill.grandTotal)}</td>
                <td className="px-4 py-4 text-right text-red-500">{formatCurrency(bill.dueAmount)}</td>
                <td className="px-4 py-4 text-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      bill.dueAmount === 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {bill.dueAmount === 0 ? "Paid" : "Due"}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => handleViewDetails(bill)}
                      className="text-muted hover:text-accent"
                      title="View Details"
                    >
                      <FileText size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(bill)}
                      className="text-muted hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredBills.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted italic">
                  No bills found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bill Details Modal */}
      <AnimatePresence>
        {selectedBill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-primary/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedBill(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface border border-accent/20 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-accent/10 flex items-center justify-between bg-primary/30">
                <div>
                  <h3 className="text-xl font-bold text-accent flex items-center gap-2">
                    <Hash size={20} /> Bill No: {selectedBill.billNo}
                  </h3>
                  <p className="text-muted text-sm flex items-center gap-1 mt-1">
                    <Calendar size={14} /> {formatDate(selectedBill.date)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBill(null)}
                  className="p-2 hover:bg-accent/10 rounded-full text-muted hover:text-accent transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-8">
                {/* Customer Info Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-primary/20 p-5 rounded-xl border border-accent/5">
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider text-muted font-bold mb-2">Customer Details</h4>
                    <div className="flex items-center gap-3 text-text">
                      <User size={18} className="text-accent" />
                      <span className="font-medium">{selectedBill.customerName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-text">
                      <Phone size={18} className="text-accent" />
                      <span>{selectedBill.customerPhone}</span>
                    </div>
                    {selectedBill.additionalPhones && selectedBill.additionalPhones.length > 0 && (
                      <div className="flex items-center gap-3 text-muted text-xs pl-7">
                        <span>Others: {selectedBill.additionalPhones.join(", ")}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider text-muted font-bold mb-2 invisible md:visible">Address & Contact</h4>
                    <div className="flex items-start gap-3 text-text">
                      <MapPin size={18} className="text-accent mt-0.5" />
                      <span className="text-sm leading-relaxed">{selectedBill.customerAddress || "No address provided"}</span>
                    </div>
                    {selectedBill.customerEmail && (
                      <div className="flex items-center gap-3 text-text">
                        <Mail size={18} className="text-accent" />
                        <span className="text-sm">{selectedBill.customerEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-wider text-muted font-bold">Bill Items</h4>
                  <div className="border border-accent/10 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-primary/50 text-muted uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-4 py-3 font-medium">Product</th>
                          <th className="px-4 py-3 font-medium text-center">Qty</th>
                          <th className="px-4 py-3 font-medium text-right">Rate</th>
                          <th className="px-4 py-3 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-accent/5">
                        {selectedBill.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-primary/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-text">{item.productName}</td>
                            <td className="px-4 py-3 text-center font-bold text-accent">{item.qty}</td>
                            <td className="px-4 py-3 text-right text-muted">{formatCurrency(item.price)}</td>
                            <td className="px-4 py-3 text-right font-bold text-text">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="flex flex-col md:flex-row justify-between gap-6 pt-4 border-t border-accent/10">
                  <div className="flex-1 bg-accent/5 p-4 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-muted text-xs uppercase tracking-widest mb-1">Grand Total</p>
                      <p className="text-3xl font-black text-accent">{formatCurrency(selectedBill.grandTotal)}</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(selectedBill.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Previous Due:</span>
                      <span className="font-medium text-red-500">{formatCurrency(selectedBill.grandTotal - selectedBill.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-accent/5">
                      <span className="text-muted">Paid Amount:</span>
                      <span className="font-bold text-green-500">{formatCurrency(selectedBill.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-1">
                      <span className="text-text">Balance Due:</span>
                      <span className="text-red-500">{formatCurrency(selectedBill.dueAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer - Actions */}
              <div className="p-6 border-t border-accent/10 bg-primary/30 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handlePrintPDF(selectedBill)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary border border-accent/20 text-text font-bold py-3 rounded-xl hover:bg-accent/10 transition-all"
                >
                  <Printer size={18} /> Print Bill
                </button>
                <button
                  onClick={() => handleDownloadPDF(selectedBill)}
                  className="flex-1 flex items-center justify-center gap-2 bg-accent text-primary font-bold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                >
                  <Download size={18} /> Download PDF
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
