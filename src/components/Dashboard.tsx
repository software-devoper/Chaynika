import React, { useState, useEffect } from "react";
import { Package, CircleDollarSign, ReceiptText, Hourglass, TrendingUp, ShoppingBag, CreditCard, Bot } from "lucide-react";
import { motion } from "motion/react";
import StockViewPanel from "./StockViewPanel";
import { formatCurrency, formatDate } from "../lib/utils";
import { billApi, productApi, dueApi, cashSaleApi } from "../lib/api";
import { Bill, Product, CustomerDue, CashSale } from "../types";

interface NavButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  delay?: number;
}

const NavButton = ({ icon: Icon, label, onClick, delay = 0 }: NavButtonProps) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4 }}
    whileTap={{ scale: 0.95 }}
    transition={{ duration: 0.4, delay }}
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-4 p-8 bg-surface border border-accent/10 rounded-2xl hover:border-accent transition-all duration-300 group shadow-lg"
  >
    <div className="text-accent group-hover:scale-110 transition-transform duration-300">
      <Icon size={48} />
    </div>
    <span className="text-xl font-display font-bold text-text group-hover:text-accent transition-colors">
      {label}
    </span>
  </motion.button>
);

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ setActiveTab }: DashboardProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dues, setDues] = useState<CustomerDue[]>([]);
  const [cashSales, setCashSales] = useState<CashSale[]>([]);

  useEffect(() => {
    const unsubBills = billApi.getAll(setBills);
    const unsubProducts = productApi.getAll(setProducts);
    const unsubDues = dueApi.getAll(setDues);
    const unsubCash = cashSaleApi.getAll(setCashSales);
    return () => {
      unsubBills();
      unsubProducts();
      unsubDues();
      unsubCash();
    };
  }, []);

  const totalCreditRevenue = bills.reduce((sum, b) => sum + (b.grandTotal - (b.previousDue || 0)), 0);
  const totalCashRevenue = cashSales.reduce((sum, s) => sum + s.amount, 0);
  const totalRevenue = totalCreditRevenue + totalCashRevenue;
  const totalDues = dues.reduce((sum, d) => sum + d.amount, 0);
  const totalStockQuantity = products.reduce((sum, p) => sum + p.stock, 0);
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.purchaseRate), 0);
  
  const today = new Date().toDateString();
  const todayCreditSales = bills.filter(b => new Date(b.date).toDateString() === today).reduce((sum, b) => sum + (b.grandTotal - (b.previousDue || 0)), 0);
  const todayCashSales = cashSales.filter(s => new Date(s.date).toDateString() === today).reduce((sum, s) => sum + s.amount, 0);
  const todaySales = todayCreditSales + todayCashSales;

  const firstSaleDate = bills.length > 0 || cashSales.length > 0 
    ? Math.min(...[...bills.map(b => b.date), ...cashSales.map(s => s.date)]) 
    : null;

  const stats = [
    { 
      label: "Today's Sales", 
      value: formatCurrency(todaySales), 
      icon: TrendingUp, 
      color: "text-accent",
      subtext: `Cash: ${formatCurrency(todayCashSales)} | Credit: ${formatCurrency(todayCreditSales)}`,
      action: { label: "View previous sales", onClick: () => setActiveTab("revenue") }
    },
    { 
      label: "Total Revenue", 
      value: formatCurrency(totalRevenue), 
      icon: ShoppingBag, 
      color: "text-green-500",
      subtext: firstSaleDate ? `Since ${formatDate(firstSaleDate)}` : "All Time"
    },
    { label: "Total Dues", value: formatCurrency(totalDues), icon: CreditCard, color: "text-red-500" },
    { label: `Current Stock (${totalStockQuantity})`, value: formatCurrency(totalStockValue), icon: Package, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div 
            key={index} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="bg-surface border border-accent/10 rounded-2xl p-6 shadow-lg flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-primary/50 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className="text-muted text-sm mb-1">{stat.label}</div>
            <div className="text-2xl font-display font-bold text-text">{stat.value}</div>
            {stat.subtext && <div className="text-xs text-muted mt-1">{stat.subtext}</div>}
            {stat.action && (
              <button 
                onClick={stat.action.onClick}
                className="mt-4 w-full py-2 text-sm font-medium bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
              >
                {stat.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        <NavButton 
          icon={Package} 
          label="Purchase" 
          onClick={() => setActiveTab("purchase")} 
          delay={0.1}
        />
        <NavButton 
          icon={ReceiptText} 
          label="Sales" 
          onClick={() => setActiveTab("bill")} 
          delay={0.2}
        />
        <NavButton 
          icon={Hourglass} 
          label="Dues" 
          onClick={() => setActiveTab("due")} 
          delay={0.3}
        />
        <NavButton 
          icon={CircleDollarSign} 
          label="Revenue" 
          onClick={() => setActiveTab("revenue")} 
          delay={0.4}
        />
        <NavButton 
          icon={Bot} 
          label="Ask AI" 
          onClick={() => setActiveTab("askai")} 
          delay={0.5}
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="bg-surface border border-accent/10 rounded-2xl p-4 sm:p-6 shadow-xl"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
          <h3 className="text-xl font-display font-bold text-accent">Stock View Panel</h3>
          <div className="text-muted text-sm">Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
        <StockViewPanel />
      </motion.div>
    </div>
  );
}
