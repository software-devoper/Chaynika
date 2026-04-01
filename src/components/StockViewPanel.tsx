import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
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
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          type="text"
          placeholder="Search by Product Name or Group..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-primary border border-accent/10 rounded-xl pl-12 pr-4 py-3 text-text focus:border-accent outline-none transition-all"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-accent/10 text-muted text-sm uppercase tracking-wider">
              <th className="px-4 py-4 font-medium">Sr. No.</th>
              <th className="px-4 py-4 font-medium">Product Name</th>
              <th className="px-4 py-4 font-medium">Group</th>
              <th className="px-4 py-4 font-medium">Stock</th>
              <th className="px-4 py-4 font-medium">Purchase Rate</th>
              <th className="px-4 py-4 font-medium">MRP</th>
            </tr>
          </thead>
          <tbody className="text-text">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted italic">
                  Loading stock data...
                </td>
              </tr>
            ) : filteredProducts.map((product, index) => (
              <tr key={product.id} className="border-b border-accent/5 hover:bg-primary/50 transition-colors">
                <td className="px-4 py-4">{index + 1}</td>
                <td className="px-4 py-4 font-medium">{product.name}</td>
                <td className="px-4 py-4 text-muted">{product.groupName}</td>
                <td className="px-4 py-4">{product.stock}</td>
                <td className="px-4 py-4">{formatCurrency(product.purchaseRate)}</td>
                <td className="px-4 py-4 text-accent font-medium">{formatCurrency(product.mrp)}</td>
              </tr>
            ))}
            {!loading && filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted italic">
                  No products found
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-primary/30 font-bold">
              <td colSpan={3} className="px-4 py-4 text-right">TOTALS:</td>
              <td className="px-4 py-4">{totalQuantity}</td>
              <td colSpan={2} className="px-4 py-4"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
