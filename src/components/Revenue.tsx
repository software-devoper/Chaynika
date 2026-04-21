import React, { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "../lib/utils";
import { billApi, productApi, cashSaleApi } from "../lib/api";
import { Bill, Product, CashSale } from "../types";

export default function Revenue() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cashSales, setCashSales] = useState<CashSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubBills = billApi.getAll((data) => setBills(data));
    const unsubCash = cashSaleApi.getAll((data) => setCashSales(data));
    const unsubProducts = productApi.getAll((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => {
      unsubBills();
      unsubCash();
      unsubProducts();
    };
  }, []);

  // Calculate stats
  // Use grandTotal to account for Round Off and Discounts instead of raw subtotal
  const creditRevenue = bills.reduce((sum, b) => sum + b.grandTotal, 0);
  const cashRevenue = cashSales.reduce((sum, s) => sum + s.amount, 0);
  const totalRevenue = creditRevenue + cashRevenue;
  
  // For profit, we need to know the purchase price of items sold
  const productMap = new Map<string, Product>(products.map(p => [p.id, p]));
  
  let totalPurchaseCost = 0;
  const productStats = new Map<string, { name: string, qty: number, purchaseRate: number, wholesaleRate: number, price: number, lastSoldDate: number }>();

  // Process Credit Bills
  bills.forEach(bill => {
    bill.items.forEach(item => {
      // Prioritize saved purchaseRate for historical accuracy, fallback to current stock rate
      let pRate = item.purchaseRate;
      if (typeof pRate === 'undefined') {
        const product = productMap.get(item.productId);
        pRate = product?.purchaseRate || 0;
      }
      
      const product = productMap.get(item.productId);
      const wRate = item.wholesaleRate || product?.wholesaleRate || 0;
      totalPurchaseCost += pRate * item.qty;

      const existing = productStats.get(item.productId) || { name: item.productName, qty: 0, purchaseRate: pRate, wholesaleRate: wRate, price: item.price, lastSoldDate: bill.date };
      existing.qty += item.qty;
      if (bill.date > existing.lastSoldDate) {
        existing.lastSoldDate = bill.date;
      }
      productStats.set(item.productId, existing);
    });
  });

  // Process Cash Sales
  cashSales.forEach(sale => {
    const product = productMap.get(sale.productId);
    const pRate = product?.purchaseRate || sale.purchaseRate || 0;
    const wRate = product?.wholesaleRate || (sale.amount / sale.qty) || 0;
    totalPurchaseCost += pRate * sale.qty;

    const existing = productStats.get(sale.productId) || { name: sale.productName, qty: 0, purchaseRate: pRate, wholesaleRate: wRate, price: sale.amount / sale.qty, lastSoldDate: sale.date };
    existing.qty += sale.qty;
    if (sale.date > existing.lastSoldDate) {
      existing.lastSoldDate = sale.date;
    }
    productStats.set(sale.productId, existing);
  });

  const totalProfit = totalRevenue - totalPurchaseCost;
  const firstSaleDate = bills.length > 0 || cashSales.length > 0 
    ? Math.min(...[...bills.map(b => b.date), ...cashSales.map(s => s.date)]) 
    : null;
  const dateRangeText = firstSaleDate ? `Since ${formatDate(firstSaleDate)}` : "All Time";

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-accent/10 rounded-2xl p-6 shadow-lg">
          <div className="text-muted text-sm mb-2">Total Revenue <span className="text-xs opacity-70">({dateRangeText})</span></div>
          <div className="text-3xl font-display font-bold text-accent">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="bg-surface border border-accent/10 rounded-2xl p-6 shadow-lg">
          <div className="text-muted text-sm mb-2">Total Purchase Cost <span className="text-xs opacity-70">({dateRangeText})</span></div>
          <div className="text-3xl font-display font-bold text-text">{formatCurrency(totalPurchaseCost)}</div>
        </div>
        <div className="bg-surface border border-accent/10 rounded-2xl p-6 shadow-lg">
          <div className="text-muted text-sm mb-2">Total Profit <span className="text-xs opacity-70">({dateRangeText})</span></div>
          <div className="text-3xl font-display font-bold text-green-500">{formatCurrency(totalProfit)}</div>
        </div>
      </div>

      <div className="bg-surface border border-accent/10 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xl font-display font-bold text-accent mb-6">Product Breakdown</h3>
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
          <table className="w-full text-center border-collapse whitespace-nowrap md:whitespace-normal relative">
            <thead className="sticky top-0 z-10 bg-surface shadow-sm">
              <tr className="border-b border-accent/10 text-muted text-xs uppercase tracking-wider">
                <th className="px-4 py-4 font-medium text-center">Product</th>
                <th className="px-4 py-4 font-medium text-center">Last Sold</th>
                <th className="px-4 py-4 font-medium text-center">Qty Sold</th>
                <th className="px-4 py-4 font-medium text-center">Purchase Rate</th>
                <th className="px-4 py-4 font-medium text-center">Wholesale Rate</th>
                <th className="px-4 py-4 font-medium text-center">Unit Profit</th>
                <th className="px-4 py-4 font-medium text-center">Total Profit</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {Array.from(productStats.values()).map((stat, index) => (
                <tr key={index} className="border-b border-accent/5 hover:bg-primary/50 transition-colors">
                  <td className="px-4 py-4 font-medium text-center">{stat.name}</td>
                  <td className="px-4 py-4 text-muted text-xs text-center">{formatDate(stat.lastSoldDate)}</td>
                  <td className="px-4 py-4 text-center">{stat.qty}</td>
                  <td className="px-4 py-4 text-center">{formatCurrency(stat.purchaseRate)}</td>
                  <td className="px-4 py-4 text-center">{formatCurrency(stat.wholesaleRate)}</td>
                  <td className="px-4 py-4 text-center text-green-500">{formatCurrency(stat.wholesaleRate - stat.purchaseRate)}</td>
                  <td className="px-4 py-4 text-center font-bold text-green-500">{formatCurrency((stat.wholesaleRate - stat.purchaseRate) * stat.qty)}</td>
                </tr>
              ))}
              {productStats.size === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted italic">
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
