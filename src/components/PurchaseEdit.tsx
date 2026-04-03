import React, { useState, useEffect } from "react";
import { Search, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { Group, Subgroup, Product } from "../types";
import { productApi, groupApi, subgroupApi } from "../lib/api";

export default function PurchaseEdit() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [allSubgroups, setAllSubgroups] = useState<Subgroup[]>([]);
  const [filteredSubgroups, setFilteredSubgroups] = useState<Subgroup[]>([]);
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
    const unsubSubgroups = subgroupApi.getAll(setAllSubgroups);
    return () => {
      unsubProducts();
      unsubGroups();
      unsubSubgroups();
    };
  }, []);

  useEffect(() => {
    if (selectedProduct?.groupId) {
      setFilteredSubgroups(allSubgroups.filter(sg => sg.groupId === selectedProduct.groupId));
    } else {
      setFilteredSubgroups([]);
    }
  }, [selectedProduct?.groupId, allSubgroups]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.subgroupName && p.subgroupName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    try {
      const selectedGroup = groups.find(g => g.id === selectedProduct.groupId);
      const selectedSubgroup = allSubgroups.find(sg => sg.id === selectedProduct.subgroupId);
      
      await productApi.update(selectedProduct.id, {
        ...selectedProduct,
        groupName: selectedGroup?.name || selectedProduct.groupName,
        subgroupName: selectedSubgroup?.name || selectedProduct.subgroupName || ""
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
              placeholder="Search product, group or subgroup..."
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
                  <div className="flex flex-col">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-[10px] text-muted uppercase tracking-wider">{p.subgroupName || 'No Subgroup'}</span>
                  </div>
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
          <div className="md:col-span-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h4 className="text-lg font-bold text-accent">Editing: {selectedProduct.name}</h4>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-muted hover:text-text w-full sm:w-auto text-left sm:text-right"
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
            <label className="block text-sm font-medium text-muted mb-2">Group/Company</label>
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
            <label className="block text-sm font-medium text-muted mb-2">Subgroup/Category</label>
            <select
              required
              value={selectedProduct.subgroupId}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, subgroupId: e.target.value })}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
            >
              <option value="">Select Subgroup</option>
              {filteredSubgroups.map((sg) => (
                <option key={sg.id} value={sg.id}>
                  {sg.name}
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

          <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 bg-accent text-primary font-bold py-3 rounded-xl hover:opacity-90 transition-all order-1 sm:order-none"
            >
              Update
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-6 py-3 sm:py-0 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center order-2 sm:order-none"
            >
              <Trash2 size={20} className="mr-2 sm:mr-0" />
              <span className="sm:hidden">Delete Product</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
