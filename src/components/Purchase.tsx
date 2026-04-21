import React from "react";
import PurchaseGroup from "./PurchaseGroup";

export default function Purchase() {
  return (
    <div className="space-y-6">
      <div className="bg-surface border border-accent/10 rounded-2xl p-6 shadow-xl min-h-[400px]">
        <PurchaseGroup />
      </div>
    </div>
  );
}
