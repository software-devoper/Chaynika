import React, { useState } from "react";
import { 
  LayoutDashboard, 
  Package, 
  CircleDollarSign, 
  ReceiptText, 
  Hourglass, 
  User, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu
} from "lucide-react";
import Logo from "./Logo";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

interface SidebarItemProps {
  key?: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ icon, label, active, collapsed, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-accent text-primary font-medium" 
        : "text-muted hover:bg-surface hover:text-text"
    )}
  >
    <div className={cn("flex-shrink-0", active ? "text-primary" : "group-hover:text-accent")}>
      {icon}
    </div>
    {!collapsed && (
      <span className="whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
    )}
  </button>
);

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed, onLogout }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "purchase", label: "Purchase", icon: <Package size={20} /> },
    { id: "bill", label: "Sales", icon: <ReceiptText size={20} /> },
    { id: "due", label: "Dues", icon: <Hourglass size={20} /> },
    { id: "revenue", label: "Revenue", icon: <CircleDollarSign size={20} /> },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 220 }}
      className="fixed left-0 top-16 bottom-0 bg-primary border-r border-accent/10 flex flex-col z-50 lg:top-16"
    >
      <div className="p-4 flex items-center justify-between">
        {!collapsed && <Logo size={32} showText={false} />}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-surface text-muted hover:text-accent"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeTab === item.id}
            collapsed={collapsed}
            onClick={() => setActiveTab(item.id)}
          />
        ))}
      </div>

      <div className="px-3 py-4 border-t border-accent/10 space-y-1">
        <SidebarItem
          icon={<User size={20} />}
          label="Profile"
          collapsed={collapsed}
          onClick={() => setActiveTab("profile")}
          active={activeTab === "profile"}
        />
        <SidebarItem
          icon={<LogOut size={20} />}
          label="Logout"
          collapsed={collapsed}
          onClick={onLogout}
        />
      </div>
    </motion.aside>
  );
}
