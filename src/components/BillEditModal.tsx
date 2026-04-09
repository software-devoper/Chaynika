import React, { useState } from 'react';
import { X, Trash2, Save } from 'lucide-react';
import { Bill, BillItem } from '../types';
import { billApi } from '../lib/api';
import toast from 'react-hot-toast';

interface BillEditModalProps {
  bill: Bill;
  onClose: () => void;
}

export default function BillEditModal({ bill, onClose }: BillEditModalProps) {
  const [items, setItems] = useState<BillItem[]>(bill.items);
  const [paidAmount, setPaidAmount] = useState(bill.paidAmount);
  const [isSaving, setIsSaving] = useState(false);

  const updateQty = (productId: string, qty: number) => {
    setItems(items.map(item =>
      item.productId === productId
        ? { ...item, qty, total: qty * item.price }
        : item
    ));
  };

  const updatePrice = (productId: string, price: number) => {
    setItems(items.map(item =>
      item.productId === productId
        ? { ...item, price, total: item.qty * price }
        : item
    ));
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(item => item.productId !== productId));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  // previousDue is kept as it was on the original bill
  const previousDue = bill.grandTotal - bill.subtotal;
  const grandTotal = subtotal + previousDue;
  const dueAmount = Math.max(0, subtotal - paidAmount);

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error("Bill must have at least one item. Delete the bill instead.");
      return;
    }
    setIsSaving(true);
    const updatedBill: Bill = {
      ...bill,
      items,
      subtotal,
      grandTotal,
      paidAmount,
      dueAmount
    };

    try {
      await billApi.update(bill.id!, updatedBill, bill);
      toast.success("Bill updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to update bill");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-4xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-accent/20 flex justify-between items-center">
          <h2 className="text-xl font-bold text-text">Edit Bill #{bill.billNo}</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent/10 rounded-full transition-colors">
            <X size={20} className="text-muted" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted">Customer:</span>
              <div className="font-medium text-text">{bill.customerName}</div>
              <div className="text-muted">{bill.customerPhone}</div>
            </div>
            <div className="text-right">
              <span className="text-muted">Date:</span>
              <div className="font-medium text-text">{new Date(bill.date).toLocaleString()}</div>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[40vh] custom-scrollbar rounded-xl border border-accent/20">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-10 bg-surface shadow-sm">
                <tr className="bg-accent/5 border-b border-accent/20">
                  <th className="p-3 font-medium text-text">Product</th>
                  <th className="p-3 font-medium text-text text-center">Rate</th>
                  <th className="p-3 font-medium text-text text-center">Qty</th>
                  <th className="p-3 font-medium text-text text-right">Total</th>
                  <th className="p-3 font-medium text-text text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.productId} className="border-b border-accent/10 last:border-0">
                    <td className="p-3 text-text">{item.productName}</td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updatePrice(item.productId, Number(e.target.value))}
                        className="w-24 bg-primary border border-accent/20 rounded px-2 py-1 text-center outline-none focus:border-accent"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateQty(item.productId, Number(e.target.value))}
                        className="w-20 bg-primary border border-accent/20 rounded px-2 py-1 text-center outline-none focus:border-accent"
                      />
                    </td>
                    <td className="p-3 text-right font-medium text-text">
                      ₹{item.total.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal:</span>
                <span className="font-medium text-text">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Previous Due:</span>
                <span className="font-medium text-text">₹{previousDue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted">Paid Amount:</span>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-24 bg-primary border border-accent/20 rounded px-2 py-1 text-right outline-none focus:border-accent"
                />
              </div>
              <div className="pt-3 border-t border-accent/20 flex justify-between font-bold">
                <span className="text-text">Current Bill Due:</span>
                <span className="text-accent">₹{dueAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-accent/20 flex justify-end gap-3 bg-accent/5">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl font-medium text-text hover:bg-accent/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
