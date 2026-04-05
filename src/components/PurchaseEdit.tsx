import React, { useState, useEffect, useCallback } from "react";
import { Search, Trash2, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { Group, Product } from "../types";
import { productApi, groupApi } from "../lib/api";
import { motion } from "motion/react";
import { capitalizeFirstLetter } from "../lib/utils";

export default function PurchaseEdit() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const unsubProducts = productApi.getAll((data) => {
      setProducts(data);
      setLoading(false);
    });
    const unsubGroups = groupApi.getAll(setGroups);
    return () => {
      unsubProducts();
      unsubGroups();
    };
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredProducts.length) {
        setSelectedProduct(filteredProducts[activeIndex]);
      } else if (filteredProducts.length === 1) {
        setSelectedProduct(filteredProducts[0]);
      }
    }
  };

  const handleDelete = useCallback(async () => {
    if (!selectedProduct) return;
    setIsDeleting(true);
    try {
      await productApi.delete(selectedProduct.id);
      toast.success("Product deleted");
      setSelectedProduct(null);
      setSearchTerm("");
      setShowDeleteConfirm(false);
    } catch (err) {
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedProduct]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        handleDelete();
      } else if (e.altKey && e.key === 'd') {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleDelete]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchTerm]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    setIsUpdating(true);
    try {
      const selectedGroup = groups.find(g => g.id === selectedProduct.groupId);
      
      await productApi.update(selectedProduct.id, {
        ...selectedProduct,
        groupName: selectedGroup?.name || selectedProduct.groupName,
        subgroupId: "",
        subgroupName: ""
      });
      toast.success("Product updated successfully");
      setSelectedProduct(null);
      setSearchTerm("");
    } catch (err) {
      toast.error("Failed to update product");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl space-y-6"
    >
      {!selectedProduct ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="Search product or party..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(capitalizeFirstLetter(e.target.value))}
              onKeyDown={handleKeyDown}
              className="w-full bg-primary border border-accent/10 rounded-xl pl-12 pr-4 py-3 text-text focus:border-accent outline-none transition-all shadow-sm"
            />
          </div>
          
          {searchTerm && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary border border-accent/10 rounded-xl overflow-hidden divide-y divide-accent/5 shadow-lg"
            >
              {filteredProducts.map((p, index) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`w-full text-left px-4 py-3 transition-colors flex justify-between items-center ${
                    index === activeIndex ? 'bg-accent/10' : 'hover:bg-surface'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <span className="text-xs text-muted">{p.groupName}</span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="px-4 py-3 text-muted text-center">No products found</div>
              )}
            </motion.div>
          )}
        </div>
      ) : (
        <motion.form 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onSubmit={handleUpdate}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface p-6 rounded-2xl border border-accent/10 shadow-xl"
        >
          <div className="md:col-span-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-accent/10 pb-4">
            <h4 className="text-lg font-bold text-accent">Editing: {selectedProduct.name}</h4>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-muted hover:text-text w-full sm:w-auto text-left sm:text-right font-medium"
            >
              Cancel
            </button>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-muted mb-2">Product Name</label>
            <input
              required
              type="text"
              value={selectedProduct.name}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, name: capitalizeFirstLetter(e.target.value) })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">Party Name</label>
            <select
              required
              value={selectedProduct.groupId}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, groupId: e.target.value, subgroupId: "" })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            >
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
              type="number"
              min="0"
              value={selectedProduct.stock}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, stock: Number(e.target.value) })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">Purchase Rate</label>
            <input
              type="number"
              min="0"
              value={selectedProduct.purchaseRate}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, purchaseRate: Number(e.target.value) })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">Wholesale Rate</label>
            <input
              type="number"
              min="0"
              value={selectedProduct.wholesaleRate}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, wholesaleRate: Number(e.target.value) })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">MRP</label>
            <input
              type="number"
              min="0"
              value={selectedProduct.mrp}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, mrp: Number(e.target.value) })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            />
          </div>

          <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 pt-4 border-t border-accent/10 mt-2">
            {!showDeleteConfirm ? (
              <>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={isUpdating || isDeleting}
                  className="flex-1 bg-accent text-primary font-bold py-3 rounded-xl hover:opacity-90 transition-all order-1 sm:order-none flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-accent/20"
                >
                  {isUpdating && <Loader2 className="w-5 h-5 animate-spin" />}
                  Update
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isUpdating || isDeleting}
                  className="px-6 py-3 sm:py-0 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center order-2 sm:order-none disabled:opacity-50"
                >
                  <Trash2 size={20} className="mr-2 sm:mr-0" />
                  <span className="sm:hidden">Delete Product</span>
                </motion.button>
              </>
            ) : (
              <div className="flex-1 flex flex-col sm:flex-row gap-4 items-center bg-red-500/5 p-4 rounded-xl border border-red-500/20">
                <span className="text-red-500 font-medium text-sm">Are you sure? This cannot be undone.</span>
                <div className="flex gap-2 w-full sm:w-auto ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 sm:flex-none px-4 py-2 text-muted hover:text-text font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 sm:flex-none px-6 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                  >
                    {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.form>
      )}
    </motion.div>
  );
}
