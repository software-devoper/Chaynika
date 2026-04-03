import React, { useState, useEffect } from "react";
import { Search, FileText, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { Bill } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";
import { generateBillPDF } from "../lib/BillPDFGenerator";
import { billApi } from "../lib/api";
import { auth } from "../lib/firebase";

export default function BillHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleViewPDF = async (bill: Bill) => {
    await generateBillPDF(bill);
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
                      onClick={() => handleViewPDF(bill)}
                      className="text-muted hover:text-accent"
                      title="View PDF"
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
    </div>
  );
}
