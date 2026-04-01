import React, { useState, useEffect } from "react";
import { Package, CircleDollarSign, ReceiptText, Hourglass, TrendingUp, ShoppingBag, CreditCard } from "lucide-react";
import StockViewPanel from "./StockViewPanel";
import { formatCurrency } from "../lib/utils";
import { billApi, productApi, dueApi } from "../lib/api";
import { Bill, Product, CustomerDue } from "../types";

interface NavButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

const NavButton = ({ icon: Icon, label, onClick }: NavButtonProps) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-4 p-8 bg-surface border border-accent/10 rounded-2xl hover:border-accent transition-all duration-300 group shadow-lg"
  >
    <div className="text-accent group-hover:scale-110 transition-transform duration-300">
      <Icon size={48} />
    </div>
    <span className="text-xl font-display font-bold text-text group-hover:text-accent transition-colors">
      {label}
    </span>
  </button>
);

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ setActiveTab }: DashboardProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dues, setDues] = useState<CustomerDue[]>([]);

  useEffect(() => {
    const unsubBills = billApi.getAll(setBills);
    const unsubProducts = productApi.getAll(setProducts);
    const unsubDues = dueApi.getAll(setDues);
    return () => {
      unsubBills();
      unsubProducts();
      unsubDues();
    };
  }, []);

  const totalRevenue = bills.reduce((sum, b) => sum + b.grandTotal, 0);
  const totalDues = dues.reduce((sum, d) => sum + d.amount, 0);
  const lowStockCount = products.filter(p => p.stock <= 5).length;
  const todaySales = bills.filter(b => {
    const today = new Date();
    const billDate = new Date(b.date);
    return today.toDateString() === billDate.toDateString();
  }).reduce((sum, b) => sum + b.grandTotal, 0);

  const stats = [
    { label: "Today's Sales", value: formatCurrency(todaySales), icon: TrendingUp, color: "text-accent" },
    { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: ShoppingBag, color: "text-green-500" },
    { label: "Total Dues", value: formatCurrency(totalDues), icon: CreditCard, color: "text-red-500" },
    { label: "Low Stock Items", value: lowStockCount.toString(), icon: Package, color: "text-yellow-500" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-surface border border-accent/10 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-primary/50 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className="text-muted text-sm mb-1">{stat.label}</div>
            <div className="text-2xl font-display font-bold text-text">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <NavButton 
          icon={Package} 
          label="Purchase" 
          onClick={() => setActiveTab("purchase")} 
        />
        <NavButton 
          icon={CircleDollarSign} 
          label="Revenue" 
          onClick={() => setActiveTab("revenue")} 
        />
        <NavButton 
          icon={ReceiptText} 
          label="New Bill" 
          onClick={() => setActiveTab("bill")} 
        />
        <NavButton 
          icon={Hourglass} 
          label="Due" 
          onClick={() => setActiveTab("due")} 
        />
      </div>

      <div className="bg-surface border border-accent/10 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-display font-bold text-accent">Stock View Panel</h3>
          <div className="text-muted text-sm">Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
        <StockViewPanel />
      </div>
    </div>
  );
}
