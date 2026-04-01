import React, { useState } from "react";
import PurchaseGroup from "./PurchaseGroup";
import PurchaseAdd from "./PurchaseAdd";
import PurchaseEdit from "./PurchaseEdit";
import { cn } from "../lib/utils";

export default function Purchase() {
  const [activeSubTab, setActiveSubTab] = useState("group");

  const tabs = [
    { id: "group", label: "Group" },
    { id: "add", label: "Add" },
    { id: "edit", label: "Edit" },
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
        {activeSubTab === "group" && <PurchaseGroup />}
        {activeSubTab === "add" && <PurchaseAdd />}
        {activeSubTab === "edit" && <PurchaseEdit />}
      </div>
    </div>
  );
}
