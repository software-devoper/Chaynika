import React, { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { formatCurrency } from "../lib/utils";
import { Product } from "../types";
import { productApi } from "../lib/api";

export default function StockViewPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    const unsubscribe = productApi.getAll((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredProducts = products.filter(
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
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar rounded-xl border border-accent/10 bg-surface">
        <table className="w-full text-center border-collapse relative">
          <thead className="sticky top-0 z-10 bg-surface shadow-sm">
            <tr className="bg-primary/50 border-b border-accent/10 text-muted text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-medium text-center">Sr. No.</th>
              <th className="px-6 py-4 font-medium text-center">Date</th>
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
                <td colSpan={8} className="px-6 py-12 text-center text-muted italic">
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
              </motion.tr>
            ))}
            {!loading && paginatedProducts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-muted italic">
                  No products found matching your search.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-primary/50 border-t border-accent/10">
            <tr className="font-bold text-text">
              <td colSpan={4} className="px-6 py-4 text-right uppercase tracking-wider text-xs text-muted">Total Stock Quantity:</td>
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
              className="bg-surface border border-accent/10 rounded-xl p-4 shadow-sm hover:border-accent/30 transition-colors flex flex-col gap-3"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="text-xs text-muted mb-1">#{(currentPage - 1) * itemsPerPage + index + 1} • {new Date(product.updatedAt).toLocaleDateString()}</div>
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
    </div>
  );
}
