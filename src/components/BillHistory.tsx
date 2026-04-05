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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedBill(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-accent/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-accent/10 flex justify-between items-center bg-primary/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                    <FileText className="text-accent" size={18} />
                  </div>
                  <h3 className="font-display font-bold text-lg text-accent">Digital Invoice #{selectedBill.billNo}</h3>
                </div>
                <button 
                  onClick={() => setSelectedBill(null)}
                  className="p-2 hover:bg-accent/10 rounded-full transition-colors text-muted hover:text-accent"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white text-gray-900">
                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b-2 border-gray-100 pb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">M/s CHAYANIKA (KALINDI)</h1>
                    <p className="text-sm text-gray-500">Kalindi, Purba Medinipur</p>
                    <p className="text-sm text-gray-500">Mobile: 9832116317</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">Invoice Date</div>
                    <div className="font-bold">{formatDate(selectedBill.date)}</div>
                    <div className="text-xs uppercase tracking-wider text-gray-400 font-bold mt-3 mb-1">Bill Number</div>
                    <div className="font-bold text-accent">#{selectedBill.billNo}</div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Bill To:</h4>
                    <div className="font-bold text-lg">{selectedBill.customerName}</div>
                    <div className="text-gray-600">{selectedBill.customerPhone}</div>
                    {selectedBill.customerAddress && <div className="text-gray-500 text-sm mt-1">{selectedBill.customerAddress}</div>}
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                        <th className="px-4 py-3 border-b border-gray-200">Item Description</th>
                        <th className="px-4 py-3 border-b border-gray-200 text-center">Qty</th>
                        <th className="px-4 py-3 border-b border-gray-200 text-right">Rate</th>
                        <th className="px-4 py-3 border-b border-gray-200 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedBill.items.map((item, idx) => (
                        <tr key={idx} className="text-sm">
                          <td className="px-4 py-3 font-medium">{item.productName}</td>
                          <td className="px-4 py-3 text-center">{item.qty}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                          <td className="px-4 py-3 text-right font-bold">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary */}
                <div className="flex justify-end">
                  <div className="w-full max-w-[240px] space-y-2">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Subtotal:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(selectedBill.subtotal)}</span>
                    </div>
                    {selectedBill.grandTotal - selectedBill.subtotal > 0 && (
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Previous Due:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(selectedBill.grandTotal - selectedBill.subtotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-accent pt-2 border-t-2 border-gray-100">
                      <span>Grand Total:</span>
                      <span>{formatCurrency(selectedBill.grandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                      <span>Amount Paid:</span>
                      <span>{formatCurrency(selectedBill.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-600 font-bold pt-1 border-t border-gray-100">
                      <span>Balance Due:</span>
                      <span>{formatCurrency(selectedBill.dueAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-accent/10 bg-primary/30 grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handlePrintPDF(selectedBill)}
                  className="flex items-center justify-center gap-2 bg-primary border border-accent/20 text-text py-3 rounded-xl hover:bg-accent/10 transition-all font-bold"
                >
                  <Printer size={18} />
                  Print Bill
                </button>
                <button 
                  onClick={() => handleDownloadPDF(selectedBill)}
                  className="flex items-center justify-center gap-2 bg-accent text-primary py-3 rounded-xl hover:opacity-90 transition-all font-bold shadow-lg shadow-accent/20"
                >
                  <Download size={18} />
                  Share / Save PDF
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
