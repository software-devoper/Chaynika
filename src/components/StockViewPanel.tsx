import React, { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, Edit2, X, Loader2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatCurrency, capitalizeFirstLetter } from "../lib/utils";
import { Product, Group } from "../types";
import { productApi, groupApi } from "../lib/api";
import { toast } from "react-hot-toast";

export default function StockViewPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const itemsPerPage = 50;

  useEffect(() => {
    const unsubscribeProducts = productApi.getAll((data) => {
      setProducts(data);
      setLoading(false);
    });
    const unsubscribeGroups = groupApi.getAll(setGroups);
    return () => {
      unsubscribeProducts();
      unsubscribeGroups();
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    setIsUpdating(true);
    try {
      const selectedGroup = groups.find(g => g.id === editingProduct.groupId);
      const newGroupName = selectedGroup?.name || editingProduct.groupName;
      
      // Find the original product to get the key it was merged by
      const originalProduct = products.find(p => p.id === editingProduct.id);
      
      if (originalProduct) {
        const originalKey = `${originalProduct.name.toLowerCase()}|${originalProduct.groupName.toLowerCase()}|${originalProduct.purchaseRate}|${originalProduct.wholesaleRate}|${originalProduct.mrp}`;
        
        // Find all products that match this key
        const matchingProducts = products.filter(p => {
          const key = `${p.name.toLowerCase()}|${p.groupName.toLowerCase()}|${p.purchaseRate}|${p.wholesaleRate}|${p.mrp}`;
          return key === originalKey;
        });

        // 1. Update the primary product with all new details (including the new stock)
        await productApi.update(editingProduct.id, {
          ...editingProduct,
          groupName: newGroupName,
          subgroupId: "",
          subgroupName: ""
        });

        // 2. Delete all other products that were part of this merged row
        // This consolidates them into the single primary product
        for (const p of matchingProducts) {
          if (p.id !== editingProduct.id) {
            await productApi.delete(p.id);
          }
        }
      } else {
        // Fallback if original product not found (shouldn't happen)
        await productApi.update(editingProduct.id, {
          ...editingProduct,
          groupName: newGroupName,
          subgroupId: "",
          subgroupName: ""
        });
      }

      toast.success("Product updated successfully");
      setEditingProduct(null);
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Failed to update product");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent | React.KeyboardEvent, product?: Product) => {
    e.preventDefault();
    e.stopPropagation();
    
    const productToDelete = product || editingProduct;
    if (!productToDelete) return;

    if (window.confirm("Are you sure you want to delete this product stock completely? This action cannot be undone.")) {
      try {
        const originalKey = `${productToDelete.name.toLowerCase()}|${productToDelete.groupName.toLowerCase()}|${productToDelete.purchaseRate}|${productToDelete.wholesaleRate}|${productToDelete.mrp}`;
        const matchingProducts = products.filter(p => {
          const key = `${p.name.toLowerCase()}|${p.groupName.toLowerCase()}|${p.purchaseRate}|${p.wholesaleRate}|${p.mrp}`;
          return key === originalKey;
        });

        for (const p of matchingProducts) {
          await productApi.delete(p.id);
        }
        toast.success("Product deleted successfully");
        if (productToDelete === editingProduct) {
          setEditingProduct(null);
        }
      } catch (err) {
        console.error("Delete error:", err);
        toast.error("Failed to delete product");
      }
    }
  };

  const mergedProducts = React.useMemo(() => {
    const map = new Map<string, Product>();
    
    products.forEach(p => {
      const key = `${p.name.toLowerCase()}|${p.groupName.toLowerCase()}|${p.purchaseRate}|${p.wholesaleRate}|${p.mrp}`;
      if (map.has(key)) {
        const existing = map.get(key)!;
        map.set(key, {
          ...existing,
          stock: existing.stock + p.stock,
          updatedAt: Math.max(existing.updatedAt, p.updatedAt)
        });
      } else {
        map.set(key, { ...p });
      }
    });
    
    return Array.from(map.values());
  }, [products]);

  const filteredProducts = mergedProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalQuantity = filteredProducts.reduce((sum, p) => sum + p.stock, 0);
  
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          type="text"
          placeholder="Search by Product or Party..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-primary border border-accent/10 rounded-xl pl-12 pr-4 py-3 text-text focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all shadow-sm"
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar rounded-xl border border-accent/10 bg-surface">
        <table className="w-full text-center border-collapse relative">
          <thead className="sticky top-0 z-10 bg-surface shadow-sm">
            <tr className="bg-accent/10 border-b border-accent/20 text-accent text-base font-black uppercase tracking-widest">
              <th className="px-6 py-5 font-bold text-center">Sr. No.</th>
              <th className="px-6 py-5 font-bold text-center">Date</th>
              <th className="px-6 py-5 font-bold text-center">Product Name</th>
              <th className="px-6 py-5 font-bold text-center">Party Name</th>
              <th className="px-6 py-5 font-bold text-center">Stock</th>
              <th className="px-6 py-5 font-bold text-center">Purchase Rate</th>
              <th className="px-6 py-5 font-bold text-center">Wholesale Rate</th>
              <th className="px-6 py-5 font-bold text-center">MRP</th>
              <th className="px-6 py-5 font-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-text divide-y divide-accent/5">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-muted italic">
                  Loading stock data...
                </td>
              </tr>
            ) : paginatedProducts.map((product, index) => (
              <motion.tr 
                key={product.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: (index % 10) * 0.05 }}
                className="hover:bg-primary/30 transition-colors group"
              >
                <td className="px-6 py-4 text-muted text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                <td className="px-6 py-4 text-muted text-center">{new Date(product.updatedAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-medium group-hover:text-accent transition-colors text-center">{product.name}</td>
                <td className="px-6 py-4 text-muted text-center">{product.groupName}</td>
                <td className="px-6 py-4 text-center font-medium">{product.stock}</td>
                <td className="px-6 py-4 text-center text-muted">{formatCurrency(product.purchaseRate)}</td>
                <td className="px-6 py-4 text-center text-muted">{formatCurrency(product.wholesaleRate)}</td>
                <td className="px-6 py-4 text-center text-accent font-medium">{formatCurrency(product.mrp)}</td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => setEditingProduct(product)}
                    onKeyDown={(e) => {
                      if (e.key === "Delete") {
                        handleDelete(e, product);
                      }
                    }}
                    className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
                    title="Edit Product (Press Delete to remove)"
                  >
                    <Edit2 size={16} />
                  </button>
                </td>
              </motion.tr>
            ))}
            {!loading && paginatedProducts.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-muted italic">
                  No products found matching your search.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-primary/50 border-t border-accent/10">
            <tr className="font-bold text-text">
              <td colSpan={4} className="px-6 py-4 text-right uppercase tracking-wider text-xs text-muted">Total Stock Quantity:</td>
              <td className="px-6 py-4 text-center text-lg text-accent">{totalQuantity}</td>
              <td colSpan={4} className="px-6 py-4"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {loading ? (
          <div className="py-12 text-center text-muted italic bg-surface border border-accent/10 rounded-xl">
            Loading stock data...
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="py-12 text-center text-muted italic bg-surface border border-accent/10 rounded-xl">
            No products found matching your search.
          </div>
        ) : (
          paginatedProducts.map((product, index) => (
            <motion.div 
              key={product.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: (index % 10) * 0.05 }}
              className="bg-surface border border-accent/10 rounded-xl p-4 shadow-sm hover:border-accent/30 transition-colors flex flex-col gap-3 relative"
            >
              <div className="absolute top-4 right-4 flex items-center gap-1">
                <button
                  onClick={() => setEditingProduct(product)}
                  onKeyDown={(e) => {
                    if (e.key === "Delete") {
                      handleDelete(e, product);
                    }
                  }}
                  className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
                  title="Edit Product (Press Delete to remove)"
                >
                  <Edit2 size={16} />
                </button>
              </div>
              <div className="flex justify-between items-start gap-2 pr-10">
                <div>
                  <div className="text-xs text-muted mb-1">#{(currentPage - 1) * itemsPerPage + index + 1} • {new Date(product.updatedAt).toLocaleDateString()}</div>
                  <h4 className="font-bold text-text text-lg leading-tight">{product.name}</h4>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 bg-primary text-muted text-xs rounded-md border border-accent/5">
                  {product.groupName}
                </span>
                <span className="px-2.5 py-1 bg-accent/10 text-accent font-bold text-xs rounded-md border border-accent/20">
                  Stock: {product.stock}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-accent/5 mt-1">
                <div>
                  <div className="text-xs text-muted mb-1">Purchase Rate</div>
                  <div className="font-medium text-text">{formatCurrency(product.purchaseRate)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-1">Wholesale Rate</div>
                  <div className="font-medium text-text">{formatCurrency(product.wholesaleRate)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted mb-1">MRP</div>
                  <div className="font-medium text-accent">{formatCurrency(product.mrp)}</div>
                </div>
              </div>
            </motion.div>
          ))
        )}
        
        {!loading && paginatedProducts.length > 0 && (
          <div className="bg-primary/50 border border-accent/10 rounded-xl p-4 flex justify-between items-center mt-2">
            <span className="text-sm font-medium text-muted uppercase tracking-wider">Total Stock</span>
            <span className="text-xl font-bold text-accent">{totalQuantity}</span>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between bg-surface border border-accent/10 rounded-xl p-4 mt-6">
          <div className="text-sm text-muted">
            Showing <span className="font-medium text-text">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-text">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> of <span className="font-medium text-text">{filteredProducts.length}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-accent/10 text-text hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum 
                        ? 'bg-accent text-primary' 
                        : 'border border-accent/10 text-text hover:bg-primary'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-accent/10 text-text hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-accent/10"
            >
              <div className="flex justify-between items-center p-6 border-b border-accent/10">
                <h3 className="text-xl font-bold text-text">Edit Product</h3>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="p-2 text-muted hover:text-text hover:bg-primary rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleUpdate} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-muted mb-1">Product Name</label>
                    <input
                      required
                      type="text"
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: capitalizeFirstLetter(e.target.value) })}
                      className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-2 text-text focus:border-accent outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Party Name</label>
                    <select
                      required
                      value={editingProduct.groupId}
                      onChange={(e) => setEditingProduct({ ...editingProduct, groupId: e.target.value })}
                      className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-2 text-text focus:border-accent outline-none transition-all"
                    >
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={editingProduct.stock}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                      className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-2 text-text focus:border-accent outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Purchase Rate</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editingProduct.purchaseRate}
                      onChange={(e) => setEditingProduct({ ...editingProduct, purchaseRate: Number(e.target.value) })}
                      className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-2 text-text focus:border-accent outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Wholesale Rate</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editingProduct.wholesaleRate}
                      onChange={(e) => setEditingProduct({ ...editingProduct, wholesaleRate: Number(e.target.value) })}
                      className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-2 text-text focus:border-accent outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">MRP</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editingProduct.mrp}
                      onChange={(e) => setEditingProduct({ ...editingProduct, mrp: Number(e.target.value) })}
                      className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-2 text-text focus:border-accent outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Base Unit</label>
                    <select
                      value={editingProduct.unit}
                      onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                      className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-2 text-text focus:border-accent outline-none transition-all"
                    >
                      <option value="Pcs">Pcs</option>
                      <option value="Box">Box</option>
                      <option value="Pack">Pack</option>
                      <option value="Chain">Chain</option>
                      <option value="Kg">Kg</option>
                      <option value="Ltr">Ltr</option>
                      <option value="Bag">Bag</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <label className="flex items-center gap-2 cursor-pointer p-3 border border-accent/10 rounded-xl bg-primary/30">
                      <input 
                        type="checkbox" 
                        checked={!!editingProduct.secondaryUnit}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingProduct({ ...editingProduct, secondaryUnit: "Box", conversionRate: 10 });
                          } else {
                            setEditingProduct({ ...editingProduct, secondaryUnit: undefined, conversionRate: undefined });
                          }
                        }}
                        className="accent-accent w-4 h-4"
                      />
                      <span className="font-medium text-text">Enable Secondary Unit (Bulk/Pack)</span>
                    </label>

                    {editingProduct.secondaryUnit && (
                      <div className="flex gap-4 items-center bg-primary/20 p-4 rounded-xl border border-accent/10">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-muted font-medium">1</span>
                          <select 
                            value={editingProduct.secondaryUnit} 
                            onChange={(e) => setEditingProduct({ ...editingProduct, secondaryUnit: e.target.value })}
                            className="w-full bg-surface border border-accent/20 rounded-lg px-3 py-2 text-text outline-none focus:border-accent"
                          >
                            <option value="Box">Box</option>
                            <option value="Pack">Pack</option>
                            <option value="Chain">Chain</option>
                            <option value="Case">Case</option>
                            <option value="Dozen">Dozen</option>
                            <option value="Bag">Bag</option>
                          </select>
                        </div>
                        <span className="text-muted font-bold text-lg">=</span>
                        <div className="flex items-center gap-3 flex-1">
                          <input 
                            type="number" 
                            min="1"
                            value={editingProduct.conversionRate || ""} 
                            onChange={(e) => setEditingProduct({ ...editingProduct, conversionRate: Number(e.target.value) })}
                            className="w-full bg-surface border border-accent/20 rounded-lg px-3 py-2 text-center text-text outline-none focus:border-accent"
                            placeholder="Qty" 
                          />
                          <span className="text-muted font-medium w-16 truncate">{editingProduct.unit}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-accent/10 mt-6">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, editingProduct)}
                    className="px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={18} />
                    <span>Delete Item</span>
                  </button>
                  
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="px-6 py-2 text-muted hover:text-text font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="px-6 py-2 bg-accent text-primary font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
