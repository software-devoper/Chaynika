import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Group, Product } from "../types";
import { groupApi, productApi } from "../lib/api";

export default function PurchaseAdd() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    groupId: "",
    stock: 0,
    purchaseRate: 0,
    mrp: 0,
  });

  useEffect(() => {
    const unsubscribe = groupApi.getAll(setGroups);
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.groupId) {
      toast.error("Please fill all required fields");
      return;
    }
    
    const selectedGroup = groups.find((g) => g.id === formData.groupId);

    try {
      await productApi.add({
        name: formData.name,
        groupId: formData.groupId,
        groupName: selectedGroup?.name || "",
        purchaseRate: formData.purchaseRate,
        mrp: formData.mrp,
        stock: formData.stock,
        unit: "Pcs", // Default unit
        updatedAt: Date.now(),
      });

      toast.success("Product added to stock");
      setFormData({
        name: "",
        groupId: "",
        stock: 0,
        purchaseRate: 0,
        mrp: 0,
      });
    } catch (err) {
      toast.error("Failed to add product");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "name" || name === "groupId" ? value : Number(value),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-muted mb-2">Product Name *</label>
        <input
          required
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
          placeholder="Enter product name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted mb-2">Group *</label>
        <select
          required
          name="groupId"
          value={formData.groupId}
          onChange={handleChange}
          className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all appearance-none"
        >
          <option value="">Select Group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted mb-2">Stock Quantity</label>
        <input
          name="stock"
          type="number"
          value={formData.stock}
          onChange={handleChange}
          className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted mb-2">Purchase Rate (Cost Price)</label>
        <input
          name="purchaseRate"
          type="number"
          value={formData.purchaseRate}
          onChange={handleChange}
          className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted mb-2">MRP</label>
        <input
          name="mrp"
          type="number"
          value={formData.mrp}
          onChange={handleChange}
          className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
        />
      </div>

      <div className="md:col-span-2 pt-4">
        <button
          type="submit"
          className="bg-accent text-primary font-bold px-12 py-3 rounded-xl hover:opacity-90 transition-all"
        >
          Submit
        </button>
      </div>
    </form>
  );
}
