import React, { useState, useEffect } from "react";
import { Search, CheckCircle, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "react-hot-toast";
import { CustomerDue, PartyDue, Product } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";
import { dueApi, partyDueApi, productApi } from "../lib/api";
import { motion, AnimatePresence } from "motion/react";

export default function Due() {
  const [activeTab, setActiveTab] = useState<"sales" | "purchase">("sales");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [customerDues, setCustomerDues] = useState<CustomerDue[]>([]);
  const [partyDues, setPartyDues] = useState<PartyDue[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingType, setProcessingType] = useState<"full" | "partly" | null>(null);
  const [selectedDueDetails, setSelectedDueDetails] = useState<{name: string, products: Product[]} | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribeCustomer = dueApi.getAll((data) => {
      setCustomerDues(data);
      if (activeTab === "sales") setLoading(false);
    });
    
    const unsubscribeParty = partyDueApi.getAll((data) => {
      setPartyDues(data);
      if (activeTab === "purchase") setLoading(false);
    });

    const unsubscribeProducts = productApi.getAll((data) => {
      setProducts(data);
    });

    return () => {
      unsubscribeCustomer();
      unsubscribeParty();
      unsubscribeProducts();
    };
  }, [activeTab]);

  const filteredCustomerDues = customerDues.filter(
    (d) =>
      d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customerPhone.includes(searchTerm) ||
      d.additionalPhones?.some(p => p.includes(searchTerm))
  );

  const filteredPartyDues = partyDues.filter(
    (d) => d.partyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMarkPaid = async (due: CustomerDue) => {
    if (window.confirm("Mark all dues as paid for this customer?")) {
      setProcessingId(due.id);
      setProcessingType("full");
      try {
        await dueApi.markPaid(due.customerPhone, due.additionalPhones || []);
        toast.success("Dues cleared successfully");
      } catch (err) {
        toast.error("Failed to clear dues");
      } finally {
        setProcessingId(null);
        setProcessingType(null);
      }
    }
  };

  const handlePartlyPaid = async (due: CustomerDue) => {
    const amount = prompt("Enter amount to pay:");
    if (amount) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error("Invalid amount");
        return;
      }
      if (parsedAmount > due.amount) {
        toast.error("Amount exceeds due amount");
        return;
      }
      
      setProcessingId(due.id);
      setProcessingType("partly");
      try {
        await dueApi.updateDueAmount(due.customerPhone, due.additionalPhones || [], parsedAmount);
        toast.success("Partial payment recorded");
      } catch (err) {
        toast.error("Failed to record partial payment");
      } finally {
        setProcessingId(null);
        setProcessingType(null);
      }
    }
  };

  const handlePartyMarkPaid = async (due: PartyDue) => {
    if (window.confirm(`Mark all dues as paid for ${due.partyName}?`)) {
      setProcessingId(due.id);
      setProcessingType("full");
      try {
        await partyDueApi.markPaid(due.partyName);
        toast.success("Party dues cleared successfully");
      } catch (err) {
        toast.error("Failed to clear party dues");
      } finally {
        setProcessingId(null);
        setProcessingType(null);
      }
    }
  };

  const handlePartyPartlyPaid = async (due: PartyDue) => {
    const amount = prompt("Enter amount paid to party:");
    if (amount) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error("Invalid amount");
        return;
      }
      if (parsedAmount > due.amount) {
        toast.error("Amount exceeds due amount");
        return;
      }
      
      setProcessingId(due.id);
      setProcessingType("partly");
      try {
        await partyDueApi.addOrUpdate(due.partyName, -parsedAmount);
        toast.success("Partial payment recorded");
      } catch (err) {
        toast.error("Failed to record partial payment");
      } finally {
        setProcessingId(null);
        setProcessingType(null);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button
          onClick={() => { setActiveTab("sales"); setSearchTerm(""); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
            activeTab === "sales" 
              ? "bg-green-500 text-white shadow-lg shadow-green-500/20" 
              : "bg-primary border border-accent/10 text-muted hover:text-text"
          }`}
        >
          <TrendingUp size={20} />
          Sales Due
        </button>
        <button
          onClick={() => { setActiveTab("purchase"); setSearchTerm(""); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
            activeTab === "purchase" 
              ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
              : "bg-primary border border-accent/10 text-muted hover:text-text"
          }`}
        >
          <TrendingDown size={20} />
          Purchase Due
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          type="text"
          placeholder={activeTab === "sales" ? "Search by Customer Name or Phone..." : "Search by Party Name..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-primary border border-accent/10 rounded-xl pl-12 pr-4 py-3 text-text focus:border-accent outline-none transition-all shadow-sm"
        />
      </div>

      <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
        <table className="w-full text-center border-collapse whitespace-nowrap md:whitespace-normal">
          <thead>
            <tr className="border-b border-accent/10 text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-4 font-medium text-center">Sr. No.</th>
              <th className="px-4 py-4 font-medium text-center">{activeTab === "sales" ? "Customer Name" : "Party Name"}</th>
              {activeTab === "sales" && <th className="px-4 py-4 font-medium text-center">Phone</th>}
              {activeTab === "sales" && <th className="px-4 py-4 font-medium text-center">Address</th>}
              <th className="px-4 py-4 font-medium text-center">{activeTab === "sales" ? "Product Name" : "Products"}</th>
              <th className="px-4 py-4 font-medium text-center">View Details</th>
              <th className="px-4 py-4 font-medium text-center">Amount</th>
              <th className="px-4 py-4 font-medium text-center">{activeTab === "sales" ? "Last Bill Date" : "Last Purchase Date"}</th>
              <th className="px-4 py-4 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td colSpan={activeTab === "sales" ? 8 : 6} className="px-4 py-12 text-center text-muted italic">
                  Loading dues...
                </td>
              </tr>
            ) : activeTab === "sales" ? (
              filteredCustomerDues.map((due, index) => (
                <motion.tr 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  key={due.id} 
                  className="border-b border-accent/5 hover:bg-primary/50 transition-colors"
                >
                  <td className="px-4 py-4 text-center">{index + 1}</td>
                  <td className="px-4 py-4 font-medium text-center">{due.customerName}</td>
                  <td className="px-4 py-4 text-muted text-center">
                    {due.customerPhone}
                    {due.additionalPhones && due.additionalPhones.length > 0 && (
                      <div className="text-[10px] opacity-70">
                        {due.additionalPhones.join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-muted text-center">{due.customerAddress}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="space-y-2 max-h-[85px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden mx-auto">
                      {due.productNames ? (
                        due.productNames.split(',').map((name, idx) => (
                          <div key={idx} className="text-xs border-b border-accent/10 pb-1 last:border-0 last:pb-0">
                            <div className="font-bold text-text truncate text-center" title={name.trim()}>{name.trim()}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted text-xs italic text-center">N/A</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button 
                      onClick={() => setSelectedDueDetails({ name: due.customerName, products: products.filter(p => due.productNames?.includes(p.name)) })}
                      className="text-accent hover:text-accent/80 text-xs font-bold"
                    >
                      View Details
                    </button>
                  </td>
                  <td className="px-4 py-4 text-center font-bold text-green-500">{formatCurrency(due.amount)}</td>
                  <td className="px-4 py-4 text-muted text-center">{formatDate(due.lastBillDate)}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleMarkPaid(due)}
                        disabled={processingId === due.id}
                        className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {processingId === due.id && processingType === "full" && <Loader2 className="w-3 h-3 animate-spin" />}
                        Full Paid
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePartlyPaid(due)}
                        disabled={processingId === due.id}
                        className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-primary transition-all text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {processingId === due.id && processingType === "partly" && <Loader2 className="w-3 h-3 animate-spin" />}
                        Partly Paid
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))
            ) : (
              filteredPartyDues.map((due, index) => (
                <motion.tr 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  key={due.id} 
                  className="border-b border-accent/5 hover:bg-primary/50 transition-colors"
                >
                  <td className="px-4 py-4 text-center">{index + 1}</td>
                  <td className="px-4 py-4 font-medium text-center">{due.partyName}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="space-y-2 max-h-[85px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden mx-auto">
                      {products.filter(p => p.groupName.toLowerCase() === due.partyName.toLowerCase()).length > 0 ? (
                        products.filter(p => p.groupName.toLowerCase() === due.partyName.toLowerCase()).map(p => (
                          <div key={p.id} className="text-xs border-b border-accent/10 pb-1 last:border-0 last:pb-0">
                            <div className="font-bold text-text truncate text-center" title={p.name}>{p.name}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted text-xs italic text-center">
                          {due.productNames || "N/A"}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button 
                      onClick={() => setSelectedDueDetails({ name: due.partyName, products: products.filter(p => p.groupName.toLowerCase() === due.partyName.toLowerCase()) })}
                      className="text-accent hover:text-accent/80 text-xs font-bold"
                    >
                      View Details
                    </button>
                  </td>
                  <td className="px-4 py-4 text-center font-bold text-red-500">{formatCurrency(due.amount)}</td>
                  <td className="px-4 py-4 text-muted text-center">{formatDate(due.lastPurchaseDate)}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePartyMarkPaid(due)}
                        disabled={processingId === due.id}
                        className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {processingId === due.id && processingType === "full" && <Loader2 className="w-3 h-3 animate-spin" />}
                        Full Paid
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePartyPartlyPaid(due)}
                        disabled={processingId === due.id}
                        className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-primary transition-all text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {processingId === due.id && processingType === "partly" && <Loader2 className="w-3 h-3 animate-spin" />}
                        Partly Paid
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
            {!loading && activeTab === "sales" && filteredCustomerDues.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted italic">
                  No pending sales dues found
                </td>
              </tr>
            )}
            {!loading && activeTab === "purchase" && filteredPartyDues.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted italic">
                  No pending purchase dues found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedDueDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-primary/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDueDetails(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-surface border border-accent/20 p-6 rounded-2xl w-full max-w-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-accent mb-4">Details for {selectedDueDetails.name}</h3>
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-primary/50 sticky top-0">
                    <tr className="text-muted uppercase tracking-wider">
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 font-medium text-center">Stock</th>
                      <th className="px-3 py-2 font-medium text-center">P.Rate</th>
                      <th className="px-3 py-2 font-medium text-center">W.Rate</th>
                      <th className="px-3 py-2 font-medium text-center">MRP</th>
                      <th className="px-3 py-2 font-medium text-center">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-accent/5">
                    {selectedDueDetails.products.map(p => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 font-medium text-text">{p.name}</td>
                        <td className="px-3 py-2 text-center text-accent font-bold">{p.stock}</td>
                        <td className="px-3 py-2 text-center text-muted">{formatCurrency(p.purchaseRate)}</td>
                        <td className="px-3 py-2 text-center text-muted">{formatCurrency(p.wholesaleRate)}</td>
                        <td className="px-3 py-2 text-center text-muted">{formatCurrency(p.mrp)}</td>
                        <td className="px-3 py-2 text-center text-muted text-xs">{formatDate(p.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => setSelectedDueDetails(null)}
                className="mt-6 w-full bg-accent text-primary font-bold py-2 rounded-xl hover:opacity-90 transition-all"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
