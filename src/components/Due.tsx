import React, { useState, useEffect } from "react";
import { Search, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { CustomerDue } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";
import { dueApi } from "../lib/api";

export default function Due() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dues, setDues] = useState<CustomerDue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = dueApi.getAll((data) => {
      setDues(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredDues = dues.filter(
    (d) =>
      d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customerPhone.includes(searchTerm) ||
      d.additionalPhones?.some(p => p.includes(searchTerm))
  );

  const handleMarkPaid = async (due: CustomerDue) => {
    if (window.confirm("Mark all dues as paid for this customer?")) {
      try {
        await dueApi.markPaid(due.customerPhone, due.additionalPhones || []);
        toast.success("Dues cleared successfully");
      } catch (err) {
        toast.error("Failed to clear dues");
      }
    }
  };

  return (
    <div className="space-y-6">
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

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-accent/10 text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-4 font-medium">Sr. No.</th>
              <th className="px-4 py-4 font-medium">Customer Name</th>
              <th className="px-4 py-4 font-medium">Phone</th>
              <th className="px-4 py-4 font-medium">Address</th>
              <th className="px-4 py-4 font-medium text-right">Amount</th>
              <th className="px-4 py-4 font-medium">Last Bill Date</th>
              <th className="px-4 py-4 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted italic">
                  Loading dues...
                </td>
              </tr>
            ) : (
              filteredDues.map((due, index) => (
                <tr key={due.id} className="border-b border-accent/5 hover:bg-primary/50 transition-colors">
                  <td className="px-4 py-4">{index + 1}</td>
                  <td className="px-4 py-4 font-medium">{due.customerName}</td>
                  <td className="px-4 py-4 text-muted">
                    {due.customerPhone}
                    {due.additionalPhones && due.additionalPhones.length > 0 && (
                      <div className="text-[10px] opacity-70">
                        {due.additionalPhones.join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-muted">{due.customerAddress}</td>
                  <td className="px-4 py-4 text-right font-bold text-red-500">{formatCurrency(due.amount)}</td>
                  <td className="px-4 py-4 text-muted">{formatDate(due.lastBillDate)}</td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => handleMarkPaid(due)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all mx-auto"
                    >
                      <CheckCircle size={16} /> Mark Paid
                    </button>
                  </td>
                </tr>
              ))
            )}
            {!loading && filteredDues.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted italic">
                  No pending dues found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
