import React, { useState, useEffect } from "react";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { Group, Product } from "../types";
import { groupApi, productApi, partyDueApi } from "../lib/api";
import { motion, AnimatePresence } from "motion/react";
import { formatCurrency, capitalizeFirstLetter } from "../lib/utils";

interface PurchaseItem {
  rowId: string;
  productId?: string;
  productName: string;
  quantity: number | "";
  currentStock: number;
  purchaseRate: number | "";
  wholesaleRate: number | "";
  mrp: number | "";
  isNew: boolean;
}

export default function PurchaseGroup() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [activeDropdownRowId, setActiveDropdownRowId] = useState<string | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [payableAmount, setPayableAmount] = useState<number | "">("");
  
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);

  useEffect(() => {
    const unsubscribeGroups = groupApi.getAll(setGroups);
    const unsubscribeProducts = productApi.getAll(setProducts);
    return () => {
      unsubscribeGroups();
      unsubscribeProducts();
    };
  }, []);

  const handlePartySelect = (group: Group) => {
    setPartyName(group.name);
    setShowGroupDropdown(false);
    setActiveSuggestionIndex(-1);
    
    if (purchaseItems.length === 0) {
      setPurchaseItems([createNewEmptyRow()]);
    }
  };

  const createNewEmptyRow = (): PurchaseItem => ({
    rowId: Math.random().toString(36).substring(7),
    productName: "",
    quantity: "",
    currentStock: 0,
    purchaseRate: "",
    wholesaleRate: "",
    mrp: "",
    isNew: true,
  });

  const addRow = () => {
    setPurchaseItems([...purchaseItems, createNewEmptyRow()]);
  };

  const removeRow = (rowId: string) => {
    setPurchaseItems(purchaseItems.filter(item => item.rowId !== rowId));
  };

  const updateRow = (rowId: string, field: keyof PurchaseItem, value: any) => {
    setPurchaseItems(purchaseItems.map(item => 
      item.rowId === rowId ? { ...item, [field]: value } : item
    ));
  };

  const totalPurchaseAmount = purchaseItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.purchaseRate) || 0;
    return sum + (qty * rate);
  }, 0);

  const purchaseDue = Math.max(0, totalPurchaseAmount - (Number(payableAmount) || 0));

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(partyName.toLowerCase()));

  const handlePartyKeyDown = (e: React.KeyboardEvent) => {
    if (!showGroupDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev < filteredGroups.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < filteredGroups.length) {
        handlePartySelect(filteredGroups[activeSuggestionIndex]);
      } else if (filteredGroups.length > 0) {
        handlePartySelect(filteredGroups[0]);
      }
    }
  };

  const handleProductSelect = (item: PurchaseItem, p: Product) => {
    const updatedItems = purchaseItems.map(pi => 
      pi.rowId === item.rowId ? {
        ...pi,
        productId: p.id,
        productName: p.name,
        currentStock: p.stock,
        purchaseRate: "",
        wholesaleRate: "",
        mrp: "",
        isNew: false
      } : pi
    );
    setPurchaseItems(updatedItems);
    setActiveDropdownRowId(null);
    setActiveSuggestionIndex(-1);
  };

  const handleProductKeyDown = (e: React.KeyboardEvent, item: PurchaseItem, filteredProducts: Product[]) => {
    if (activeDropdownRowId === item.rowId && filteredProducts.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : prev));
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < filteredProducts.length) {
          handleProductSelect(item, filteredProducts[activeSuggestionIndex]);
        } else {
          handleProductSelect(item, filteredProducts[0]);
        }
        return;
      }
    }
    
    // If not interacting with dropdown, handle row enter
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!item.productName.trim() || !item.quantity || Number(item.quantity) <= 0) {
        toast.error("Please fill product name and quantity before adding a new row.");
        return;
      }
      addRow();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!partyName.trim()) {
      toast.error("Please enter a Party Name");
      return;
    }

    // Filter items that have a name and either have quantity > 0 or are modified existing products
    const itemsToProcess = purchaseItems.filter(item => {
      if (!item.productName.trim()) return false;
      
      const qty = Number(item.quantity) || 0;
      if (item.isNew && qty > 0) return true;
      
      if (!item.isNew && item.productId) {
        const original = products.find(p => p.id === item.productId);
        if (!original) return false;
        
        const pRate = item.purchaseRate === "" ? original.purchaseRate : Number(item.purchaseRate);
        const wRate = item.wholesaleRate === "" ? original.wholesaleRate : Number(item.wholesaleRate);
        const mRate = item.mrp === "" ? original.mrp : Number(item.mrp);
        
        // Process if quantity added OR rates changed
        if (qty > 0 || pRate !== original.purchaseRate || wRate !== original.wholesaleRate || mRate !== original.mrp) {
          return true;
        }
      }
      return false;
    });

    if (itemsToProcess.length === 0) {
      toast.error("No valid products to add or update. Enter quantity > 0 or update rates.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Handle Party
      let group = groups.find(g => g.name.toLowerCase() === partyName.trim().toLowerCase());
      let groupId = group?.id;

      if (!groupId) {
        const groupRef = await groupApi.add(partyName.trim());
        groupId = groupRef?.id;
      }

      if (!groupId) throw new Error("Failed to create party");

      // 2. Process Products
      for (const item of itemsToProcess) {
        const qty = Number(item.quantity) || 0;
        const original = products.find(p => p.id === item.productId);
        
        const pRate = item.purchaseRate === "" ? (original ? original.purchaseRate : 0) : Number(item.purchaseRate);
        const wRate = item.wholesaleRate === "" ? (original ? original.wholesaleRate : 0) : Number(item.wholesaleRate);
        const mRate = item.mrp === "" ? (original ? original.mrp : 0) : Number(item.mrp);

        if (item.isNew || !item.productId) {
          // Check if product with same name already exists for this party
          const existing = products.find(p => p.groupId === groupId && p.name.toLowerCase() === item.productName.trim().toLowerCase());
          if (existing) {
            await productApi.update(existing.id, {
              stock: existing.stock + qty,
              purchaseRate: pRate,
              wholesaleRate: wRate,
              mrp: mRate,
              updatedAt: Date.now(),
            });
          } else {
            await productApi.add({
              name: item.productName.trim(),
              groupId,
              groupName: partyName.trim(),
              subgroupId: "",
              subgroupName: "",
              stock: qty,
              purchaseRate: pRate,
              wholesaleRate: wRate,
              mrp: mRate,
              unit: "Pcs",
              updatedAt: Date.now(),
            });
          }
        } else {
          // Update existing product
          const original = products.find(p => p.id === item.productId);
          if (original) {
            await productApi.update(original.id, {
              stock: original.stock + qty,
              purchaseRate: pRate,
              wholesaleRate: wRate,
              mrp: mRate,
              updatedAt: Date.now(),
            });
          }
        }
      }

      // 3. Handle Party Due
      const dueChange = totalPurchaseAmount - (Number(payableAmount) || 0);
      if (dueChange !== 0) {
        const productNamesStr = itemsToProcess.map(item => item.productName.trim()).join(", ");
        await partyDueApi.addOrUpdate(partyName.trim(), dueChange, productNamesStr);
      }

      toast.success("Products saved successfully");
      window.alert("Purchase saved successfully!");
      
      // Reset or refresh
      setPartyName("");
      setPurchaseItems([]);
      setPayableAmount("");
    } catch (err: any) {
      console.error("Purchase Error:", err);
      toast.error(err.message || "Failed to save products");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Left Panel: Party Details */}
      <div className="lg:col-span-1 space-y-6">
        <h4 className="text-lg font-bold text-accent border-b border-accent/10 pb-2">Party Details</h4>
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-muted mb-2">Party Name *</label>
            <input
              required
              type="text"
              value={partyName}
              onChange={(e) => {
                setPartyName(capitalizeFirstLetter(e.target.value));
                setShowGroupDropdown(true);
                setActiveSuggestionIndex(-1);
              }}
              onFocus={() => setShowGroupDropdown(true)}
              onBlur={() => setTimeout(() => setShowGroupDropdown(false), 200)}
              onKeyDown={handlePartyKeyDown}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
              placeholder="Select or type party name"
              autoComplete="off"
            />
            {showGroupDropdown && partyName && (
              <div className="absolute z-10 w-full mt-1 bg-surface border border-accent/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                {filteredGroups.map((g, idx) => (
                    <div
                      key={g.id}
                      className={`px-4 py-3 cursor-pointer text-text border-b border-accent/5 last:border-0 ${
                        idx === activeSuggestionIndex ? 'bg-accent/10' : 'hover:bg-primary'
                      }`}
                      onClick={() => handlePartySelect(g)}
                    >
                      {g.name}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Party Products Summary */}
        {partyName && groups.find(g => g.name.toLowerCase() === partyName.toLowerCase()) && (
          <div className="mt-6 border-t border-accent/10 pt-6">
            <h5 className="text-sm font-bold text-accent mb-3">Party's Existing Products</h5>
            <div className="bg-primary/30 rounded-xl border border-accent/10 overflow-hidden">
              <div className="w-full">
                <table className="w-full text-center text-xs">
                  <thead className="bg-primary/50 sticky top-0">
                    <tr className="text-muted uppercase tracking-wider">
                      <th className="px-3 py-2 font-medium text-center">Product</th>
                      <th className="px-3 py-2 font-medium text-center">Stock</th>
                      <th className="px-3 py-2 font-medium text-center">P.Rate</th>
                      <th className="px-3 py-2 font-medium text-center">W.Rate</th>
                      <th className="px-3 py-2 font-medium text-center">MRP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-accent/5">
                    {products
                      .filter(p => p.groupName.toLowerCase() === partyName.toLowerCase())
                      .map(p => (
                        <tr key={p.id} className="hover:bg-primary/50">
                          <td className="px-3 py-2 font-medium text-text text-center">{p.name}</td>
                          <td className="px-3 py-2 text-center text-accent font-bold">{p.stock}</td>
                          <td className="px-3 py-2 text-center text-muted">{p.purchaseRate}</td>
                          <td className="px-3 py-2 text-center text-muted">{p.wholesaleRate}</td>
                          <td className="px-3 py-2 text-center text-muted">{p.mrp}</td>
                        </tr>
                      ))}
                    {products.filter(p => p.groupName.toLowerCase() === partyName.toLowerCase()).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-muted italic">
                          No products found for this party.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Products Table */}
      <div className="lg:col-span-3 space-y-6">
        <div className="flex justify-between items-center border-b border-accent/10 pb-2">
          <h4 className="text-lg font-bold text-accent">Products</h4>
          <button
            type="button"
            onClick={addRow}
            className="text-sm flex items-center gap-1.5 bg-accent/10 text-accent px-4 py-2 rounded-lg hover:bg-accent/20 transition-all font-bold"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>

        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0 pb-48">
          <table className="w-full text-center border-collapse whitespace-nowrap md:whitespace-normal">
            <thead>
              <tr className="border-b border-accent/10 text-muted text-xs uppercase tracking-wider">
                <th className="px-2 py-3 font-medium text-center">Product Name</th>
                <th className="px-2 py-3 font-medium text-center">Quantity</th>
                <th className="px-2 py-3 font-medium text-center">Purchase Rate</th>
                <th className="px-2 py-3 font-medium text-center">Wholesale Rate</th>
                <th className="px-2 py-3 font-medium text-center">MRP</th>
                <th className="px-2 py-3 font-medium text-center"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <AnimatePresence mode="popLayout">
                {purchaseItems.map((item, index) => {
                  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(item.productName.toLowerCase()));
                  return (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={item.rowId} 
                    className="border-b border-accent/5 group"
                  >
                    <td className="px-2 py-3 relative text-center">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => {
                          updateRow(item.rowId, "productName", capitalizeFirstLetter(e.target.value));
                          setActiveDropdownRowId(item.rowId);
                          setActiveSuggestionIndex(-1);
                        }}
                        onFocus={() => {
                          setActiveDropdownRowId(item.rowId);
                          setActiveSuggestionIndex(-1);
                        }}
                        onBlur={() => setTimeout(() => setActiveDropdownRowId(null), 200)}
                        onKeyDown={(e) => handleProductKeyDown(e, item, filteredProducts)}
                        placeholder="Product Name"
                        className="w-full min-w-[150px] bg-primary border border-accent/10 rounded px-3 py-2 text-text outline-none focus:border-accent"
                        disabled={!item.isNew}
                      />
                      {activeDropdownRowId === item.rowId && item.productName && item.isNew && (
                        <div className="absolute z-50 w-full mt-1 bg-surface border border-accent/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto left-0">
                          {filteredProducts.map((p, idx) => (
                              <div
                                key={p.id}
                                className={`px-4 py-2 cursor-pointer text-text border-b border-accent/5 last:border-0 ${
                                  idx === activeSuggestionIndex ? 'bg-accent/10' : 'hover:bg-primary'
                                }`}
                                onClick={() => handleProductSelect(item, p)}
                              >
                                <div className="font-medium">{p.name}</div>
                                <div className="text-[10px] text-muted">Party: {p.groupName}</div>
                              </div>
                            ))}
                        </div>
                      )}
                      {!item.isNew && (
                        <div className="text-[10px] text-muted mt-1">Current Stock: {item.currentStock}</div>
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateRow(item.rowId, "quantity", e.target.value)}
                        onKeyDown={(e) => handleProductKeyDown(e, item, filteredProducts)}
                        placeholder="0"
                        className="w-20 mx-auto block bg-primary border border-accent/10 rounded px-2 py-2 text-center outline-none focus:border-accent"
                      />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.purchaseRate}
                        onChange={(e) => updateRow(item.rowId, "purchaseRate", e.target.value)}
                        onKeyDown={(e) => handleProductKeyDown(e, item, filteredProducts)}
                        placeholder="0"
                        className="w-24 mx-auto block bg-primary border border-accent/10 rounded px-2 py-2 text-center outline-none focus:border-accent"
                      />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.wholesaleRate}
                        onChange={(e) => updateRow(item.rowId, "wholesaleRate", e.target.value)}
                        onKeyDown={(e) => handleProductKeyDown(e, item, filteredProducts)}
                        placeholder="0"
                        className="w-24 mx-auto block bg-primary border border-accent/10 rounded px-2 py-2 text-center outline-none focus:border-accent"
                      />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.mrp}
                        onChange={(e) => updateRow(item.rowId, "mrp", e.target.value)}
                        onKeyDown={(e) => handleProductKeyDown(e, item, filteredProducts)}
                        placeholder="0"
                        className="w-24 mx-auto block bg-primary border border-accent/10 rounded px-2 py-2 text-center outline-none focus:border-accent"
                      />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <button 
                        type="button"
                        onClick={() => removeRow(item.rowId)} 
                        className="text-muted hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10 mx-auto block"
                      >
                        <Trash2 size={16} className="mx-auto" />
                      </button>
                    </td>
                  </motion.tr>
                  );
                })}
              </AnimatePresence>
              {purchaseItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-muted italic">
                    No products added. Select a party or add a product.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-end gap-4 border-t border-accent/10 pt-6 mt-6">
          <div className="space-y-2 text-right w-full md:max-w-xs">
            <div className="flex justify-between text-muted">
              <span>Total Purchase Amount:</span>
              <span className="font-medium text-text">{formatCurrency(totalPurchaseAmount)}</span>
            </div>
            <div className="flex justify-between items-center gap-4 text-muted">
              <span>Payable Amount:</span>
              <input
                type="number"
                min="0"
                value={payableAmount}
                onChange={(e) => setPayableAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-24 bg-primary border border-accent/10 rounded px-2 py-1 text-right outline-none focus:border-accent"
                placeholder="0"
              />
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-accent/10">
              <span>Purchase Due:</span>
              <span className="text-red-500">{formatCurrency(purchaseDue)}</span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={isSubmitting || purchaseItems.length === 0}
            className="bg-accent text-primary font-bold px-12 py-3 rounded-xl hover:opacity-90 transition-all w-full md:w-auto flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-accent/20 mt-4"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {isSubmitting ? "Saving..." : "Save Purchase"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
