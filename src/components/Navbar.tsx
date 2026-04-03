import React from "react";
import { Phone, Menu } from "lucide-react";
import Logo from "./Logo";

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-primary border-b border-accent/20 flex items-center justify-between px-4 md:px-6 z-50">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden p-2 text-muted hover:text-accent">
          <Menu size={24} />
        </button>
        <Logo size={40} />
      </div>
      <div className="flex items-center gap-6 text-muted text-sm">
        <div className="hidden md:block">Kalindi, Purba Medinipur, 721455</div>
        <div className="flex items-center gap-2 text-accent">
          <Phone size={16} />
          <span className="font-medium">9832116317</span>
        </div>
      </div>
    </nav>
  );
}
