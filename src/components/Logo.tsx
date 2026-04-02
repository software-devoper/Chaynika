import React from "react";
import { cn } from "../lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function Logo({ className, size = 48, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div 
        className="relative flex items-center justify-center rounded-full bg-white shadow-lg overflow-hidden border border-accent/10"
        style={{ width: size, height: size }}
      >
        {/* Circular Border with Text */}
        <svg 
          viewBox="0 0 100 100" 
          className="absolute inset-0 w-full h-full animate-spin-slow"
          style={{ animationDuration: '20s' }}
        >
          <path
            id="circlePath"
            d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
            fill="none"
          />
          <text className="text-[8px] font-bold fill-accent uppercase tracking-[0.2em]">
            <textPath xlinkHref="#circlePath" startOffset="0%">
              Chayanika • Purchase With Discount •
            </textPath>
          </text>
        </svg>

        {/* Central Icon (Red Square with Stylized C) */}
        <div className="relative z-10 w-[60%] h-[60%] bg-gradient-to-br from-[#B91C1C] via-[#8B1D2E] to-[#450A0A] rounded-xl flex items-center justify-center shadow-2xl overflow-hidden border border-white/20 group">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-accent/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          {/* Inner shadow effect */}
          <div className="absolute inset-0 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] pointer-events-none"></div>

          <svg viewBox="0 0 100 100" className="w-[75%] h-[75%] drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)] transform group-hover:scale-110 transition-transform duration-500">
            {/* Layered 'C' Logo Mark - Base */}
            <path 
              fill="white" 
              d="M82,35 L70,45 C66,38 59,34 50,34 C41,34 34,41 34,50 C34,59 41,66 50,66 C59,66 66,62 70,55 L82,65 C75,77 64,84 50,84 C31,84 16,69 16,50 C16,31 31,16 50,16 C64,16 75,23 82,35 Z" 
            />
            {/* Sharp accent tips */}
            <path 
              fill="#F59E0B" 
              d="M82,35 L76,30 L85,25 Z M82,65 L76,70 L85,75 Z"
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />
            {/* Glassy overlay for the C */}
            <path 
              fill="rgba(255,255,255,0.3)" 
              d="M50,20 C33,20 20,33 20,50 C20,67 33,80 50,80 C60,80 68,75 74,68 L68,62 C64,66 58,69 50,69 C40,69 31,60 31,50 C31,40 40,31 50,31 C58,31 64,34 68,38 L74,32 C68,25 60,20 50,20 Z" 
            />
          </svg>
          
          {/* Dynamic light sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
        </div>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-display font-bold text-accent leading-none tracking-tight">Chayanika</span>
          <span className="text-[10px] text-muted font-medium uppercase tracking-widest mt-1">Kalindi</span>
        </div>
      )}
    </div>
  );
}
