import React, { useState, useEffect } from "react";
import { Phone, Menu, ArrowLeft } from "lucide-react";
import Logo from "./Logo";
import { settingsApi } from "../lib/api";

interface NavbarProps {
  onMenuClick: () => void;
  activeTab: string;
  onBack: () => void;
}

export default function Navbar({ onMenuClick, activeTab, onBack }: NavbarProps) {
  const [businessInfo, setBusinessInfo] = useState({
    phone: "9832116317",
    address: "Kalindi, Purba Medinipur, 721455"
  });

  useEffect(() => {
    const fetchInfo = async () => {
      const info = await settingsApi.getBusinessInfo();
      if (info) {
        setBusinessInfo({
          phone: info.phone || "9832116317",
          address: info.address || "Kalindi, Purba Medinipur, 721455"
        });
      }
    };
    fetchInfo();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-primary border-b border-accent/20 flex items-center justify-between px-4 md:px-6 z-50">
      <div className="flex items-center gap-4">
        {activeTab !== "dashboard" ? (
          <button 
            onClick={onBack} 
            className="p-2 text-accent hover:bg-accent/10 rounded-full transition-all flex items-center gap-2 group lg:hidden"
            title="Back to Dashboard"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline font-bold">Back</span>
          </button>
        ) : (
          <button onClick={onMenuClick} className="p-2 text-muted hover:text-accent transition-colors lg:hidden">
            <Menu size={24} />
          </button>
        )}
        <Logo size={40} />
      </div>
      <div className="flex flex-col items-end justify-center md:flex-row md:items-center md:gap-6">
        <div className="text-[10px] sm:text-xs md:text-sm text-muted font-medium order-2 md:order-1 mt-0.5 md:mt-0">
          {businessInfo.address}
        </div>
        <div className="flex items-center gap-1.5 text-accent order-1 md:order-2">
          <Phone size={16} />
          <span className="font-bold text-sm md:text-base tracking-wide">{businessInfo.phone}</span>
        </div>
      </div>
    </nav>
  );
}
