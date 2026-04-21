import React, { useState, useEffect } from "react";
import { Search, FileText, Trash2, X, User, Phone, MapPin, Mail, Calendar, Hash, Receipt, Printer } from "lucide-react";
import { toast } from "react-hot-toast";
import { Bill, CashSale, Product } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";
import { billApi, cashSaleApi, productApi } from "../lib/api";
import { auth } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { generateBillPDF } from "../lib/BillPDFGenerator";
import BillEditModal from "./BillEditModal";

export default function BillHistory() {
  const [activeTab, setActiveTab] = useState<"credit" | "cash">("credit");
  const [searchTerm, setSearchTerm] = useState("");
  const [bills, setBills] = useState<Bill[]>([]);
  const [cashSales, setCashSales] = useState<CashSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [selectedCashSale, setSelectedCashSale] = useState<CashSale | null>(null);

  useEffect(() => {
    const unsubscribeBills = billApi.getAll((data) => {
      setBills(data);
      setLoading(false);
    });
    const unsubscribeCash = cashSaleApi.getAll((data) => {
      setCashSales(data);
    });
    const unsubscribeProducts = productApi.getAll((data) => {
      setProducts(data);
    });
    return () => {
      unsubscribeBills();
      unsubscribeCash();
      unsubscribeProducts();
    };
  }, []);

  const filteredBills = bills.filter(
    (b) =>
      b.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customerPhone.includes(searchTerm) ||
      b.additionalPhones?.some(p => p.includes(searchTerm))
  );

  const filteredCashSales = cashSales.filter(
    (s) =>
      s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatDate(s.date).includes(searchTerm)
  );

  const handleDeleteBill = async (bill: Bill) => {
    const id = bill.id;
    if (!id) return;
    if (window.confirm("Are you sure you want to delete this bill?")) {
      try {
        await billApi.delete(id);
        toast.success("Bill deleted successfully");
      } catch (err) {
        toast.error("Failed to delete bill");
      }
    }
  };

  const handleDeleteCashSale = async (sale: CashSale) => {
    const id = sale.id;
    if (!id) return;
    if (window.confirm("Are you sure you want to delete this cash sale record?")) {
      try {
        await cashSaleApi.delete(id);
        toast.success("Cash sale deleted successfully");
      } catch (err) {
        toast.error("Failed to delete cash sale");
      }
    }
  };

  const handlePrintBill = async (bill: Bill) => {
    try {
      await generateBillPDF(bill, "print");
    } catch (error) {
      console.error("Failed to print bill:", error);
      toast.error("Failed to print bill");
    }
  };

  const calculateBillProfit = (bill: Bill) => {
    const totalCost = bill.items.reduce((sum, item) => {
      // Prioritize saved purchaseRate for historical accuracy, fallback to current stock rate
      let purchaseRate = item.purchaseRate;
      if (typeof purchaseRate === 'undefined') {
        const product = products.find(p => p.id === item.productId);
        purchaseRate = product ? product.purchaseRate : 0;
      }
      return sum + (item.qty * purchaseRate);
    }, 0);
    // Use grandTotal to account for Round Off and Discounts instead of raw subtotal
    return bill.grandTotal - totalCost;
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex bg-primary/30 p-1 rounded-xl border border-accent/10 w-fit">
        <button
          onClick={() => setActiveTab("credit")}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === "credit" ? "bg-accent text-primary shadow-lg" : "text-muted hover:text-text"
          }`}
        >
          <FileText size={16} /> Credit Sales
        </button>
        <button
          onClick={() => setActiveTab("cash")}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === "cash" ? "bg-accent text-primary shadow-lg" : "text-muted hover:text-text"
          }`}
        >
          <Receipt size={16} /> Cash Sales
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          type="text"
          placeholder={activeTab === "credit" ? "Search by Customer, Bill No., or Phone..." : "Search by Product Name or Date..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-primary border border-accent/10 rounded-xl pl-12 pr-4 py-3 text-text focus:border-accent outline-none transition-all"
        />
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar pb-4 -mx-6 px-6 md:mx-0 md:px-0">
        {activeTab === "credit" ? (
          <table className="w-full text-center border-collapse whitespace-nowrap md:whitespace-normal relative">
            <thead className="sticky top-0 z-10 bg-surface shadow-sm">
              <tr className="border-b border-accent/10 text-muted text-xs uppercase tracking-wider">
                <th className="px-4 py-4 font-medium text-center">Bill No.</th>
                <th className="px-4 py-4 font-medium text-center">Customer Name</th>
                <th className="px-4 py-4 font-medium text-center">Phone</th>
                <th className="px-4 py-4 font-medium text-center">Date</th>
                <th className="px-4 py-4 font-medium text-center">Grand Total</th>
                <th className="px-4 py-4 font-medium text-center">Profit</th>
                <th className="px-4 py-4 font-medium text-center">Due</th>
                <th className="px-4 py-4 font-medium text-center">Status</th>
                <th className="px-4 py-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredBills.map((bill, index) => (
                <tr key={`${bill.id}-${index}`} className="border-b border-accent/5 hover:bg-primary/50 transition-colors">
                  <td className="px-4 py-4 font-bold text-accent text-center">{bill.billNo}</td>
                  <td className="px-4 py-4 font-medium text-center">{bill.customerName}</td>
                  <td className="px-4 py-4 text-muted text-center">
                    {bill.customerPhone}
                    {bill.additionalPhones && bill.additionalPhones.length > 0 && (
                      <div className="text-[10px] opacity-70">
                        {bill.additionalPhones.join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-muted text-center">{formatDate(bill.date)}</td>
                  <td className="px-4 py-4 text-center font-bold">{formatCurrency(bill.grandTotal)}</td>
                  <td className="px-4 py-4 text-center font-bold text-green-500">{formatCurrency(calculateBillProfit(bill))}</td>
                  <td className="px-4 py-4 text-center text-red-500">{formatCurrency(bill.dueAmount)}</td>
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
                        onClick={() => setSelectedBill(bill)}
                        className="text-muted hover:text-accent"
                        title="View Details"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        onClick={() => setEditingBill(bill)}
                        className="text-muted hover:text-blue-500"
                        title="Edit / Return"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                      </button>
                      <button
                        onClick={() => handleDeleteBill(bill)}
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
                  <td colSpan={9} className="px-4 py-12 text-center text-muted italic">
                    No bills found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-center border-collapse whitespace-nowrap md:whitespace-normal relative">
            <thead className="sticky top-0 z-10 bg-surface shadow-sm">
              <tr className="border-b border-accent/10 text-muted text-xs uppercase tracking-wider">
                <th className="px-4 py-4 font-medium text-center">Date</th>
                <th className="px-4 py-4 font-medium text-center">Product Name</th>
                <th className="px-4 py-4 font-medium text-center">Qty</th>
                <th className="px-4 py-4 font-medium text-center">Rate</th>
                <th className="px-4 py-4 font-medium text-center">Total Amount</th>
                <th className="px-4 py-4 font-medium text-center">Profit</th>
                <th className="px-4 py-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredCashSales.map((sale, index) => (
                <tr key={`${sale.id}-${index}`} className="border-b border-accent/5 hover:bg-primary/50 transition-colors">
                  <td className="px-4 py-4 text-muted text-center">{formatDate(sale.date)}</td>
                  <td className="px-4 py-4 font-medium text-center">{sale.productName}</td>
                  <td className="px-4 py-4 text-center">{sale.qty}</td>
                  <td className="px-4 py-4 text-center">{formatCurrency(sale.amount / sale.qty)}</td>
                  <td className="px-4 py-4 text-center font-bold text-accent">{formatCurrency(sale.amount)}</td>
                  <td className="px-4 py-4 text-center font-bold text-green-500">{formatCurrency(sale.amount - (sale.qty * sale.purchaseRate))}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setSelectedCashSale(sale)}
                        className="text-muted hover:text-accent"
                        title="View Details"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteCashSale(sale)}
                        className="text-muted hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCashSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted italic">
                    No cash sales found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
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
              className="bg-surface border border-accent/20 p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-accent">Bill Details #{selectedBill.billNo}</h3>
                <button 
                  onClick={() => setSelectedBill(null)}
                  className="p-2 hover:bg-accent/10 rounded-full transition-colors text-muted hover:text-accent"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 bg-white text-gray-900 rounded-xl p-6 border border-gray-100">
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
                <div className="border border-gray-200 rounded-lg overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                        <th className="px-4 py-3 border-b border-gray-200">Date</th>
                        <th className="px-4 py-3 border-b border-gray-200">Item Description</th>
                        <th className="px-4 py-3 border-b border-gray-200 text-center">MRP</th>
                        <th className="px-4 py-3 border-b border-gray-200 text-center">Percentage</th>
                        <th className="px-4 py-3 border-b border-gray-200 text-center">Qty</th>
                        <th className="px-4 py-3 border-b border-gray-200 text-right">Rate</th>
                        <th className="px-4 py-3 border-b border-gray-200 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedBill.items.map((item, idx) => (
                        <tr key={idx} className="text-sm">
                          <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(selectedBill.date)}</td>
                          <td className="px-4 py-3 font-medium">{item.productName}</td>
                          <td className="px-4 py-3 text-center text-gray-500">{formatCurrency(item.mrp || 0)}</td>
                          <td className="px-4 py-3 text-center text-accent font-bold">
                            {item.mrp > 0 ? (((item.mrp - item.price) / item.mrp) * 100).toFixed(1) : 0}%
                          </td>
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

              <div className="p-6 border-t border-accent/10 bg-primary/30 flex gap-4">
                <button 
                  onClick={() => setSelectedBill(null)}
                  className="flex-1 bg-primary text-muted font-bold py-3 rounded-xl hover:text-text transition-all border border-accent/10"
                >
                  Close
                </button>
                <button 
                  onClick={() => handlePrintBill(selectedBill)}
                  className="flex-1 bg-accent text-primary font-bold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                >
                  <Printer size={20} />
                  Print Bill
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedCashSale && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedCashSale(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface border border-accent/20 p-6 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-accent">Cash Sale Details</h3>
                <button 
                  onClick={() => setSelectedCashSale(null)}
                  className="p-2 hover:bg-accent/10 rounded-full transition-colors text-muted hover:text-accent"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 bg-white text-gray-900 rounded-xl p-6 border border-gray-100">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Date:</span>
                  <span className="font-bold">{formatDate(selectedCashSale.date)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Product:</span>
                  <span className="font-bold">{selectedCashSale.productName}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Quantity:</span>
                  <span className="font-bold">{selectedCashSale.qty}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Purchase Rate:</span>
                  <span className="font-bold">{formatCurrency(selectedCashSale.purchaseRate)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">MRP:</span>
                  <span className="font-bold">{formatCurrency(selectedCashSale.mrp)}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-lg font-bold text-gray-900">Total Amount:</span>
                  <span className="text-lg font-bold text-accent">{formatCurrency(selectedCashSale.amount)}</span>
                </div>
              </div>

              <div className="mt-6">
                <button 
                  onClick={() => setSelectedCashSale(null)}
                  className="w-full bg-accent text-primary font-bold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {editingBill && (
        <BillEditModal
          bill={editingBill}
          onClose={() => setEditingBill(null)}
        />
      )}
    </div>
  );
}
