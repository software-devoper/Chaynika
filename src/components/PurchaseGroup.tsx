import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import { Group, Subgroup, Product } from "../types";
import { groupApi, subgroupApi, productApi } from "../lib/api";

export default function PurchaseGroup() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showSubgroupDropdown, setShowSubgroupDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    groupName: "",
    subgroupName: "",
    productName: "",
    stock: 0,
    purchaseRate: 0,
    wholesaleRate: 0,
    mrp: 0,
  });

  useEffect(() => {
    const unsubscribeGroups = groupApi.getAll(setGroups);
    const unsubscribeSubgroups = subgroupApi.getAll(setSubgroups);
    const unsubscribeProducts = productApi.getAll(setProducts);
    return () => {
      unsubscribeGroups();
      unsubscribeSubgroups();
      unsubscribeProducts();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { groupName, subgroupName, productName, stock, purchaseRate, wholesaleRate, mrp } = formData;

    if (!groupName.trim() || !subgroupName.trim() || !productName.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    if (stock <= 0 || purchaseRate <= 0 || wholesaleRate <= 0 || mrp <= 0) {
      toast.error("Stock, Purchase Rate, Wholesale Rate, and MRP must be greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Handle Group
      let group = groups.find(g => g.name.toLowerCase() === groupName.trim().toLowerCase());
      let groupId = group?.id;

      if (!groupId) {
        const groupRef = await groupApi.add(groupName.trim());
        groupId = groupRef?.id;
      }

      if (!groupId) throw new Error("Failed to create group");

      // 2. Handle Subgroup
      let subgroup = subgroups.find(sg => 
        sg.groupId === groupId && 
        sg.name.toLowerCase() === subgroupName.trim().toLowerCase()
      );
      let subgroupId = subgroup?.id;

      if (!subgroupId) {
        const subgroupRef = await subgroupApi.add(groupId, subgroupName.trim());
        subgroupId = subgroupRef?.id;
      }

      if (!subgroupId) throw new Error("Failed to create subgroup");

      // 3. Handle Product
      let existingProduct = products.find(p => 
        p.name.toLowerCase() === productName.trim().toLowerCase() &&
        p.groupId === groupId &&
        p.subgroupId === subgroupId
      );

      if (existingProduct) {
        if (stock < existingProduct.stock) {
          toast.error(`Stock cannot be decreased. Current stock is ${existingProduct.stock}`);
          return;
        }
        if (purchaseRate < existingProduct.purchaseRate) {
          toast.error(`Purchase rate cannot be decreased. Current is ${existingProduct.purchaseRate}`);
          return;
        }
        if (wholesaleRate < existingProduct.wholesaleRate) {
          toast.error(`Wholesale rate cannot be decreased. Current is ${existingProduct.wholesaleRate}`);
          return;
        }
        if (mrp < existingProduct.mrp) {
          toast.error(`MRP cannot be decreased. Current is ${existingProduct.mrp}`);
          return;
        }

        await productApi.update(existingProduct.id, {
          stock,
          purchaseRate,
          wholesaleRate,
          mrp,
          updatedAt: Date.now(),
        });
        toast.success("Product updated successfully");
      } else {
        await productApi.add({
          name: productName.trim(),
          groupId,
          groupName: groupName.trim(),
          subgroupId,
          subgroupName: subgroupName.trim(),
          stock,
          purchaseRate,
          wholesaleRate,
          mrp,
          unit: "Pcs",
          updatedAt: Date.now(),
        });
        toast.success("Product added successfully with Group and Subgroup");
      }

      setFormData({
        groupName: "",
        subgroupName: "",
        productName: "",
        stock: 0,
        purchaseRate: 0,
        wholesaleRate: 0,
        mrp: 0,
      });
    } catch (err: any) {
      console.error("Purchase Error:", err);
      let errorMessage = "Failed to add product";
      
      try {
        const parsedError = JSON.parse(err.message);
        if (parsedError.error) {
          errorMessage = `Error: ${parsedError.error}`;
        }
      } catch {
        if (err.message) errorMessage = err.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ["groupName", "subgroupName", "productName"].includes(name) ? value : (value === "" ? 0 : Number(value))
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-accent mb-4">
        <Plus size={20} />
        <h3 className="text-lg font-bold uppercase tracking-wider">Add New Group & Product</h3>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-muted mb-2">Group / Company Name *</label>
            <input
              required
              type="text"
              name="groupName"
              value={formData.groupName}
              onChange={(e) => {
                handleChange(e);
                setShowGroupDropdown(true);
              }}
              onFocus={() => setShowGroupDropdown(true)}
              onBlur={() => setTimeout(() => setShowGroupDropdown(false), 200)}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
              placeholder="Select or type group name"
              autoComplete="off"
            />
            {showGroupDropdown && formData.groupName && (
              <div className="absolute z-10 w-full mt-1 bg-surface border border-accent/10 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {groups
                  .filter(g => g.name.toLowerCase().includes(formData.groupName.toLowerCase()))
                  .map(g => (
                    <div
                      key={g.id}
                      className="px-4 py-2 hover:bg-primary/50 cursor-pointer text-text"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, groupName: g.name }));
                        setShowGroupDropdown(false);
                      }}
                    >
                      {g.name}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-muted mb-2">Subgroup / Category *</label>
            <input
              required
              type="text"
              name="subgroupName"
              value={formData.subgroupName}
              onChange={(e) => {
                handleChange(e);
                setShowSubgroupDropdown(true);
              }}
              onFocus={() => setShowSubgroupDropdown(true)}
              onBlur={() => setTimeout(() => setShowSubgroupDropdown(false), 200)}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
              placeholder="Select or type subgroup"
              autoComplete="off"
            />
            {showSubgroupDropdown && formData.subgroupName && (
              <div className="absolute z-10 w-full mt-1 bg-surface border border-accent/10 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {subgroups
                  .filter(sg => {
                    const matchesName = sg.name.toLowerCase().includes(formData.subgroupName.toLowerCase());
                    if (!formData.groupName) return matchesName;
                    const group = groups.find(g => g.name.toLowerCase() === formData.groupName.toLowerCase());
                    return group ? (sg.groupId === group.id && matchesName) : matchesName;
                  })
                  .map(sg => (
                    <div
                      key={sg.id}
                      className="px-4 py-2 hover:bg-primary/50 cursor-pointer text-text"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, subgroupName: sg.name }));
                        setShowSubgroupDropdown(false);
                      }}
                    >
                      {sg.name}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-muted mb-2">Product Name *</label>
            <input
              required
              type="text"
              name="productName"
              value={formData.productName}
              onChange={(e) => {
                handleChange(e);
                setShowProductDropdown(true);
              }}
              onFocus={() => setShowProductDropdown(true)}
              onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
              placeholder="Select or type product name"
              autoComplete="off"
            />
            {showProductDropdown && formData.productName && (
              <div className="absolute z-10 w-full mt-1 bg-surface border border-accent/10 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {products
                  .filter(p => {
                    const matchesName = p.name.toLowerCase().includes(formData.productName.toLowerCase());
                    if (!formData.subgroupName) return matchesName;
                    return p.subgroupName?.toLowerCase() === formData.subgroupName.toLowerCase() && matchesName;
                  })
                  .map(p => (
                    <div
                      key={p.id}
                      className="px-4 py-2 hover:bg-primary/50 cursor-pointer text-text"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, productName: p.name }));
                        setShowProductDropdown(false);
                      }}
                    >
                      {p.name}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Stock Quantity</label>
            <input
              type="number"
              min="0"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">Purchase Rate</label>
            <input
              type="number"
              min="0"
              name="purchaseRate"
              value={formData.purchaseRate}
              onChange={handleChange}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">Wholesale Rate</label>
            <input
              type="number"
              min="0"
              name="wholesaleRate"
              value={formData.wholesaleRate}
              onChange={handleChange}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">MRP</label>
            <input
              type="number"
              min="0"
              name="mrp"
              value={formData.mrp}
              onChange={handleChange}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            />
          </div>
        </div>

        <div className="md:col-span-2 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-accent text-primary font-bold px-12 py-3 rounded-xl hover:opacity-90 transition-all w-full md:w-auto flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
