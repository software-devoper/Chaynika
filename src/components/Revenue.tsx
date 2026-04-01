import React, { useState, useEffect } from "react";
import { formatCurrency } from "../lib/utils";
import { billApi, productApi } from "../lib/api";
import { Bill, Product } from "../types";

export default function Revenue() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubBills = billApi.getAll((data) => setBills(data));
    const unsubProducts = productApi.getAll((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => {
      unsubBills();
      unsubProducts();
    };
  }, []);

  // Calculate stats
  const totalRevenue = bills.reduce((sum, b) => sum + b.subtotal, 0);
  
  // For profit, we need to know the purchase price of items sold
  // We can map items in bills to their product purchase price
  const productMap = new Map<string, Product>(products.map(p => [p.id, p]));
  
  let totalPurchaseCost = 0;
  const productStats = new Map<string, { name: string, qty: number, purchaseRate: number, price: number }>();

  bills.forEach(bill => {
    bill.items.forEach(item => {
      const product = productMap.get(item.productId);
      const pRate = product?.purchaseRate || 0;
      totalPurchaseCost += pRate * item.qty;

      const existing = productStats.get(item.productId) || { name: item.productName, qty: 0, purchaseRate: pRate, price: item.price };
      existing.qty += item.qty;
      productStats.set(item.productId, existing);
    });
  });

  const totalProfit = totalRevenue - totalPurchaseCost;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-accent/10 rounded-2xl p-6 shadow-lg">
          <div className="text-muted text-sm mb-2">Total Revenue</div>
          <div className="text-3xl font-display font-bold text-accent">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="bg-surface border border-accent/10 rounded-2xl p-6 shadow-lg">
          <div className="text-muted text-sm mb-2">Total Purchase Cost</div>
          <div className="text-3xl font-display font-bold text-text">{formatCurrency(totalPurchaseCost)}</div>
        </div>
        <div className="bg-surface border border-accent/10 rounded-2xl p-6 shadow-lg">
          <div className="text-muted text-sm mb-2">Total Profit</div>
          <div className="text-3xl font-display font-bold text-green-500">{formatCurrency(totalProfit)}</div>
        </div>
      </div>

      <div className="bg-surface border border-accent/10 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xl font-display font-bold text-accent mb-6">Product Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-accent/10 text-muted text-xs uppercase tracking-wider">
                <th className="px-4 py-4 font-medium">Product</th>
                <th className="px-4 py-4 font-medium">Qty Sold</th>
                <th className="px-4 py-4 font-medium text-right">Purchase Rate</th>
                <th className="px-4 py-4 font-medium text-right">Rate</th>
                <th className="px-4 py-4 font-medium text-right">Unit Profit</th>
                <th className="px-4 py-4 font-medium text-right">Total Profit</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {Array.from(productStats.values()).map((stat, index) => (
                <tr key={index} className="border-b border-accent/5 hover:bg-primary/50 transition-colors">
                  <td className="px-4 py-4 font-medium">{stat.name}</td>
                  <td className="px-4 py-4">{stat.qty}</td>
                  <td className="px-4 py-4 text-right">{formatCurrency(stat.purchaseRate)}</td>
                  <td className="px-4 py-4 text-right">{formatCurrency(stat.price)}</td>
                  <td className="px-4 py-4 text-right text-green-500">{formatCurrency(stat.price - stat.purchaseRate)}</td>
                  <td className="px-4 py-4 text-right font-bold text-green-500">{formatCurrency((stat.price - stat.purchaseRate) * stat.qty)}</td>
                </tr>
              ))}
              {productStats.size === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted italic">
                    No sales data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
