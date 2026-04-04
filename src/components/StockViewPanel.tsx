import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { motion } from "motion/react";
import { formatCurrency } from "../lib/utils";
import { Product } from "../types";
import { productApi } from "../lib/api";

export default function StockViewPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = productApi.getAll((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalQuantity = filteredProducts.reduce((sum, p) => sum + p.stock, 0);

  return (
    <div className="space-y-6">
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
      <div className="hidden md:block overflow-x-auto rounded-xl border border-accent/10 bg-surface">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="bg-primary/50 border-b border-accent/10 text-muted text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-medium text-center">Sr. No.</th>
              <th className="px-6 py-4 font-medium text-center">Product Name</th>
              <th className="px-6 py-4 font-medium text-center">Party Name</th>
              <th className="px-6 py-4 font-medium text-center">Stock</th>
              <th className="px-6 py-4 font-medium text-center">Purchase Rate</th>
              <th className="px-6 py-4 font-medium text-center">Wholesale Rate</th>
              <th className="px-6 py-4 font-medium text-center">MRP</th>
            </tr>
          </thead>
          <tbody className="text-text divide-y divide-accent/5">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-muted italic">
                  Loading stock data...
                </td>
              </tr>
            ) : filteredProducts.map((product, index) => (
              <motion.tr 
                key={product.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="hover:bg-primary/30 transition-colors group"
              >
                <td className="px-6 py-4 text-muted text-center">{index + 1}</td>
                <td className="px-6 py-4 font-medium group-hover:text-accent transition-colors text-center">{product.name}</td>
                <td className="px-6 py-4 text-muted text-center">{product.groupName}</td>
                <td className="px-6 py-4 text-center font-medium">{product.stock}</td>
                <td className="px-6 py-4 text-center text-muted">{formatCurrency(product.purchaseRate)}</td>
                <td className="px-6 py-4 text-center text-muted">{formatCurrency(product.wholesaleRate)}</td>
                <td className="px-6 py-4 text-center text-accent font-medium">{formatCurrency(product.mrp)}</td>
              </motion.tr>
            ))}
            {!loading && filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-muted italic">
                  No products found matching your search.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-primary/50 border-t border-accent/10">
            <tr className="font-bold text-text">
              <td colSpan={3} className="px-6 py-4 text-right uppercase tracking-wider text-xs text-muted">Total Stock Quantity:</td>
              <td className="px-6 py-4 text-center text-lg text-accent">{totalQuantity}</td>
              <td colSpan={3} className="px-6 py-4"></td>
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
        ) : filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-muted italic bg-surface border border-accent/10 rounded-xl">
            No products found matching your search.
          </div>
        ) : (
          filteredProducts.map((product, index) => (
            <motion.div 
              key={product.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-surface border border-accent/10 rounded-xl p-4 shadow-sm hover:border-accent/30 transition-colors flex flex-col gap-3"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="text-xs text-muted mb-1">#{index + 1}</div>
                  <h4 className="font-bold text-text text-lg leading-tight">{product.name}</h4>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-muted uppercase tracking-wider mb-1">Stock</span>
                  <span className="font-bold text-accent text-xl">{product.stock}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 bg-primary text-muted text-xs rounded-md border border-accent/5">
                  {product.groupName}
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
        
        {!loading && filteredProducts.length > 0 && (
          <div className="bg-primary/50 border border-accent/10 rounded-xl p-4 flex justify-between items-center mt-2">
            <span className="text-sm font-medium text-muted uppercase tracking-wider">Total Stock</span>
            <span className="text-xl font-bold text-accent">{totalQuantity}</span>
          </div>
        )}
      </div>
    </div>
  );
}
