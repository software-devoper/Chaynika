import React, { useState, useEffect } from "react";
import { Search, DollarSign, Trash2, Calendar } from "lucide-react";
import { toast } from "react-hot-toast";
import { formatCurrency, formatDate } from "../lib/utils";
import { paymentHistoryApi } from "../lib/api";
import { motion } from "motion/react";

export default function PaymentHistory() {
  const [payments, setPayments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = paymentHistoryApi.getAll(
      (data) => {
        setPayments(data);
        setLoading(false);
        setError(null);
      },
      (err: any) => {
        setError(err.message || "Failed to fetch payment history");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredPayments = payments.filter(
    (p) =>
      p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customerPhone?.includes(searchTerm)
  );

  const handleDelete = async (paymentId: string) => {
    if (window.confirm("Are you sure you want to delete this payment record?")) {
      try {
        await paymentHistoryApi.delete(paymentId);
        toast.success("Payment record deleted");
      } catch (err) {
        toast.error("Failed to delete record");
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-display font-bold text-accent">Payment History</h2>
      
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          type="text"
          placeholder="Search by Customer Name or Phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-primary border border-accent/10 rounded-xl pl-12 pr-4 py-3 text-text focus:border-accent outline-none transition-all"
        />
      </div>

      <div className="overflow-x-auto bg-surface rounded-xl border border-accent/10">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="border-b border-accent/10 bg-accent/5">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Entity Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-muted italic text-center">Loading...</td></tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="py-8 text-red-500 italic text-center">
                  <p>Permission Error: {error}</p>
                  <p className="text-xs mt-2 text-muted">Please ensure Firestore rules are correctly deployed.</p>
                </td>
              </tr>
            ) : filteredPayments.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-muted italic text-center">No payment records found. History only starts from today.</td></tr>
            ) : filteredPayments.map((p) => (
              <tr key={p.id} className="border-b border-accent/5 hover:bg-primary/50">
                <td className="px-4 py-3 text-muted">{formatDate(p.date)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    p.type?.includes('received') ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {p.type?.replace('_', ' ') || 'Payment'}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{p.customerName}</td>
                <td className="px-4 py-3 text-muted">{p.customerPhone}</td>
                <td className={`px-4 py-3 font-bold ${p.type?.includes('received') ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(p.amount)}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(p.id)} className="text-muted hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
