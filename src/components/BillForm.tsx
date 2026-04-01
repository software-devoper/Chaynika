import React, { useState, useEffect } from "react";
import { Search, Plus, Trash2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { Product, BillItem, Customer, Bill } from "../types";
import { formatCurrency } from "../lib/utils";
import { generateBillPDF } from "../lib/BillPDFGenerator";
import { productApi, billApi, dueApi } from "../lib/api";

export default function BillForm() {
  const [customer, setCustomer] = useState<Partial<Customer>>({
    name: "",
    address: "",
    email: "",
    phone: "",
  });
  const [previousDue, setPreviousDue] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paidAmount, setPaidAmount] = useState(0);

  useEffect(() => {
    const unsubscribe = productApi.getAll(setProducts);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchTerm.length > 1) {
      setSearchResults(products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.stock > 0
      ));
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, products]);

  // Fetch previous due when phone changes
  useEffect(() => {
    if (customer.phone && customer.phone.length === 10) {
      const unsubscribe = dueApi.getAll((dues) => {
        const due = dues.find(d => d.customerPhone === customer.phone);
        setPreviousDue(due ? due.amount : 0);
        if (due && !customer.name) {
          setCustomer(prev => ({ ...prev, name: due.customerName, address: due.customerAddress }));
        }
      });
      return () => unsubscribe();
    }
  }, [customer.phone]);

  const addProductToBill = (product: Product) => {
    const existing = billItems.find(item => item.productId === product.id);
    if (existing) {
      if (existing.qty >= product.stock) return toast.error("Out of stock");
      setBillItems(billItems.map(item => 
        item.productId === product.id 
          ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.price }
          : item
      ));
    } else {
      const newItem: BillItem = {
        productId: product.id,
        productName: product.name,
        qty: 1,
        price: product.mrp,
        total: product.mrp,
      };
      setBillItems([...billItems, newItem]);
    }
    setSearchTerm("");
    setSearchResults([]);
  };

  const removeProductFromBill = (productId: string) => {
    setBillItems(billItems.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, qty: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (qty > product.stock) return toast.error("Out of stock");
    if (qty < 1) return;

    setBillItems(billItems.map(item => 
      item.productId === productId 
        ? { ...item, qty: qty, total: qty * item.price }
        : item
    ));
  };

  const subtotal = billItems.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = subtotal + previousDue;
  const currentBillDue = Math.max(0, subtotal - paidAmount);

  const handleGenerateBill = async () => {
    if (!customer.name || !customer.phone || billItems.length === 0) {
      toast.error("Please fill customer details and add products");
      return;
    }

    const billNo = `BILL-${Date.now()}`;
    const billData: Omit<Bill, "id"> = {
      billNo,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address || "",
      items: billItems,
      subtotal,
      grandTotal: subtotal + previousDue,
      paidAmount,
      dueAmount: Math.max(0, subtotal + previousDue - paidAmount),
      date: Date.now(),
    };

    try {
      await billApi.create(billData);
      generateBillPDF(billData as Bill);
      
      toast.success("Bill generated successfully");
      // Reset form
      setCustomer({ name: "", address: "", email: "", phone: "" });
      setBillItems([]);
      setPreviousDue(0);
      setPaidAmount(0);
    } catch (error) {
      toast.error("Failed to save bill");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Panel: Customer Details */}
      <div className="lg:col-span-1 space-y-6">
        <h4 className="text-lg font-bold text-accent border-b border-accent/10 pb-2">Customer Details</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Phone Number</label>
            <input
              type="tel"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
              placeholder="Enter phone"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Customer Name</label>
            <input
              type="text"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
              placeholder="Enter name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Address</label>
            <input
              type="text"
              value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
              placeholder="Enter address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Email</label>
            <input
              type="email"
              value={customer.email}
              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
              placeholder="Enter email"
            />
          </div>
          <div className="pt-4 p-4 bg-primary/30 rounded-xl border border-accent/5">
            <div className="flex justify-between items-center">
              <span className="text-muted">Previous Due:</span>
              <span className="text-accent font-bold">{formatCurrency(previousDue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Product Search & Table */}
      <div className="lg:col-span-2 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            type="text"
            placeholder="Search product to add..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-primary border border-accent/10 rounded-xl pl-12 pr-4 py-3 text-text focus:border-accent outline-none transition-all"
          />
          
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-accent/20 rounded-xl shadow-2xl z-10 overflow-hidden divide-y divide-accent/5">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProductToBill(p)}
                  className="w-full text-left px-4 py-3 hover:bg-primary transition-colors flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted">Stock: {p.stock} | MRP: {formatCurrency(p.mrp)}</div>
                  </div>
                  <Plus size={18} className="text-accent" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-accent/10 text-muted text-xs uppercase tracking-wider">
                <th className="px-2 py-3 font-medium">Sr.</th>
                <th className="px-2 py-3 font-medium">Particular</th>
                <th className="px-2 py-3 font-medium text-right">Rate</th>
                <th className="px-2 py-3 font-medium text-center">Qty</th>
                <th className="px-2 py-3 font-medium text-right">Total</th>
                <th className="px-2 py-3 font-medium text-center"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {billItems.map((item, index) => (
                <tr key={item.productId} className="border-b border-accent/5">
                  <td className="px-2 py-4">{index + 1}</td>
                  <td className="px-2 py-4 font-medium">{item.productName}</td>
                  <td className="px-2 py-4 text-right">{formatCurrency(item.price)}</td>
                  <td className="px-2 py-4">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                      className="w-16 bg-primary border border-accent/10 rounded px-2 py-1 text-center outline-none focus:border-accent"
                    />
                  </td>
                  <td className="px-2 py-4 text-right font-medium">{formatCurrency(item.total)}</td>
                  <td className="px-2 py-4 text-center">
                    <button onClick={() => removeProductFromBill(item.productId)} className="text-muted hover:text-red-500">
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {billItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-muted italic">No products added to bill</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-end gap-4 border-t border-accent/10 pt-6">
          <div className="space-y-2 text-right w-full max-w-xs">
            <div className="flex justify-between text-muted">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Previous Due:</span>
              <span>{formatCurrency(previousDue)}</span>
            </div>
            <div className="flex justify-between items-center gap-4 text-muted">
              <span>Paid Amount:</span>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="w-24 bg-primary border border-accent/10 rounded px-2 py-1 text-right outline-none focus:border-accent"
              />
            </div>
            <div className="flex justify-between text-xl font-display font-bold text-accent pt-2 border-t border-accent/10">
              <span>Grand Total:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
            <div className="flex justify-between text-muted text-sm">
              <span>New Due:</span>
              <span className="text-red-500">{formatCurrency(Math.max(0, grandTotal - paidAmount))}</span>
            </div>
          </div>
          
          <div className="flex gap-4 w-full max-w-xs">
            <button 
              onClick={() => { setBillItems([]); setCustomer({ name: "", address: "", email: "", phone: "" }); }}
              className="flex-1 bg-primary text-muted font-bold py-3 rounded-xl hover:text-text transition-all"
            >
              Clear
            </button>
            <button 
              onClick={handleGenerateBill}
              className="flex-2 bg-accent text-primary font-bold py-3 rounded-xl hover:opacity-90 transition-all"
            >
              Generate Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
