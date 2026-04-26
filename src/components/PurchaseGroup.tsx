import React, { useState, useEffect, useRef } from "react";
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

  unit: string;
  hasSecondaryUnit: boolean;
  secondaryUnit: string;
  conversionRate: number | "";
  selectedUnitType: "primary" | "secondary";

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
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [activeDropdownRowId, setActiveDropdownRowId] = useState<string | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [payableAmount, setPayableAmount] = useState<number | "">("");
  
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [focusNewRow, setFocusNewRow] = useState(false);
  const nameInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("purchase_draft");
    if (savedDraft) {
      try {
        const { partyName: savedParty, items: savedItems, payable: savedPayable } = JSON.parse(savedDraft);
        if (savedParty) setPartyName(savedParty);
        if (savedItems && savedItems.length > 0) setPurchaseItems(savedItems);
        if (savedPayable !== undefined) setPayableAmount(savedPayable);
        toast.success("Draft loaded successfully");
      } catch (e) {
        console.error("Failed to load purchase draft", e);
      }
    }
  }, []);

  useEffect(() => {
    if (showGroupDropdown && activeSuggestionIndex >= 0) {
      const el = document.getElementById(`party-suggestion-${activeSuggestionIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeSuggestionIndex, showGroupDropdown]);

  useEffect(() => {
    if (activeDropdownRowId && activeSuggestionIndex >= 0) {
      const el = document.getElementById(`purchase-suggestion-${activeDropdownRowId}-${activeSuggestionIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeSuggestionIndex, activeDropdownRowId]);

  useEffect(() => {
    if (focusNewRow) {
      const lastItem = purchaseItems[purchaseItems.length - 1];
      if (lastItem) {
        nameInputRefs.current[lastItem.rowId]?.focus();
      }
      setFocusNewRow(false);
    }
  }, [purchaseItems, focusNewRow]);

  useEffect(() => {
    const unsubscribeGroups = groupApi.getAll(setGroups);
    const unsubscribeProducts = productApi.getAll(setProducts);
    return () => {
      unsubscribeGroups();
      unsubscribeProducts();
    };
  }, []);

  const handleDeleteGroup = async (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (!window.confirm("Are you sure you want to delete this party suggestion?")) {
      return;
    }

    console.log("Deleting party suggestion for id:", id);
    try {
      await groupApi.delete(id);
      toast.success("Party removed from suggestions");
    } catch (err) {
      console.error("Error deleting party suggestion:", err);
      toast.error("Failed to delete party");
    }
  };

  const handlePartySelect = (group: Group) => {
    setPartyName(group.name);
    setSelectedGroupId(group.id);
    setShowGroupDropdown(false);
    setActiveSuggestionIndex(-1);
    
    if (purchaseItems.length === 0) {
      setPurchaseItems([createNewEmptyRow()]);
    }
    setFocusNewRow(true);
  };

  const createNewEmptyRow = (): PurchaseItem => ({
    rowId: Math.random().toString(36).substring(7),
    productName: "",
    unit: "Pcs",
    hasSecondaryUnit: false,
    secondaryUnit: "Box",
    conversionRate: "",
    selectedUnitType: "primary",
    quantity: "",
    currentStock: 0,
    purchaseRate: "",
    wholesaleRate: "",
    mrp: "",
    isNew: true,
  });

  const addRow = () => {
    const lastItem = purchaseItems[purchaseItems.length - 1];
    if (lastItem) {
      const isQtyValid = lastItem.quantity !== "" && Number(lastItem.quantity) > 0;
      const isPRateValid = lastItem.purchaseRate !== "" && Number(lastItem.purchaseRate) > 0;
      const isWRateValid = lastItem.wholesaleRate !== "" && Number(lastItem.wholesaleRate) > 0;
      const isMrpValid = lastItem.mrp !== "" && Number(lastItem.mrp) > 0;

      if (!lastItem.productName.trim() || !isQtyValid || !isPRateValid || !isWRateValid || !isMrpValid) {
        toast.error("Please fill all fields in the current row before adding a new one.");
        return;
      }
    }
    setPurchaseItems([...purchaseItems, createNewEmptyRow()]);
    setFocusNewRow(true);
  };

  const removeRow = (rowId: string) => {
    setPurchaseItems(purchaseItems.filter(item => item.rowId !== rowId));
  };

  const updateRow = (rowId: string, field: keyof PurchaseItem, value: any) => {
    setPurchaseItems(purchaseItems.map(item => {
      if (item.rowId === rowId) {
        const updated = { ...item, [field]: value };
        if (field === "productName") {
          updated.productId = undefined;
          updated.isNew = true;
        }
        return updated;
      }
      return item;
    }));
  };

  const totalPurchaseAmount = purchaseItems.reduce((sum, item) => {
    const targetProduct = item.productId ? products.find(p => p.id === item.productId) : products.find(p => p.groupId === selectedGroupId && p.name.toLowerCase() === item.productName.trim().toLowerCase());
    const qty = Number(item.quantity) || 0;
    let rate = Number(item.purchaseRate);
    if (item.purchaseRate === "") {
        const multiplier = (item.selectedUnitType === "secondary" && Number(item.conversionRate) > 0) ? Number(item.conversionRate) : 1;
        rate = (targetProduct?.purchaseRate || 0) * multiplier;
    }
    return sum + (qty * rate);
  }, 0);

  const purchaseDue = Math.max(0, totalPurchaseAmount - (Number(payableAmount) || 0));

  const filteredGroups = Array.from(new Map(groups.map(g => [g.name.toLowerCase(), g])).values())
    .filter(g => g.name.toLowerCase().includes(partyName.toLowerCase()));

  const handlePartyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showGroupDropdown) {
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < filteredGroups.length) {
          handlePartySelect(filteredGroups[activeSuggestionIndex]);
        } else if (filteredGroups.length > 0) {
          handlePartySelect(filteredGroups[0]);
        } else if (partyName.trim()) {
          setShowGroupDropdown(false);
          if (purchaseItems.length === 0) {
            setPurchaseItems([createNewEmptyRow()]);
          }
          setFocusNewRow(true);
        }
      } else if (partyName.trim()) {
        if (purchaseItems.length === 0) {
          setPurchaseItems([createNewEmptyRow()]);
        }
        setFocusNewRow(true);
      }
      return;
    }

    if (!showGroupDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev < filteredGroups.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : prev));
    }
  };

  const handleSaveDraft = () => {
    const hasData = partyName.trim() !== "" || purchaseItems.some(item => item.productName.trim() !== "" || item.quantity !== "");
    
    if (!hasData) {
      toast.error("Please fill some details before saving a draft");
      return;
    }

    const draft = {
      partyName,
      items: purchaseItems,
      payable: payableAmount
    };
    localStorage.setItem("purchase_draft", JSON.stringify(draft));
    toast.success("Draft saved successfully");
  };

  const handleClear = () => {
    if (partyName || purchaseItems.some(item => item.productName || item.quantity) || payableAmount) {
      if (window.confirm("Are you sure you want to clear all data? This will also remove the saved draft.")) {
        setPartyName("");
        setSelectedGroupId(null);
        setPurchaseItems([createNewEmptyRow()]);
        setPayableAmount("");
        localStorage.removeItem("purchase_draft");
        toast.success("Data cleared successfully");
      }
    }
  };

  const handleProductSelect = (item: PurchaseItem, p: Product) => {
    const updatedItems = purchaseItems.map(pi => 
      pi.rowId === item.rowId ? ({
        ...pi,
        productId: p.id,
        productName: p.name,
        unit: p.unit || "Pcs",
        hasSecondaryUnit: !!p.secondaryUnit,
        secondaryUnit: p.secondaryUnit || "Box",
        conversionRate: p.conversionRate || "",
        selectedUnitType: "primary",
        quantity: 1,
        currentStock: p.stock,
        purchaseRate: p.purchaseRate || "",
        wholesaleRate: p.wholesaleRate || "",
        mrp: p.mrp || "",
        isNew: false
      } as PurchaseItem) : pi
    );
    setPurchaseItems(updatedItems);
    setActiveDropdownRowId(null);
    setActiveSuggestionIndex(-1);
  };

  const handleProductKeyDown = (e: React.KeyboardEvent, item: PurchaseItem, filteredProducts: Product[]) => {
    const isDropdownVisible = activeDropdownRowId === item.rowId && item.productName && item.isNew && filteredProducts.length > 0;
    
    if (isDropdownVisible) {
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
    
    // Matrix navigation
    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) {
      const target = e.target as HTMLInputElement;
      let shouldNavigate = true;
      
      // Allow internal text navigation unless at boundaries
      if (target.type === "text" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        try {
          if (e.key === "ArrowLeft" && target.selectionStart !== 0) shouldNavigate = false;
          if (e.key === "ArrowRight" && target.selectionStart !== target.value.length) shouldNavigate = false;
        } catch (err) {
          // Ignore if selectionStart is not supported
        }
      }
      
      if (shouldNavigate) {
        const match = target.id.match(/pg-(.+)-col-(\d+)/);
        if (match) {
          const rowId = match[1];
          let colIndex = parseInt(match[2], 10);
          const rowIndex = purchaseItems.findIndex(pi => pi.rowId === rowId);
          
          if (rowIndex !== -1) {
            let nextRowIndex = rowIndex;
            let nextColIndex = colIndex;
            const maxCols = 5; // cols: 0=name, 1=qty, 2=prate, 3=wrate, 4=mrp
            
            if (e.key === "ArrowRight") nextColIndex++;
            else if (e.key === "ArrowLeft") nextColIndex--;
            else if (e.key === "ArrowUp") nextRowIndex--;
            else if (e.key === "ArrowDown") nextRowIndex++;
            
            if (nextColIndex >= maxCols) {
              nextColIndex = 0;
              nextRowIndex++;
            } else if (nextColIndex < 0) {
              nextColIndex = maxCols - 1;
              nextRowIndex--;
            }
            
            if (nextRowIndex >= 0 && nextRowIndex < purchaseItems.length) {
              const nextRowId = purchaseItems[nextRowIndex].rowId;
              const nextInputId = `pg-${nextRowId}-col-${nextColIndex}`;
              const nextEl = document.getElementById(nextInputId) as HTMLInputElement | null;
              if (nextEl) {
                e.preventDefault();
                nextEl.focus();
                try {
                  nextEl.select();
                } catch (err) {
                  // Ignore selection error for number inputs
                }
              }
            }
            return;
          }
        }
      }
    }

    // If not interacting with dropdown or grid, handle row enter
    if (e.key === 'Enter') {
      e.preventDefault();
      addRow();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!partyName.trim()) {
      toast.error("Please enter a Party Name");
      return;
    }

    // Filter items that have a name and either have quantity > 0 or have explicit rates entered
    const itemsToProcess = purchaseItems.filter(item => {
      if (!item.productName.trim()) return false;
      
      const qty = Number(item.quantity) || 0;
      if (qty > 0) return true;
      
      if (item.purchaseRate !== "" || item.wholesaleRate !== "" || item.mrp !== "") {
        return true;
      }

      return false;
    });

    if (Number(payableAmount) > totalPurchaseAmount) {
      toast.error(`Payable amount cannot exceed total purchase amount (${formatCurrency(totalPurchaseAmount)})`);
      return;
    }

    if (itemsToProcess.length === 0) {
      toast.error("No valid products to add or update. Enter quantity > 0 or update rates.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Handle Party
      let groupId = selectedGroupId;
      let isNewParty = false;

      if (!groupId) {
        // Check if group already exists by name
        const existingGroup = groups.find(g => g.name.toLowerCase() === partyName.trim().toLowerCase());
        if (existingGroup) {
          groupId = existingGroup.id;
        } else {
          const groupRef = await groupApi.add(partyName.trim());
          groupId = groupRef?.id;
          isNewParty = true;
        }
      }

      if (!groupId) throw new Error("Failed to create party");

      // 2. Process Products
      for (const item of itemsToProcess) {
        const qtyEntered = Number(item.quantity) || 0;
        
        let targetProduct = item.productId ? products.find(p => p.id === item.productId) : undefined;
        if (!targetProduct) {
           targetProduct = products.find(p => p.groupId === groupId && p.name.toLowerCase() === item.productName.trim().toLowerCase());
        }

        const multiplier = (item.selectedUnitType === "secondary" && Number(item.conversionRate) > 0) 
            ? Number(item.conversionRate) : 1;

        const baseQty = qtyEntered * multiplier;

        const uiPRate = item.purchaseRate === "" ? ((targetProduct?.purchaseRate || 0) * (item.selectedUnitType === "secondary" && targetProduct?.conversionRate ? targetProduct.conversionRate : 1)) : Number(item.purchaseRate);
        const uiWRate = item.wholesaleRate === "" ? ((targetProduct?.wholesaleRate || 0) * (item.selectedUnitType === "secondary" && targetProduct?.conversionRate ? targetProduct.conversionRate : 1)) : Number(item.wholesaleRate);
        const uiMRate = item.mrp === "" ? ((targetProduct?.mrp || 0) * (item.selectedUnitType === "secondary" && targetProduct?.conversionRate ? targetProduct.conversionRate : 1)) : Number(item.mrp);

        const basePRate = uiPRate / multiplier;
        const baseWRate = uiWRate / multiplier;
        const baseMRate = uiMRate / multiplier;

        // Check if there's an existing product with the exact same name and rates
        const exactMatch = products.find(p => 
          p.name.toLowerCase() === item.productName.trim().toLowerCase() &&
          p.purchaseRate === basePRate &&
          p.wholesaleRate === baseWRate &&
          p.mrp === baseMRate
        );

        if (exactMatch) {
          const updateData: any = {
            updatedAt: Date.now(),
            unit: item.unit.trim() || "Pcs",
          };
          if (baseQty > 0) {
            updateData.stock = exactMatch.stock + baseQty;
          }
          if (item.hasSecondaryUnit && Number(item.conversionRate) > 0) {
            updateData.secondaryUnit = item.secondaryUnit.trim();
            updateData.conversionRate = Number(item.conversionRate);
          }
          
          await productApi.update(exactMatch.id, updateData);
        } else {
          const productData: any = {
            name: item.productName.trim(),
            groupId,
            groupName: partyName.trim(),
            subgroupId: "",
            subgroupName: "",
            stock: baseQty,
            purchaseRate: basePRate,
            wholesaleRate: baseWRate,
            mrp: baseMRate,
            unit: item.unit.trim() || "Pcs",
            secondaryUnit: item.hasSecondaryUnit ? item.secondaryUnit.trim() : "",
            updatedAt: Date.now(),
          };

          if (item.hasSecondaryUnit && Number(item.conversionRate) > 0) {
            productData.conversionRate = Number(item.conversionRate);
          }

          await productApi.add(productData);
        }
      }

      // 3. Handle Party Due
      const dueChange = totalPurchaseAmount - (Number(payableAmount) || 0);
      const productNamesStr = itemsToProcess.map(item => item.productName.trim()).join(", ");
      await partyDueApi.addOrUpdate(groupId, partyName.trim(), dueChange, productNamesStr, isNewParty);

      toast.success("Purchase saved successfully");
      
      // Reset or refresh
      setPartyName("");
      setSelectedGroupId(null);
      setPurchaseItems([createNewEmptyRow()]);
      setPayableAmount("");
      localStorage.removeItem("purchase_draft");
    } catch (err: any) {
      console.error("Purchase Error:", err);
      toast.error(err.message || "Failed to save products");
    } finally {
      setIsSubmitting(false);
    }
  };

  const partyProducts = React.useMemo(() => {
    if (!selectedGroupId) return [];
    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    if (!selectedGroup) return [];

    const map = new Map<string, Product>();
    products
      .filter(p => p.groupName.toLowerCase() === selectedGroup.name.toLowerCase())
      .forEach(p => {
        const key = `${p.name.toLowerCase()}|${p.purchaseRate}|${p.wholesaleRate}|${p.mrp}`;
        if (map.has(key)) {
          const existing = map.get(key)!;
          map.set(key, {
            ...existing,
            stock: existing.stock + p.stock
          });
        } else {
          map.set(key, { ...p });
        }
      });
    return Array.from(map.values());
  }, [products, selectedGroupId, groups]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
      {/* Left Panel: Party Details */}
      <div className="lg:col-span-1 space-y-4">
        <h4 className="text-lg font-bold text-accent border-b border-accent/10 pb-2">Party Details</h4>
        <div className="space-y-3">
          <div className="relative">
            <label className="block text-sm font-medium text-muted mb-1">Party Name *</label>
            <input
              required
              type="text"
              value={partyName}
              onChange={(e) => {
                setPartyName(capitalizeFirstLetter(e.target.value));
                setSelectedGroupId(null);
                setShowGroupDropdown(true);
                setActiveSuggestionIndex(-1);
              }}
              onFocus={() => setShowGroupDropdown(true)}
              onBlur={() => setTimeout(() => setShowGroupDropdown(false), 200)}
              onKeyDown={handlePartyKeyDown}
              className="w-full bg-primary border border-accent/10 rounded-xl px-3 py-2.5 text-text focus:border-accent outline-none transition-all text-sm"
              placeholder="Select or type party name"
              autoComplete="off"
            />
            {showGroupDropdown && partyName && (
              <div className="absolute z-50 w-full mt-1 bg-surface border border-accent/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                {filteredGroups.map((g, idx) => (
                    <div
                      key={g.id}
                      id={`party-suggestion-${idx}`}
                      className={`px-4 py-3 cursor-pointer text-text border-b border-accent/5 last:border-0 flex justify-between items-center group/item ${
                        idx === activeSuggestionIndex ? 'bg-accent/10' : 'hover:bg-primary'
                      }`}
                      onClick={() => handlePartySelect(g)}
                    >
                      <span>{g.name}</span>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(e, g.id);
                        }}
                        className="p-1.5 text-muted/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all relative z-50 cursor-pointer pointer-events-auto"
                        title="Delete suggestion"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Party Products Summary */}
        {selectedGroupId && (
          <div className="mt-6 border-t border-accent/10 pt-6">
            <h5 className="text-sm font-bold text-accent mb-3">Party's Existing Products</h5>
            <div className="bg-primary/30 rounded-xl border border-accent/10 overflow-hidden">
              <div className="w-full overflow-y-auto max-h-[30vh] custom-scrollbar">
                <table className="w-full text-center text-xs relative">
                  <thead className="bg-surface sticky top-0 z-10 shadow-sm">
                    <tr className="text-accent text-sm font-bold uppercase tracking-wider bg-accent/5">
                      <th className="px-3 py-2 font-medium text-center">Product</th>
                      <th className="px-3 py-2 font-medium text-center">Stock</th>
                      <th className="px-3 py-2 font-medium text-center">P.Rate</th>
                      <th className="px-3 py-2 font-medium text-center">W.Rate</th>
                      <th className="px-3 py-2 font-medium text-center">MRP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-accent/5">
                    {partyProducts.map(p => (
                        <tr key={p.id} className="hover:bg-primary/50">
                          <td className="px-3 py-2 font-medium text-text text-center">{p.name}</td>
                          <td className="px-3 py-2 text-center text-accent font-bold">{p.stock}</td>
                          <td className="px-3 py-2 text-center text-muted">{p.purchaseRate}</td>
                          <td className="px-3 py-2 text-center text-muted">{p.wholesaleRate}</td>
                          <td className="px-3 py-2 text-center text-muted">{p.mrp}</td>
                        </tr>
                      ))}
                    {partyProducts.length === 0 && (
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
      <div className="lg:col-span-4 space-y-4">
        <div className="flex justify-between items-center border-b border-accent/10 pb-2">
          <h4 className="text-lg font-bold text-accent">Products</h4>
          <button
            type="button"
            onClick={addRow}
            className="text-xs flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={purchaseItems.length > 0 && (
              !purchaseItems[purchaseItems.length - 1].productName.trim() || 
              purchaseItems[purchaseItems.length - 1].quantity === "" || 
              Number(purchaseItems[purchaseItems.length - 1].quantity) <= 0 ||
              purchaseItems[purchaseItems.length - 1].purchaseRate === "" ||
              Number(purchaseItems[purchaseItems.length - 1].purchaseRate) <= 0 ||
              purchaseItems[purchaseItems.length - 1].wholesaleRate === "" ||
              Number(purchaseItems[purchaseItems.length - 1].wholesaleRate) <= 0 ||
              purchaseItems[purchaseItems.length - 1].mrp === "" ||
              Number(purchaseItems[purchaseItems.length - 1].mrp) <= 0
            )}
          >
            <Plus size={16} /> Add Product
          </button>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar -mx-6 px-6 md:mx-0 md:px-0 pb-32 relative rounded-xl border border-accent/10">
          <table className="w-full text-center border-collapse whitespace-nowrap min-w-[700px]">
            <thead className="sticky top-0 z-20 bg-surface shadow-sm outline outline-1 outline-accent/10">
              <tr className="border-b border-accent/10 text-accent text-xs font-bold uppercase tracking-wider bg-accent/10">
                <th className="px-1 py-3 font-medium text-left min-w-[150px]">Product Name</th>
                <th className="px-1 py-3 font-medium text-center w-20">Qty</th>
                <th className="px-1 py-3 font-medium text-center w-24">P.Rate</th>
                <th className="px-1 py-3 font-medium text-center w-24">W.Rate</th>
                <th className="px-1 py-3 font-medium text-center w-24">MRP</th>
                <th className="px-1 py-3 font-medium text-center w-8"></th>
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
                    <td className="px-1 py-1 relative text-left align-middle">
                      <input
                        id={`pg-${item.rowId}-col-0`}
                        ref={el => { nameInputRefs.current[item.rowId] = el; }}
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
                        className="w-full bg-primary/30 border border-accent/10 rounded px-2 py-1.5 text-xs text-text outline-none focus:border-accent"
                      />
                      {activeDropdownRowId === item.rowId && item.productName && item.isNew && filteredProducts.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-surface border border-accent/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto left-0 min-w-full">
                          {filteredProducts.map((p, idx) => (
                              <div
                                key={p.id}
                                id={`purchase-suggestion-${item.rowId}-${idx}`}
                                className={`px-4 py-3 cursor-pointer text-text border-b border-accent/5 last:border-0 ${
                                  idx === activeSuggestionIndex ? 'bg-accent/10' : 'hover:bg-primary'
                                }`}
                                onClick={() => handleProductSelect(item, p)}
                              >
                                <div className="font-bold text-xl">{p.name}</div>
                                <div className="text-sm text-muted mt-1.5 flex gap-x-4">Party: {p.groupName}</div>
                              </div>
                            ))}
                        </div>
                      )}
                      {!item.isNew && (
                        <div className="text-[10px] text-muted mt-1 text-left">Current Stock: {item.currentStock} {item.unit}</div>
                      )}
                      {item.productName.trim() && !(activeDropdownRowId === item.rowId && filteredProducts.length > 0) && (
                        <div className="mt-3 text-base flex flex-col gap-4 bg-primary/30 p-4 rounded-xl border border-accent/10 text-left w-full min-w-full shadow-sm">
                          <div className="flex gap-4 items-center">
                            <span className="text-muted font-bold">Base Unit:</span>
                            <select 
                              value={item.unit} 
                              onChange={e => updateRow(item.rowId, "unit", e.target.value)}
                              className="bg-surface border border-accent/10 rounded-lg px-3 py-2 outline-none flex-1 font-bold text-lg"
                            >
                              <option value="Pcs">Pcs</option>
                              <option value="Box">Box</option>
                              <option value="Pack">Pack</option>
                              <option value="Chain">Chain</option>
                              <option value="Kg">Kg</option>
                              <option value="Ltr">Ltr</option>
                            </select>
                          </div>
                          <label className="flex items-center gap-3 cursor-pointer text-text font-bold mt-1">
                            <input 
                              type="checkbox" 
                              checked={item.hasSecondaryUnit} 
                              onChange={e => updateRow(item.rowId, "hasSecondaryUnit", e.target.checked)} 
                              className="w-5 h-5 accent-accent"
                            />
                            <span>Secondary Unit? (Bulk/Pack)</span>
                          </label>
                          {item.hasSecondaryUnit && (
                            <div className="flex gap-3 items-center bg-surface p-3 rounded-xl border border-accent/10">
                              <span className="text-muted font-bold text-lg">1</span>
                              <select 
                                value={item.secondaryUnit} 
                                onChange={e => updateRow(item.rowId, "secondaryUnit", e.target.value)}
                                className="bg-primary/50 border border-accent/10 rounded-lg px-3 py-2 outline-none flex-1 font-bold text-lg"
                              >
                                <option value="Box">Box</option>
                                <option value="Pack">Pack</option>
                                <option value="Chain">Chain</option>
                                <option value="Case">Case</option>
                                <option value="Dozen">Dozen</option>
                              </select>
                              <span className="text-muted font-bold text-lg">=</span>
                              <input 
                                type="number" 
                                value={item.conversionRate} 
                                onChange={e => updateRow(item.rowId, "conversionRate", e.target.value)} 
                                className="w-24 bg-primary border border-accent/10 rounded-lg px-3 py-2 outline-none text-center font-bold text-lg" 
                                placeholder="Qty" 
                              />
                              <span className="text-muted font-bold text-lg truncate min-w-[50px]">{item.unit}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-1 py-1 text-center align-middle">
                      <div className="flex flex-col items-center">
                        <input
                          id={`pg-${item.rowId}-col-1`}
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateRow(item.rowId, "quantity", e.target.value)}
                          onKeyDown={(e) => handleProductKeyDown(e, item, filteredProducts)}
                          placeholder="0"
                          className="w-16 bg-primary border border-accent/10 rounded px-1 py-1 text-center outline-none focus:border-accent text-xs font-bold"
                        />
                        {!item.hasSecondaryUnit ? (
                          <span className="text-[8px] text-muted font-medium bg-accent/5 px-1 py-0.5 rounded uppercase mt-0.5">{item.unit}</span>
                        ) : (
                          <select 
                            value={item.selectedUnitType} 
                            onChange={e => updateRow(item.rowId, "selectedUnitType", e.target.value)} 
                            className="w-16 text-[8px] font-medium bg-accent/10 text-accent border border-accent/20 rounded px-1 py-0.5 outline-none cursor-pointer uppercase mt-0.5"
                          >
                            <option value="primary">{item.unit}</option>
                            <option value="secondary">{item.secondaryUnit}</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-1 text-center align-middle">
                      <input
                        id={`pg-${item.rowId}-col-2`}
                        type="number"
                        min="0"
                        step="any"
                        value={item.purchaseRate}
                        onChange={(e) => updateRow(item.rowId, "purchaseRate", e.target.value)}
                        onKeyDown={(e) => handleProductKeyDown(e, item, filteredProducts)}
                        placeholder="0"
                        className="w-20 mx-auto block bg-primary border border-accent/10 rounded px-1 py-1 text-center outline-none focus:border-accent text-xs"
                      />
                    </td>
                    <td className="px-1 py-1 text-center align-middle">
                      <input
                        id={`pg-${item.rowId}-col-3`}
                        type="number"
                        min="0"
                        step="any"
                        value={item.wholesaleRate}
                        onChange={(e) => updateRow(item.rowId, "wholesaleRate", e.target.value)}
                        onKeyDown={(e) => handleProductKeyDown(e, item, filteredProducts)}
                        placeholder="0"
                        className="w-20 mx-auto block bg-primary border border-accent/10 rounded px-1 py-1 text-center outline-none focus:border-accent text-xs"
                      />
                    </td>
                    <td className="px-1 py-1 text-center align-middle">
                      <input
                        id={`pg-${item.rowId}-col-4`}
                        type="number"
                        min="0"
                        step="any"
                        value={item.mrp}
                        onChange={(e) => updateRow(item.rowId, "mrp", e.target.value)}
                        onKeyDown={(e) => handleProductKeyDown(e, item, filteredProducts)}
                        placeholder="0"
                        className="w-20 mx-auto block bg-primary border border-accent/10 rounded px-1 py-1 text-center outline-none focus:border-accent text-xs"
                      />
                    </td>
                    <td className="px-1 py-1 text-center align-middle">
                      <button 
                        type="button"
                        onClick={() => removeRow(item.rowId)} 
                        className="text-muted hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-500/10 mx-auto block"
                      >
                        <Trash2 size={14} className="mx-auto" />
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
                step="any"
                max={totalPurchaseAmount}
                value={payableAmount}
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : Number(e.target.value);
                  if (val !== "" && val > totalPurchaseAmount) {
                    setPayableAmount(totalPurchaseAmount);
                    toast.error(`Payable amount cannot exceed total purchase amount (${formatCurrency(totalPurchaseAmount)})`);
                  } else {
                    setPayableAmount(val);
                  }
                }}
                className="w-24 bg-primary border border-accent/10 rounded px-2 py-1 text-right outline-none focus:border-accent"
                placeholder="0"
              />
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-accent/10">
              <span>Purchase Due:</span>
              <span className="text-red-500">{formatCurrency(purchaseDue)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleClear}
              className="bg-red-500/10 text-red-500 font-bold px-6 py-3 rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20 flex-1 md:flex-none"
            >
              Clear
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveDraft}
              className="bg-primary text-muted font-bold px-8 py-3 rounded-xl hover:text-text transition-all border border-accent/10 flex-1 md:flex-none"
            >
              Save Draft
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={isSubmitting || purchaseItems.length === 0}
              className="bg-accent text-primary font-bold px-12 py-3 rounded-xl hover:opacity-90 transition-all flex-1 md:flex-none flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-accent/20"
            >
              {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {isSubmitting ? "Saving..." : "Save Purchase"}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
