import React, { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "../lib/utils";
import { billApi, productApi, cashSaleApi } from "../lib/api";
import { Bill, Product, CashSale } from "../types";

export default function Revenue() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cashSales, setCashSales] = useState<CashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState<number | null>(null);

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

  const filterTimestamp = filterDays ? Date.now() - (filterDays * 24 * 60 * 60 * 1000) : 0;
  const filteredBills = bills.filter(b => b.date >= filterTimestamp);
  const filteredCashSales = cashSales.filter(s => s.date >= filterTimestamp);

  // Calculate stats
  // Use (grandTotal - previousDue) to account for Round Off and Discounts for THIS bill only, excluding past debt
  const creditRevenue = filteredBills.reduce((sum, b) => sum + (b.grandTotal - (b.previousDue || 0)), 0);
  const cashRevenue = filteredCashSales.reduce((sum, s) => sum + s.amount, 0);
  const totalRevenue = creditRevenue + cashRevenue;
  
  // For profit, we need to know the purchase price of items sold
  const productMap = new Map<string, Product>(products.map(p => [p.id, p]));
  
  let totalPurchaseCost = 0;
  const productStats = new Map<string, { name: string, qty: number, cost: number, revenue: number, lastSoldDate: number }>();

  // Process Credit Bills
  filteredBills.forEach(bill => {
    bill.items.forEach(item => {
      // Prioritize saved purchaseRate for historical accuracy, fallback to current stock rate
      let pRate = item.purchaseRate;
      if (typeof pRate === 'undefined') {
        const product = productMap.get(item.productId);
        pRate = product?.purchaseRate || 0;
      }
      
      const multiplier = item.selectedUnitType === "secondary" && item.conversionRate ? item.conversionRate : 1;
      const baseQty = item.qty * multiplier;
      const cost = pRate * baseQty;
      const revenue = item.total || (item.qty * item.price);
      
      totalPurchaseCost += cost;

      const existing = productStats.get(item.productId) || { name: item.productName, qty: 0, cost: 0, revenue: 0, lastSoldDate: bill.date };
      existing.qty += baseQty;
      existing.cost += cost;
      existing.revenue += revenue;
      if (bill.date > existing.lastSoldDate) {
        existing.lastSoldDate = bill.date;
      }
      productStats.set(item.productId, existing);
    });
  });

  // Process Cash Sales
  filteredCashSales.forEach(sale => {
    const pRate = sale.purchaseRate || productMap.get(sale.productId)?.purchaseRate || 0;
    const cost = pRate * sale.qty;
    const revenue = sale.amount || (sale.amount === 0 ? 0 : 0);
    
    totalPurchaseCost += cost;

    const existing = productStats.get(sale.productId) || { name: sale.productName, qty: 0, cost: 0, revenue: 0, lastSoldDate: sale.date };
    existing.qty += sale.qty;
    existing.cost += cost;
    existing.revenue += revenue;
    if (sale.date > existing.lastSoldDate) {
      existing.lastSoldDate = sale.date;
    }
    productStats.set(sale.productId, existing);
  });

  const totalProfit = totalRevenue - totalPurchaseCost;
  const firstSaleDate = filteredBills.length > 0 || filteredCashSales.length > 0 
    ? Math.min(...[...filteredBills.map(b => b.date), ...filteredCashSales.map(s => s.date)]) 
    : null;
  const dateRangeText = filterDays 
    ? `Last ${filterDays} Days` 
    : (firstSaleDate ? `Since ${formatDate(firstSaleDate)}` : "All Time");

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-accent font-display">Revenue Overview</h2>
        <select 
          value={filterDays === null ? "all" : filterDays.toString()} 
          onChange={(e) => setFilterDays(e.target.value === "all" ? null : Number(e.target.value))}
          className="bg-primary/50 text-text border border-accent/20 rounded-xl px-4 py-2 font-medium focus:border-accent outline-none cursor-pointer"
        >
          <option value="all">All Time</option>
          <option value="1">Last 24 Hours</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="365">Last 365 Days</option>
        </select>
      </div>

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
              <tr className="border-b border-accent/20 text-accent text-base font-black uppercase tracking-widest bg-accent/10">
                <th className="px-4 py-5 font-bold text-center">Product</th>
                <th className="px-4 py-5 font-bold text-center">Last Sold</th>
                <th className="px-4 py-5 font-bold text-center">Qty Sold</th>
                <th className="px-4 py-5 font-bold text-center">Avg Purchase Rate</th>
                <th className="px-4 py-5 font-bold text-center">Avg Sale Rate</th>
                <th className="px-4 py-5 font-bold text-center">Avg Unit Profit</th>
                <th className="px-4 py-5 font-bold text-center">Total Profit</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {Array.from(productStats.values()).map((stat, index) => {
                const avgCost = stat.qty > 0 ? stat.cost / stat.qty : 0;
                const avgRevenue = stat.qty > 0 ? stat.revenue / stat.qty : 0;
                const totalProfit = stat.revenue - stat.cost;
                return (
                  <tr key={index} className="border-b border-accent/5 hover:bg-primary/50 transition-colors">
                    <td className="px-4 py-4 font-medium text-center">{stat.name}</td>
                    <td className="px-4 py-4 text-muted text-xs text-center">{formatDate(stat.lastSoldDate)}</td>
                    <td className="px-4 py-4 text-center">{stat.qty}</td>
                    <td className="px-4 py-4 text-center">{formatCurrency(avgCost)}</td>
                    <td className="px-4 py-4 text-center">{formatCurrency(avgRevenue)}</td>
                    <td className="px-4 py-4 text-center text-green-500">{formatCurrency(avgRevenue - avgCost)}</td>
                    <td className="px-4 py-4 text-center font-bold text-green-500">{formatCurrency(totalProfit)}</td>
                  </tr>
                );
              })}
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
