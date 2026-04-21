import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, Trash2, Loader2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { Product } from "../types";
import { formatCurrency, capitalizeFirstLetter } from "../lib/utils";
import { productApi, cashSaleApi } from "../lib/api";
import { motion, AnimatePresence } from "motion/react";

interface CashItem {
  rowId: string;
  productId?: string;
  productName: string;
  quantity: number | "";
  purchaseRate: number | "";
  wholesaleRate: number | "";
  mrp: number | "";
  amount: number | "";
  isNew: boolean;
}

export default function CashSales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [cashItems, setCashItems] = useState<CashItem[]>([]);
  const [activeDropdownRowId, setActiveDropdownRowId] = useState<string | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [focusNewRow, setFocusNewRow] = useState(false);
  const [isRoundOff, setIsRoundOff] = useState(true);
  const qtyInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const amountInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const nameInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    if (activeDropdownRowId && activeSuggestionIndex >= 0) {
      const el = document.getElementById(`suggestion-${activeDropdownRowId}-${activeSuggestionIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeSuggestionIndex, activeDropdownRowId]);

  useEffect(() => {
    if (focusNewRow) {
      const lastItem = cashItems[cashItems.length - 1];
      if (lastItem) {
        nameInputRefs.current[lastItem.rowId]?.focus();
      }
      setFocusNewRow(false);
    }
  }, [cashItems, focusNewRow]);

  useEffect(() => {
    const unsubscribeProducts = productApi.getAll(setProducts);
    return () => unsubscribeProducts();
  }, []);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("cash_sale_draft");
    if (savedDraft) {
      try {
        const savedItems = JSON.parse(savedDraft);
        if (savedItems && savedItems.length > 0) setCashItems(savedItems);
        toast.success("Draft loaded successfully");
      } catch (e) {
        console.error("Failed to load cash sale draft", e);
      }
    } else {
      setCashItems([createNewEmptyRow()]);
    }
  }, []);

  const createNewEmptyRow = (): CashItem => ({
    rowId: Math.random().toString(36).substring(7),
    productName: "",
    quantity: "",
    purchaseRate: "",
    wholesaleRate: "",
    mrp: "",
    amount: "",
    isNew: true,
  });

  const addRow = () => {
    const lastItem = cashItems[cashItems.length - 1];
    if (lastItem) {
      if (!lastItem.productName.trim() || !lastItem.quantity || Number(lastItem.quantity) <= 0 || !lastItem.amount) {
        toast.error("Please fill the current row before adding a new one.");
        return;
      }
    }
    setCashItems([...cashItems, createNewEmptyRow()]);
    setFocusNewRow(true);
  };

  const removeRow = (rowId: string) => {
    if (cashItems.length === 1) {
      setCashItems([createNewEmptyRow()]);
    } else {
      setCashItems(cashItems.filter(item => item.rowId !== rowId));
    }
  };

  const updateRow = (rowId: string, field: keyof CashItem, value: any) => {
    setCashItems(cashItems.map(item => {
      if (item.rowId === rowId) {
        let updated = { ...item, [field]: value };
        
        // If product name changes, reset product ID and mark as new if not selected from list
        if (field === "productName") {
          updated.productId = undefined;
          updated.isNew = true;
          updated.purchaseRate = "";
          updated.mrp = "";
          updated.amount = "";
          // When typing a new name, we don't clear rates immediately to allow user to type them
          // but we ensure they aren't read-only anymore (handled in JSX)
        }

        if (field === "quantity" || field === "mrp") {
          const q = field === "quantity" ? Number(value) : Number(item.quantity);
          const m = field === "mrp" ? Number(value) : Number(item.mrp);
          
          if (field === "quantity" && item.productId) {
            const product = products.find(p => p.id === item.productId);
            if (product && q > product.stock) {
              toast.error(`Cannot sell ${q} of ${product.name}. Only ${product.stock} in stock.`);
              return item; // Revert change
            }
          }

          if (q && m) {
            updated.amount = q * m;
          } else {
            updated.amount = "";
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const handleProductSelect = (item: CashItem, p: Product) => {
    const qty = item.quantity ? Number(item.quantity) : 0;
    let finalQty = item.quantity;
    
    if (qty > p.stock) {
      toast.error(`Cannot sell ${qty} of ${p.name}. Only ${p.stock} in stock. Adjusting quantity.`);
      finalQty = p.stock > 0 ? p.stock : "";
    }

    setCashItems(cashItems.map(ci => 
      ci.rowId === item.rowId ? {
        ...ci,
        productId: p.id,
        productName: p.name,
        purchaseRate: p.purchaseRate,
        wholesaleRate: p.wholesaleRate,
        mrp: p.mrp,
        isNew: false,
        quantity: finalQty,
        amount: finalQty ? Number(finalQty) * p.mrp : ""
      } : ci
    ));
    setActiveDropdownRowId(null);
    setActiveSuggestionIndex(-1);
    setTimeout(() => {
      qtyInputRefs.current[item.rowId]?.focus();
    }, 50);
  };

  const handleSaveDraft = () => {
    const hasData = cashItems.some(item => item.productName.trim() !== "" || item.quantity !== "");
    
    if (!hasData) {
      toast.error("Please fill some details before saving a draft");
      return;
    }

    localStorage.setItem("cash_sale_draft", JSON.stringify(cashItems));
    toast.success("Draft saved successfully");
  };

  const handleClear = () => {
    if (cashItems.some(item => item.productName || item.quantity)) {
      if (window.confirm("Are you sure you want to clear all items? This will also remove the saved draft.")) {
        setCashItems([createNewEmptyRow()]);
        localStorage.removeItem("cash_sale_draft");
        toast.success("Items cleared successfully");
      }
    }
  };

  const handleSave = async () => {
    const validItems = cashItems.filter(item => item.productName.trim() && item.quantity && Number(item.quantity) > 0);
    
    if (cashItems.some(item => !item.productName.trim() && (item.quantity || item.amount))) {
      toast.error("Product Name is required for all items");
      return;
    }

    if (validItems.length === 0) {
      toast.error("Please add at least one valid item with Product Name and Quantity");
      return;
    }

    // Final stock validation before saving (aggregating quantities for the same product)
    const productQuantities: { [key: string]: number } = {};
    for (const item of validItems) {
      if (item.productId) {
        productQuantities[item.productId] = (productQuantities[item.productId] || 0) + Number(item.quantity);
      }
    }

    for (const productId in productQuantities) {
      const product = products.find(p => p.id === productId);
      if (product && productQuantities[productId] > product.stock) {
        toast.error(`Cannot sell ${productQuantities[productId]} of ${product.name}. Only ${product.stock} in stock.`);
        return;
      }
    }

    setIsSaving(true);
    try {
          for (const item of validItems) {
        await cashSaleApi.create({
          productId: item.productId || "",
          productName: item.productName,
          qty: Number(item.quantity),
          purchaseRate: Number(item.purchaseRate),
          wholesaleRate: Number(item.wholesaleRate),
          mrp: Number(item.mrp),
          amount: Number(item.amount),
        });
      }
      
      toast.success("Cash sales recorded successfully");
      setCashItems([createNewEmptyRow()]);
      localStorage.removeItem("cash_sale_draft");
    } catch (error) {
      console.error("Failed to save cash sales:", error);
      toast.error("Failed to save cash sales");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProductKeyDown = (e: React.KeyboardEvent, item: CashItem, filteredProducts: Product[]) => {
    if (activeDropdownRowId === item.rowId && filteredProducts.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : prev));
        return;
      } else if (e.key === "Enter") {
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
        const match = target.id?.match(/cs-(.+)-col-(\d+)/);
        if (match) {
          const rowId = match[1];
          let colIndex = parseInt(match[2], 10);
          const rowIndex = cashItems.findIndex(pi => pi.rowId === rowId);
          
          if (rowIndex !== -1) {
            let nextRowIndex = rowIndex;
            let nextColIndex = colIndex;
            const maxCols = 6; // 0=name, 1=qty, 2=prate, 3=wrate, 4=mrp, 5=amount
            
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
            
            if (nextRowIndex >= 0 && nextRowIndex < cashItems.length) {
              const nextRowId = cashItems[nextRowIndex].rowId;
              const nextInputId = `cs-${nextRowId}-col-${nextColIndex}`;
              const nextEl = document.getElementById(nextInputId) as HTMLInputElement | null;
              if (nextEl && !nextEl.readOnly && !nextEl.disabled) {
                e.preventDefault();
                nextEl.focus();
                try {
                  nextEl.select();
                } catch (err) {
                  // Ignore
                }
              }
            }
            return;
          }
        }
      }
    }

    // Default Enter behavior for inputs based on column logic
    if (e.key === "Enter") {
      e.preventDefault();
      const match = (e.target as HTMLInputElement).id?.match(/cs-(.+)-col-(\d+)/);
      if (match) {
        const colIndex = parseInt(match[2], 10);
        if (colIndex === 0) {
          qtyInputRefs.current[item.rowId]?.focus();
        } else if (colIndex === 1) {
          amountInputRefs.current[item.rowId]?.focus();
        } else if (colIndex === 5) {
          const rowIndex = cashItems.findIndex(pi => pi.rowId === item.rowId);
          const isLast = rowIndex === cashItems.length - 1;
          if (isLast) {
            addRow();
          } else {
            const nextRowId = cashItems[rowIndex + 1].rowId;
            nameInputRefs.current[nextRowId]?.focus();
          }
        }
      }
    }
  };

  const rawTotalAmount = cashItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalAmount = isRoundOff ? Math.round(rawTotalAmount) : rawTotalAmount;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-accent/10 pb-2">
        <h4 className="text-lg font-bold text-accent">Cash Sales Items</h4>
        <button
          type="button"
          onClick={addRow}
          className="text-sm flex items-center gap-1.5 bg-accent/10 text-accent px-4 py-2 rounded-lg hover:bg-accent/20 transition-all font-bold"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="overflow-x-auto custom-scrollbar pb-48 -mx-6 px-6 md:mx-0 md:px-0">
        <table className="w-full text-center border-collapse whitespace-nowrap md:whitespace-normal">
          <thead>
            <tr className="border-b border-accent/10 text-muted text-xs uppercase tracking-wider">
              <th className="px-2 py-3 font-medium text-center">Particulars</th>
              <th className="px-2 py-3 font-medium text-center">Quantity</th>
              <th className="px-2 py-3 font-medium text-center">P. Rate</th>
              <th className="px-2 py-3 font-medium text-center text-xs">W. Rate</th>
              <th className="px-2 py-3 font-medium text-center">MRP</th>
              <th className="px-2 py-3 font-medium text-center">Amount</th>
              <th className="px-2 py-3 font-medium text-center"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <AnimatePresence mode="popLayout">
              {cashItems.map((item, index) => {
                const filteredProducts = products.filter(p => 
                  p.name.toLowerCase().includes(item.productName.toLowerCase()) && p.stock > 0
                );
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
                        id={`cs-${item.rowId}-col-0`}
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
                        placeholder="Search product..."
                        className="w-full min-w-[600px] bg-primary border border-accent/10 rounded px-3 py-2 text-text outline-none focus:border-accent"
                      />
                      {activeDropdownRowId === item.rowId && item.productName && item.isNew && (
                        <div className="absolute z-50 w-full mt-1 bg-surface border border-accent/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto left-0 min-w-[650px]">
                          {filteredProducts.map((p, idx) => (
                            <div
                              key={p.id}
                              id={`suggestion-${item.rowId}-${idx}`}
                              className={`px-4 py-3 cursor-pointer text-text border-b border-accent/5 last:border-0 text-left ${
                                idx === activeSuggestionIndex ? 'bg-accent/10' : 'hover:bg-primary'
                              }`}
                              onClick={() => handleProductSelect(item, p)}
                            >
                              <div className="font-bold text-xl">{p.name}</div>
                              <div className="text-sm text-muted flex justify-between mt-1.5">
                                <span className={`${p.stock < 5 ? 'text-red-500' : 'text-emerald-500'} font-bold`}>Stock: {p.stock}</span>
                                <span>MRP: {formatCurrency(p.mrp)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      <input
                        id={`cs-${item.rowId}-col-1`}
                        ref={el => { qtyInputRefs.current[item.rowId] = el; }}
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
                        id={`cs-${item.rowId}-col-2`}
                        type="number"
                        step="any"
                        value={item.purchaseRate}
                        onChange={(e) => updateRow(item.rowId, "purchaseRate", e.target.value)}
                        onKeyDown={(e) => handleProductKeyDown(e, item, filteredProducts)}
                        readOnly={!item.isNew}
                        placeholder="0"
                        className={`w-20 mx-auto block border border-accent/10 rounded px-2 py-2 text-center outline-none ${
                          !item.isNew ? "bg-primary/50 cursor-not-allowed text-muted text-xs" : "bg-primary focus:border-accent"
                        }`}
                      />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <input
                        id={`cs-${item.rowId}-col-3`}
                        type="number"
                        step="any"
                        value={item.wholesaleRate}
                        onChange={(e) => updateRow(item.rowId, "wholesaleRate", e.target.value)}
                        onKeyDown={(e) => handleProductKeyDown(e, item, filteredProducts)}
                        readOnly={!item.isNew}
                        placeholder="0"
                        className={`w-20 mx-auto block border border-accent/10 rounded px-2 py-2 text-center outline-none ${
                          !item.isNew ? "bg-primary/50 cursor-not-allowed text-muted text-xs" : "bg-primary focus:border-accent"
                        }`}
                      />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <input
                        id={`cs-${item.rowId}-col-4`}
                        type="number"
                        step="any"
                        value={item.mrp}
                        onChange={(e) => updateRow(item.rowId, "mrp", e.target.value)}
                        onKeyDown={(e) => handleProductKeyDown(e, item, filteredProducts)}
                        readOnly={!item.isNew}
                        placeholder="0"
                        className={`w-24 mx-auto block border border-accent/10 rounded px-2 py-2 text-center outline-none ${
                          !item.isNew ? "bg-primary/50 cursor-not-allowed text-muted" : "bg-primary focus:border-accent"
                        }`}
                      />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <input
                        id={`cs-${item.rowId}-col-5`}
                        ref={el => { amountInputRefs.current[item.rowId] = el; }}
                        type="number"
                        step="any"
                        value={item.amount}
                        onChange={(e) => updateRow(item.rowId, "amount", e.target.value)}
                        onKeyDown={(e) => handleProductKeyDown(e, item, filteredProducts)}
                        placeholder="0"
                        className="w-24 mx-auto block bg-primary border border-accent/10 rounded px-2 py-2 text-center outline-none focus:border-accent font-bold text-accent"
                      />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <button onClick={() => removeRow(item.rowId)} className="text-muted hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <div className="bg-primary/20 rounded-2xl border border-accent/10 p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-muted text-xs uppercase tracking-wider mb-1">Total Items</span>
              <span className="text-xl font-bold text-text">{cashItems.filter(i => i.productName).length}</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-muted text-xs uppercase tracking-wider">Total Amount</span>
                <label className="flex items-center gap-1 cursor-pointer bg-primary/50 px-1.5 py-0.5 rounded border border-accent/10">
                  <input
                    type="checkbox"
                    checked={isRoundOff}
                    onChange={(e) => setIsRoundOff(e.target.checked)}
                    className="accent-accent"
                  />
                  <span className="text-[10px] text-muted uppercase">Round Off</span>
                </label>
              </div>
              <span className="text-3xl font-display font-bold text-accent">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
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
              className="bg-primary text-muted font-bold px-6 py-3 rounded-xl hover:text-text transition-all border border-accent/10 flex-1 md:flex-none"
            >
              Save Draft
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={isSaving || cashItems.length === 0}
              className="bg-accent text-primary font-bold px-10 py-3 rounded-xl hover:opacity-90 transition-all flex-1 md:flex-none flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-accent/20"
            >
              {isSaving && <Loader2 className="w-5 h-5 animate-spin" />}
              {isSaving ? "Saving..." : "Save Cash Sale"}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
