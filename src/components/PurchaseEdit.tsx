import React, { useState, useEffect } from "react";
import { Search, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { Group, Product } from "../types";
import { productApi, groupApi } from "../lib/api";

export default function PurchaseEdit() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

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
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    try {
      const selectedGroup = groups.find(g => g.id === selectedProduct.groupId);
      await productApi.update(selectedProduct.id, {
        ...selectedProduct,
        groupName: selectedGroup?.name || selectedProduct.groupName
      });
      toast.success("Product updated successfully");
      setSelectedProduct(null);
      setSearchTerm("");
    } catch (err) {
      toast.error("Failed to update product");
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await productApi.delete(selectedProduct.id);
        toast.success("Product deleted");
        setSelectedProduct(null);
        setSearchTerm("");
      } catch (err) {
        toast.error("Failed to delete product");
      }
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {!selectedProduct ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="Search product to edit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-primary border border-accent/10 rounded-xl pl-12 pr-4 py-3 text-text focus:border-accent outline-none transition-all"
            />
          </div>
          
          {searchTerm && (
            <div className="bg-primary border border-accent/10 rounded-xl overflow-hidden divide-y divide-accent/5">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className="w-full text-left px-4 py-3 hover:bg-surface transition-colors flex justify-between items-center"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted">{p.groupName}</span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="px-4 py-3 text-muted text-center">No products found</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 flex justify-between items-center">
            <h4 className="text-lg font-bold text-accent">Editing: {selectedProduct.name}</h4>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-muted hover:text-text"
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
              onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">Group</label>
            <select
              required
              value={selectedProduct.groupId}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, groupId: e.target.value })}
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
              value={selectedProduct.stock}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, stock: Number(e.target.value) })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">Purchase Rate</label>
            <input
              type="number"
              value={selectedProduct.purchaseRate}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, purchaseRate: Number(e.target.value) })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">MRP</label>
            <input
              type="number"
              value={selectedProduct.mrp}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, mrp: Number(e.target.value) })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            />
          </div>

          <div className="md:col-span-2 flex gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 bg-accent text-primary font-bold py-3 rounded-xl hover:opacity-90 transition-all"
            >
              Update
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-6 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
