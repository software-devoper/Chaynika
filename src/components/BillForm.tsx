import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { getDoc } from "firebase/firestore";
import { auth } from "../lib/firebase";
import { Product, BillItem, Customer, Bill } from "../types";
import { formatCurrency, capitalizeFirstLetter } from "../lib/utils";
import { generateBillPDF } from "../lib/BillPDFGenerator";
import { productApi, billApi, dueApi, customerApi } from "../lib/api";
import { motion, AnimatePresence } from "motion/react";

export default function BillForm() {
  const [customer, setCustomer] = useState<Partial<Customer>>({
    name: "",
    address: "",
    email: "",
  });
  const [phones, setPhones] = useState<string[]>([""]);
  const [previousDue, setPreviousDue] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("bill_draft");
    if (savedDraft) {
      try {
        const { customer: savedCustomer, phones: savedPhones, items: savedItems, paid: savedPaid, previousDue: savedPreviousDue } = JSON.parse(savedDraft);
        if (savedCustomer) setCustomer(savedCustomer);
        if (savedPhones) setPhones(savedPhones);
        if (savedItems && savedItems.length > 0) setBillItems(savedItems);
        if (savedPaid !== undefined) setPaidAmount(savedPaid);
        if (savedPreviousDue !== undefined) setPreviousDue(savedPreviousDue);
        toast.success("Draft loaded successfully");
      } catch (e) {
        console.error("Failed to load bill draft", e);
      }
    }
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showPurchasePrice, setShowPurchasePrice] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeCustomerSuggestionIndex, setActiveCustomerSuggestionIndex] = useState(-1);
  const [activeProductSuggestionIndex, setActiveProductSuggestionIndex] = useState(-1);
  const [activeDropdownRowId, setActiveDropdownRowId] = useState<string | null>(null);
  const [customerHistory, setCustomerHistory] = useState<{date: number, productName: string, qty: number, price: number}[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [focusQtyId, setFocusQtyId] = useState<string | null>(null);
  const [isRoundOff, setIsRoundOff] = useState(true);

  useEffect(() => {
    if (activeProductSuggestionIndex >= 0 && !activeDropdownRowId) {
      const el = document.getElementById(`bill-suggestion-${activeProductSuggestionIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeProductSuggestionIndex, activeDropdownRowId]);

  useEffect(() => {
    if (activeDropdownRowId && activeProductSuggestionIndex >= 0) {
      const el = document.getElementById(`bill-row-suggestion-${activeDropdownRowId}-${activeProductSuggestionIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeProductSuggestionIndex, activeDropdownRowId]);

  useEffect(() => {
    const unsubscribeProducts = productApi.getAll(setProducts);
    const unsubscribeCustomers = customerApi.getAll(setCustomers);
    return () => {
      unsubscribeProducts();
      unsubscribeCustomers();
    };
  }, []);

  useEffect(() => {
    if (searchTerm.length > 1) {
      setSearchResults(products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.stock > 0
      ));
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, products]);

  // Fetch previous due and history when primary phone changes
  useEffect(() => {
    const primaryPhone = phones[0];
    if (primaryPhone && primaryPhone.length === 10) {
      // Use getOne instead of real-time listener to avoid overwriting manual edits
      const fetchDue = async () => {
        try {
          const dues = await dueApi.getOne(primaryPhone);
          if (dues) {
            setPreviousDue(dues.amount);
          } else {
            setPreviousDue(0);
          }
        } catch (error) {
          console.error("Error fetching due:", error);
        }
      };
      
      fetchDue();
      
      const unsubscribeBills = billApi.getAll((bills) => {
        const customerBills = bills.filter(b => b.customerPhone === primaryPhone || (b.additionalPhones && b.additionalPhones.includes(primaryPhone)));
        const historyItems: {date: number, productName: string, qty: number, price: number}[] = [];
        customerBills.forEach(bill => {
          bill.items.forEach(item => {
            historyItems.push({
              date: bill.date,
              productName: item.productName,
              qty: item.qty,
              price: item.price
            });
          });
        });
        // Sort by date descending
        historyItems.sort((a, b) => b.date - a.date);
        setCustomerHistory(historyItems);
      });

      return () => {
        unsubscribeBills();
      };
    } else {
      setPreviousDue(0);
      setCustomerHistory([]);
    }
  }, [phones[0]]);

  useEffect(() => {
    if (focusQtyId && qtyInputRefs.current[focusQtyId]) {
      qtyInputRefs.current[focusQtyId]?.focus();
      qtyInputRefs.current[focusQtyId]?.select();
      setFocusQtyId(null);
    }
  }, [focusQtyId]);

  const handleDeleteCustomer = async (e: React.MouseEvent | React.TouchEvent, phone: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!window.confirm("Are you sure you want to delete this customer suggestion?")) {
      return;
    }

    console.log("Deleting customer suggestion for phone:", phone);
    try {
      await customerApi.delete(phone);
      toast.success("Customer removed from suggestions");
    } catch (err) {
      console.error("Error deleting customer suggestion:", err);
      toast.error("Failed to delete customer");
    }
  };

  const handleCustomerSelect = (selectedCustomer: Customer) => {
    setCustomer({
      name: selectedCustomer.name,
      address: selectedCustomer.address || "",
      email: selectedCustomer.email || "",
    });
    setPhones([selectedCustomer.phone, ...(selectedCustomer.additionalPhones || [])]);
    setShowCustomerDropdown(false);
    setActiveCustomerSuggestionIndex(-1);
  };

  const handlePhoneChange = (index: number, value: string) => {
    // Only allow numbers and max 10 digits
    const numericValue = value.replace(/\D/g, "").slice(0, 10);
    const newPhones = [...phones];
    newPhones[index] = numericValue;
    setPhones(newPhones);
  };

  const addPhoneField = () => {
    if (phones.length < 3) { // Limit to 3 phones for UI sanity
      setPhones([...phones, ""]);
    } else {
      toast.error("Maximum 3 phone numbers allowed");
    }
  };

  const removePhoneField = (index: number) => {
    if (phones.length > 1) {
      const newPhones = phones.filter((_, i) => i !== index);
      setPhones(newPhones);
    }
  };

  const addProductToBill = (product: Product) => {
    const existing = billItems.find(item => item.productId === product.id);
    if (existing) {
      const multiplier = existing.selectedUnitType === "secondary" && product.conversionRate ? product.conversionRate : 1;
      const baseQtyRequired = (existing.qty + 1) * multiplier;
      if (baseQtyRequired > product.stock) return toast.error("Out of stock");
      setBillItems(billItems.map(item => 
        item.productId === product.id 
          ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.price }
          : item
      ));
    } else {
      const newItem: BillItem = {
        productId: product.id,
        productName: product.name,
        qty: 1,
        price: product.wholesaleRate,
        purchaseRate: product.purchaseRate,
        wholesaleRate: product.wholesaleRate,
        mrp: product.mrp,
        total: product.wholesaleRate,
        unit: product.unit || "Pcs",
        secondaryUnit: product.secondaryUnit,
        conversionRate: product.conversionRate,
        hasSecondaryUnit: !!product.secondaryUnit,
        selectedUnitType: "primary"
      };
      setBillItems([...billItems, newItem]);
    }
    setSearchTerm("");
    setSearchResults([]);
    setFocusQtyId(product.id);
  };

  const removeProductFromBill = (productId: string) => {
    setBillItems(billItems.filter(item => item.productId !== productId));
  };

  // Helper logic for table keyboard navigation
  const handleGridKeyDown = (e: React.KeyboardEvent, productId: string) => {
    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) {
      const target = e.target as HTMLInputElement;
      let shouldNavigate = true;
      
      if (shouldNavigate) {
        const match = target.id?.match(/bf-(.+)-col-(\d+)/);
        if (match) {
          const matchedId = match[1];
          let colIndex = parseInt(match[2], 10);
          const rowIndex = billItems.findIndex(pi => pi.productId === matchedId);
          
          if (rowIndex !== -1) {
            let nextRowIndex = rowIndex;
            let nextColIndex = colIndex;
            const maxCols = 3; // 0=name, 1=price, 2=qty
            
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
            
            if (nextRowIndex >= 0 && nextRowIndex < billItems.length) {
              const nextRowId = billItems[nextRowIndex].productId;
              const nextInputId = `bf-${nextRowId}-col-${nextColIndex}`;
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

    if (e.key === "Enter") {
      e.preventDefault();
      const match = (e.target as HTMLInputElement).id?.match(/bf-(.+)-col-(\d+)/);
      if (match) {
        const colIndex = parseInt(match[2], 10);
        if (colIndex === 1) {
          qtyInputRefs.current[productId]?.focus();
        } else if (colIndex === 2) {
          searchInputRef.current?.focus();
        }
      }
    }
  };

  const updateQuantity = (productId: string, qty: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (qty < 1) return;

    setBillItems(billItems.map(item => {
      if (item.productId === productId) {
        const multiplier = item.selectedUnitType === "secondary" && item.conversionRate ? item.conversionRate : 1;
        const baseQty = qty * multiplier;
        if (baseQty > product.stock) {
           toast.error(`Out of stock. Only ${product.stock} base units available.`);
           return item;
        }
        return { ...item, qty, total: qty * item.price };
      }
      return item;
    }));
  };

  const updateUnitType = (productId: string, type: "primary" | "secondary") => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setBillItems(billItems.map(item => {
      if (item.productId === productId) {
        const multiplier = type === "secondary" && product.conversionRate ? product.conversionRate : 1;
        const newPrice = product.wholesaleRate * multiplier;
        const newMrp = product.mrp * multiplier;
        
        const baseQtyRequired = item.qty * multiplier;
        if (baseQtyRequired > product.stock) {
          toast.error(`Cannot switch unit. Only ${product.stock} base units available.`);
          return item;
        }

        return { 
          ...item, 
          selectedUnitType: type,
          price: newPrice,
          mrp: newMrp,
          total: item.qty * newPrice
        };
      }
      return item;
    }));
  };

  const updatePrice = (productId: string, price: number) => {
    setBillItems(billItems.map(item => 
      item.productId === productId 
        ? { ...item, price: price, total: item.qty * price }
        : item
    ));
  };

  const updateProductName = (productId: string, newName: string) => {
    setBillItems(billItems.map(item => 
      item.productId === productId 
        ? { ...item, productName: newName }
        : item
    ));
  };

  const handleProductRowSelect = (oldProductId: string, newProduct: Product) => {
    const existing = billItems.find(item => item.productId === newProduct.id);
    if (existing && existing.productId !== oldProductId) {
      toast.error("Product already in bill");
      return;
    }

    setBillItems(billItems.map(item => {
      if (item.productId === oldProductId) {
        return {
          productId: newProduct.id,
          productName: newProduct.name,
          qty: 1,
          price: newProduct.wholesaleRate,
          mrp: newProduct.mrp,
          total: newProduct.wholesaleRate,
        };
      }
      return item;
    }));
    setActiveDropdownRowId(null);
    setActiveProductSuggestionIndex(-1);
    setFocusQtyId(newProduct.id);
  };

  const handleProductRowKeyDown = (e: React.KeyboardEvent, oldProductId: string, filteredProducts: Product[]) => {
    const item = billItems.find(i => i.productId === oldProductId);
    const isDropdownVisible = activeDropdownRowId === oldProductId && (item?.productName ?? "") !== "";

    if (isDropdownVisible && filteredProducts.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveProductSuggestionIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveProductSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        return;
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeProductSuggestionIndex >= 0 && filteredProducts[activeProductSuggestionIndex]) {
          handleProductRowSelect(oldProductId, filteredProducts[activeProductSuggestionIndex]);
        } else {
          qtyInputRefs.current[oldProductId]?.focus();
          setActiveDropdownRowId(null);
        }
        return;
      }
    }

    // Matrix navigation
    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) {
      const target = e.target as HTMLInputElement;
      let shouldNavigate = true;
      
      if (target.type === "text" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        try {
          if (e.key === "ArrowLeft" && target.selectionStart !== 0) shouldNavigate = false;
          if (e.key === "ArrowRight" && target.selectionStart !== target.value.length) shouldNavigate = false;
        } catch (err) {}
      }
      
      if (shouldNavigate) {
        const match = target.id?.match(/bf-(.+)-col-(\d+)/);
        if (match) {
          const matchedId = match[1];
          let colIndex = parseInt(match[2], 10);
          const rowIndex = billItems.findIndex(pi => pi.productId === matchedId);
          
          if (rowIndex !== -1) {
            let nextRowIndex = rowIndex;
            let nextColIndex = colIndex;
            const maxCols = 3; // 0=name, 1=price, 2=qty
            
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
            
            if (nextRowIndex >= 0 && nextRowIndex < billItems.length) {
              const nextRowId = billItems[nextRowIndex].productId;
              const nextInputId = `bf-${nextRowId}-col-${nextColIndex}`;
              const nextEl = document.getElementById(nextInputId) as HTMLInputElement | null;
              if (nextEl && !nextEl.readOnly && !nextEl.disabled) {
                e.preventDefault();
                nextEl.focus();
                try { nextEl.select(); } catch (err) {}
              }
            }
            return;
          }
        }
      }
    }
  };

  const subtotal = billItems.reduce((sum, item) => sum + item.total, 0);
  const rawGrandTotal = subtotal + previousDue;
  const grandTotal = isRoundOff ? Math.round(rawGrandTotal) : rawGrandTotal;
  const currentBillDue = Math.max(0, grandTotal - paidAmount);

  const filteredCustomers = Array.from(new Map(customers.map(c => [c.name.toLowerCase(), c])).values())
    .filter(c => c.name.toLowerCase().includes((customer.name || "").toLowerCase()));

  const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
    if (!showCustomerDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveCustomerSuggestionIndex(prev => (prev < filteredCustomers.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveCustomerSuggestionIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeCustomerSuggestionIndex >= 0 && activeCustomerSuggestionIndex < filteredCustomers.length) {
        handleCustomerSelect(filteredCustomers[activeCustomerSuggestionIndex]);
      } else if (filteredCustomers.length > 0) {
        handleCustomerSelect(filteredCustomers[0]);
      }
    }
  };

  const handleProductSearchKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveProductSuggestionIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveProductSuggestionIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeProductSuggestionIndex >= 0 && activeProductSuggestionIndex < searchResults.length) {
        addProductToBill(searchResults[activeProductSuggestionIndex]);
      } else if (searchResults.length > 0) {
        addProductToBill(searchResults[0]);
      }
      setActiveProductSuggestionIndex(-1);
    } else if (e.key === 'Tab') {
      // If user tabs out of search, we might want to focus something specific
      // but default behavior is fine for now.
    }
  };

  const handleGenerateBill = async (action: "save" | "print") => {
    console.log("Auth current user:", auth.currentUser);
    const primaryPhone = phones[0];
    const additionalPhones = phones.slice(1).filter(p => p.length === 10);

    if (!customer.name?.trim()) {
      toast.error("Customer Name is required");
      return;
    }

    if (!primaryPhone || primaryPhone.length !== 10) {
      toast.error("Valid 10-digit Primary Phone is required");
      return;
    }

    if (billItems.length === 0) {
      toast.error("Please add at least one product to the bill");
      return;
    }

    if (billItems.some(item => !item.productName?.trim())) {
      toast.error("All items must have a product name (Particular)");
      return;
    }

    if (paidAmount > grandTotal) {
      toast.error(`Paid amount cannot exceed grand total (${formatCurrency(grandTotal)})`);
      return;
    }

    if (action === "save") setIsSaving(true);
    if (action === "print") setIsPrinting(true);

    // Allow UI to update and show the spinner before heavy processing
    await new Promise(resolve => setTimeout(resolve, 50));

    const billData: Bill = {
      id: "",
      billNo: "", // Will be populated by API
      customerName: customer.name,
      customerPhone: primaryPhone,
      additionalPhones,
      customerAddress: customer.address || "",
      customerEmail: customer.email || "",
      items: billItems,
      subtotal,
      grandTotal: grandTotal,
      paidAmount,
      dueAmount: Math.max(0, grandTotal - paidAmount),
      date: Date.now(),
    };

    try {
      const billRef = await billApi.create(billData);
      billData.id = billRef.id;
      // Fetch the generated billNo from the created document
      const billSnap = await getDoc(billRef);
      if (billSnap.exists()) {
        billData.billNo = billSnap.data().billNo;
      }

      if (action === "print") {
        await generateBillPDF(billData, action);
      }
      
      toast.success(`Bill ${action === "save" ? "saved" : "printed"} successfully`);
      // Reset form
      setCustomer({ name: "", address: "", email: "" });
      setPhones([""]);
      setBillItems([]);
      setPreviousDue(0);
      setPaidAmount(0);
      setSearchTerm("");
      setSearchResults([]);
      localStorage.removeItem("bill_draft");
    } catch (error) {
      console.error("Failed to save bill:", error);
      toast.error(`Failed to save bill: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
      setIsPrinting(false);
    }
  };

  const handleSaveDraft = () => {
    const hasData = (customer.name && customer.name.trim() !== "") || (phones[0] && phones[0].trim() !== "") || billItems.length > 0;
    
    if (!hasData) {
      toast.error("Please fill some details before saving a draft");
      return;
    }

    const draft = {
      customer,
      phones,
      items: billItems,
      paid: paidAmount,
      previousDue: previousDue
    };
    localStorage.setItem("bill_draft", JSON.stringify(draft));
    toast.success("Draft saved successfully");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Panel: Customer Details */}
      <div className="lg:col-span-1 space-y-6">
        <h4 className="text-lg font-bold text-accent border-b border-accent/10 pb-2">Customer Details</h4>
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-muted mb-2">Customer Name</label>
            <input
              type="text"
              value={customer.name}
              onChange={(e) => {
                setCustomer({ ...customer, name: capitalizeFirstLetter(e.target.value) });
                setShowCustomerDropdown(true);
                setActiveCustomerSuggestionIndex(-1);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
              onKeyDown={handleCustomerKeyDown}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
              placeholder="Enter name"
            />
            {showCustomerDropdown && customers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-accent/20 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                {filteredCustomers.map((c, index) => (
                    <div
                      key={`${c.id}-${index}`}
                      className={`px-4 py-2 cursor-pointer text-sm flex justify-between items-center group/item ${
                        index === activeCustomerSuggestionIndex ? 'bg-accent/10' : 'hover:bg-primary'
                      }`}
                      onClick={() => handleCustomerSelect(c)}
                    >
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted">{c.phone}</div>
                      </div>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomer(e, c.phone);
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
          
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Address</label>
            <input
              type="text"
              value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: capitalizeFirstLetter(e.target.value) })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
              placeholder="Enter address"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-muted">Phone Number(s) *</label>
              {phones.length < 3 && (
                <button 
                  onClick={addPhoneField}
                  className="text-xs flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-all font-bold"
                >
                  <Plus size={14} /> Add Alternate
                </button>
              )}
            </div>
            {phones.map((phone, index) => (
              <div key={`phone-${index}`} className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">
                  {index === 0 ? "PRI" : `ALT ${index}`}
                </div>
                <input
                  type="tel"
                  required={index === 0}
                  value={phone}
                  onChange={(e) => handlePhoneChange(index, e.target.value)}
                  className="w-full bg-primary border border-accent/10 rounded-xl pl-16 pr-12 py-3 text-text focus:border-accent outline-none transition-all font-mono tracking-wider"
                  placeholder="10 digit number"
                />
                {phones.length > 1 && (
                  <button 
                    onClick={() => removePhoneField(index)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded-lg"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <p className="text-[10px] text-muted italic">Primary number is used for tracking dues.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">Email (Optional)</label>
            <input
              type="email"
              value={customer.email}
              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
              placeholder="Enter email"
            />
          </div>

          <div className="pt-4 p-4 bg-primary/30 rounded-xl border border-accent/5">
            <div className="flex justify-between items-center">
              <span className="text-muted">Previous Due:</span>
              <span className="text-accent font-bold">{formatCurrency(previousDue)}</span>
            </div>
          </div>

          {/* Customer History Summary */}
          {customerHistory.length > 0 && (
            <div className="mt-6 border-t border-accent/10 pt-6">
              <h5 className="text-sm font-bold text-accent mb-3">Customer's Past Purchases</h5>
              <div className="bg-primary/30 rounded-xl border border-accent/10 overflow-hidden">
                <div className="w-full overflow-y-auto max-h-[30vh] custom-scrollbar">
                  <table className="w-full text-center text-xs relative">
                    <thead className="bg-surface sticky top-0 z-10 shadow-sm">
                      <tr className="text-accent text-sm font-bold uppercase tracking-wider bg-accent/5">
                        <th className="px-3 py-2 font-medium text-center">Date</th>
                        <th className="px-3 py-2 font-medium text-center">Particulars</th>
                        <th className="px-3 py-2 font-medium text-center">Qty</th>
                        <th className="px-3 py-2 font-medium text-center">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-accent/5">
                      {customerHistory.map((item, idx) => (
                        <tr key={idx} className="hover:bg-primary/50">
                          <td className="px-3 py-2 text-muted whitespace-nowrap text-center">{new Date(item.date).toLocaleDateString()}</td>
                          <td className="px-3 py-2 font-medium text-text text-center">{item.productName}</td>
                          <td className="px-3 py-2 text-center text-accent font-bold">{item.qty}</td>
                          <td className="px-3 py-2 text-center text-muted">{formatCurrency(item.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Product Search & Table */}
      <div className="lg:col-span-2 space-y-6">
        <div className="overflow-x-auto custom-scrollbar -mx-6 px-6 md:mx-0 md:px-0 pb-48">
          <table className="w-full text-center border-collapse whitespace-nowrap md:whitespace-normal">
            <thead>
              <tr className="border-b border-accent/10 text-accent text-sm font-bold uppercase tracking-wider bg-accent/5">
                <th className="px-2 py-3 font-medium text-center">Sr.</th>
                <th className="px-2 py-3 font-medium text-center">Particulars</th>
                <th className="px-2 py-3 font-medium text-center">
                  <div className="flex items-center justify-center gap-2">
                    {showPurchasePrice && "Preview"}
                    <button
                      onClick={() => setShowPurchasePrice(!showPurchasePrice)}
                      className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded hover:bg-accent/20 transition-all"
                    >
                      {showPurchasePrice ? "Hide" : "View Preview"}
                    </button>
                  </div>
                </th>
                <th className="px-2 py-3 font-medium text-center">MRP</th>
                <th className="px-2 py-3 font-medium text-center text-xs">W. Rate</th>
                <th className="px-2 py-3 font-medium text-center">Percentage</th>
                <th className="px-2 py-3 font-medium text-center">Rate</th>
                <th className="px-2 py-3 font-medium text-center">Qty</th>
                <th className="px-2 py-3 font-medium text-center">Total</th>
                <th className="px-2 py-3 font-medium text-center"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <AnimatePresence mode="popLayout">
                {billItems.map((item, index) => {
                  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(item.productName.toLowerCase()) && p.stock > 0);
                  return (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    key={item.productId} 
                    className="border-b border-accent/5 group relative"
                  >
                    <td className="px-2 py-4 text-center">{index + 1}</td>
                    <td className="px-2 py-4 font-medium text-center relative">
                      <input
                        id={`bf-${item.productId}-col-0`}
                        type="text"
                        value={item.productName}
                        onChange={(e) => {
                          updateProductName(item.productId, e.target.value);
                          setActiveDropdownRowId(item.productId);
                          setActiveProductSuggestionIndex(-1);
                        }}
                        onFocus={() => {
                          setActiveDropdownRowId(item.productId);
                          setActiveProductSuggestionIndex(-1);
                        }}
                        onBlur={() => setTimeout(() => setActiveDropdownRowId(null), 200)}
                        onKeyDown={(e) => handleProductRowKeyDown(e, item.productId, filteredProducts)}
                        className="w-full bg-transparent border-b border-transparent hover:border-accent/30 focus:border-accent outline-none text-center transition-colors px-2"
                      />
                      {activeDropdownRowId === item.productId && item.productName && (
                        <div className="absolute z-50 w-full mt-1 bg-surface border border-accent/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto left-0 text-left min-w-full">
                          {filteredProducts.map((p, idx) => (
                            <div
                              key={p.id}
                              id={`bill-row-suggestion-${item.productId}-${idx}`}
                              className={`px-4 py-3 cursor-pointer text-text border-b border-accent/5 last:border-0 ${
                                idx === activeProductSuggestionIndex ? 'bg-accent/10' : 'hover:bg-primary'
                              }`}
                              onClick={() => handleProductRowSelect(item.productId, p)}
                            >
                              <div className="font-bold text-xl">{p.name}</div>
                              <div className="text-sm text-muted mt-1.5 flex gap-x-4">
                                <span className={`${p.stock < 5 ? 'text-red-500' : 'text-emerald-500'} font-bold`}>Stock: {p.stock}</span>
                                <span>MRP: {formatCurrency(p.mrp)}</span>
                                <span>Rate: {formatCurrency(p.wholesaleRate)}</span>
                              </div>
                            </div>
                          ))}
                          {filteredProducts.length === 0 && (
                            <div className="px-4 py-2 text-sm text-muted italic">No matching products in stock</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-4 text-center text-muted">
                      {showPurchasePrice ? formatCurrency(products.find(p => p.id === item.productId)?.purchaseRate || 0) : ""}
                    </td>
                    <td className="px-2 py-4 text-center">{formatCurrency(item.mrp)}</td>
                    <td className="px-2 py-4 text-center text-muted text-xs">{formatCurrency(item.wholesaleRate || 0)}</td>
                    <td className="px-2 py-4 text-center text-accent font-bold">
                      {item.mrp > 0 ? (((item.mrp - item.price) / item.mrp) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="px-2 py-4 text-center">
                      <input
                        id={`bf-${item.productId}-col-1`}
                        type="number"
                        step="any"
                        value={item.price}
                        onChange={(e) => updatePrice(item.productId, Number(e.target.value))}
                        onKeyDown={(e) => handleGridKeyDown(e, item.productId)}
                        className="w-20 bg-primary border border-accent/10 rounded px-2 py-1 text-center outline-none focus:border-accent mx-auto"
                      />
                    </td>
                    <td className="px-2 py-4 text-center align-top">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          id={`bf-${item.productId}-col-2`}
                          ref={el => { qtyInputRefs.current[item.productId] = el; }}
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                          onKeyDown={(e) => handleGridKeyDown(e, item.productId)}
                          className="w-16 bg-primary border border-accent/10 rounded px-2 py-1 text-center outline-none focus:border-accent mx-auto"
                        />
                        {item.hasSecondaryUnit ? (
                          <select 
                            value={item.selectedUnitType || "primary"} 
                            onChange={e => updateUnitType(item.productId, e.target.value as "primary" | "secondary")} 
                            className="w-16 text-[10px] font-medium bg-accent/10 text-accent border border-accent/20 rounded px-1 py-1 outline-none cursor-pointer uppercase mx-auto block"
                          >
                            <option value="primary">{item.unit || "Pcs"}</option>
                            <option value="secondary">{item.secondaryUnit}</option>
                          </select>
                        ) : (
                          <span className="text-[10px] text-muted font-medium bg-accent/5 px-2 py-0.5 rounded uppercase mx-auto block w-fit">{item.unit || "Pcs"}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center font-medium">{formatCurrency(item.total)}</td>
                    <td className="px-2 py-4 text-center">
                      <button onClick={() => removeProductFromBill(item.productId)} className="text-muted hover:text-red-500 transition-colors mx-auto block">
                        <X size={16} className="mx-auto" />
                      </button>
                    </td>
                  </motion.tr>
                  );
                })}
              </AnimatePresence>
              
              {/* Search Row */}
              <tr className="bg-accent/5">
                <td className="px-2 py-4 text-center text-muted font-bold">{billItems.length + 1}</td>
                <td className="px-2 py-4 text-center relative" colSpan={2}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search product..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(capitalizeFirstLetter(e.target.value));
                        setActiveProductSuggestionIndex(-1);
                      }}
                      onKeyDown={handleProductSearchKeyDown}
                      className="w-full bg-primary border border-accent/10 rounded-lg pl-9 pr-4 py-2 text-sm text-text focus:border-accent outline-none transition-all"
                    />
                    
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-accent/20 rounded-xl shadow-2xl z-50 overflow-y-auto max-h-48 divide-y divide-accent/5">
                        {searchResults.map((p, index) => (
                          <button
                            key={`${p.id}-${index}`}
                            id={`bill-suggestion-${index}`}
                            onClick={() => addProductToBill(p)}
                            className={`w-full text-left px-4 py-3 transition-colors flex justify-between items-center ${
                              index === activeProductSuggestionIndex ? 'bg-accent/10' : 'hover:bg-primary'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-xl">{p.name}</div>
                              <div className="text-sm text-muted mt-1.5 flex gap-x-4">
                                <span className={`${p.stock < 5 ? 'text-red-500' : 'text-emerald-500'} font-bold`}>Stock: {p.stock}</span>
                                <span>MRP: {formatCurrency(p.mrp)}</span>
                                <span>Rate: {formatCurrency(p.wholesaleRate)}</span>
                              </div>
                            </div>
                            <Plus size={16} className="text-accent" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-2 py-4 text-center text-muted">-</td>
                <td className="px-2 py-4 text-center text-muted">-</td>
                <td className="px-2 py-4 text-center text-muted">-</td>
                <td className="px-2 py-4 text-center text-muted">-</td>
                <td className="px-2 py-4 text-center text-muted">-</td>
                <td className="px-2 py-4 text-center"></td>
              </tr>

              {billItems.length === 0 && searchTerm === "" && (
                <tr>
                  <td colSpan={9} className="px-2 py-8 text-center text-muted italic">No products added. Use the search row above to start.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-end gap-4 border-t border-accent/10 pt-6">
          <div className="space-y-2 text-right w-full md:max-w-xs">
            <div className="flex justify-between text-muted">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center gap-4 text-muted">
              <span>Previous Due:</span>
              <input
                type="number"
                step="any"
                value={previousDue}
                onChange={(e) => setPreviousDue(Number(e.target.value))}
                className="w-24 bg-transparent border-b border-transparent hover:border-accent/30 focus:border-accent outline-none text-right transition-colors"
              />
            </div>
            <div className="flex justify-between items-center gap-4 text-muted">
              <span>Paid Amount:</span>
              <input
                type="number"
                min="0"
                step="any"
                max={grandTotal}
                value={paidAmount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val > grandTotal) {
                    setPaidAmount(grandTotal);
                    toast.error(`Paid amount cannot exceed grand total (${formatCurrency(grandTotal)})`);
                  } else {
                    setPaidAmount(val);
                  }
                }}
                className="w-24 bg-primary border border-accent/10 rounded px-2 py-1 text-right outline-none focus:border-accent"
              />
            </div>
            <div className="flex justify-between items-center text-xl font-display font-bold text-accent pt-2 border-t border-accent/10">
              <div className="flex items-center gap-2">
                <span>Grand Total:</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-normal text-muted bg-primary/50 px-2 py-1 rounded border border-accent/10">
                  <input 
                    type="checkbox" 
                    checked={isRoundOff} 
                    onChange={(e) => setIsRoundOff(e.target.checked)} 
                    className="accent-accent cursor-pointer"
                  />
                  <span>Round Off</span>
                </label>
              </div>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
            <div className="flex justify-between text-muted text-sm">
              <span>Current Bill Due:</span>
              <span className="text-red-500">{formatCurrency(Math.max(0, grandTotal - paidAmount))}</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:max-w-xl">
            <motion.button 
              whileTap={{ scale: 0.97 }}
              onClick={() => { 
                setBillItems([]); 
                setCustomer({ name: "", address: "", email: "" }); 
                setPhones([""]); 
                localStorage.removeItem("bill_draft");
              }}
              disabled={isSaving || isPrinting}
              className="flex-1 bg-primary text-muted font-bold py-3 rounded-xl hover:text-text transition-all border border-accent/10 sm:border-none disabled:opacity-50"
            >
              Clear
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveDraft}
              disabled={isSaving || isPrinting}
              className="flex-1 bg-primary text-muted font-bold py-3 rounded-xl hover:text-text transition-all border border-accent/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Save Draft
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.97 }}
              onClick={() => handleGenerateBill("save")}
              disabled={isSaving || isPrinting}
              className="flex-1 bg-accent/20 text-accent font-bold py-3 rounded-xl hover:bg-accent/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Bill
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.97 }}
              onClick={() => handleGenerateBill("print")}
              disabled={isSaving || isPrinting}
              className="flex-1 bg-accent text-primary font-bold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-accent/20"
            >
              {isPrinting && <Loader2 className="w-4 h-4 animate-spin" />}
              Print Bill
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
