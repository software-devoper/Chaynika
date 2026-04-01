import React, { useState } from "react";
import BillForm from "./BillForm";
import BillHistory from "./BillHistory";
import { cn } from "../lib/utils";

export default function Bill() {
  const [activeSubTab, setActiveSubTab] = useState("create");

  const tabs = [
    { id: "create", label: "Create Bill" },
    { id: "history", label: "Bill History" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-surface border border-accent/10 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              "px-6 py-2 rounded-lg font-medium transition-all duration-200",
              activeSubTab === tab.id
                ? "bg-accent text-primary"
                : "text-muted hover:text-text hover:bg-primary/50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-accent/10 rounded-2xl p-6 shadow-xl min-h-[400px]">
        {activeSubTab === "create" && <BillForm />}
        {activeSubTab === "history" && <BillHistory />}
      </div>
    </div>
  );
}
