import React from "react";
import { 
  Package, Search, Plus, Trash2, Edit2, Check, AlertTriangle, X 
} from "lucide-react";
import { Product } from "../types";
import api from "../lib/api";

interface ProductsPanelProps {
  products: Product[];
  onRefreshNeeded: () => void;
  currency: string;
  isReadOnly?: boolean;
}

export default function ProductsPanel({ products, onRefreshNeeded, currency, isReadOnly = false }: ProductsPanelProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("All");

  const [isEditing, setIsEditing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  
  // Form elements
  const [prodId, setProdId] = React.useState("");
  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [unit, setUnit] = React.useState<"KG" | "Bag" | "Maund" | "Ton" | "bag of 10 kg" | "bag of 15 kg" | "bag of 20 kg" | "bag of 80 kg">("KG");
  const [costPrice, setCostPrice] = React.useState("");
  const [sellingPrice, setSellingPrice] = React.useState("");
  const [stockQuantity, setStockQuantity] = React.useState("");
  const [minStockAlert, setMinStockAlert] = React.useState("");
  const [category, setCategory] = React.useState("Flour");

  const [loading, setLoading] = React.useState(false);

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const sQuery = searchQuery.toLowerCase();
    const match = p.name.toLowerCase().includes(sQuery) || p.sku.toLowerCase().includes(sQuery);
    const catMatch = selectedCategory === "All" || p.category === selectedCategory;
    return match && catMatch;
  });

  const handleEditClick = (p: Product) => {
    setProdId(p.id);
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcode || "");
    setUnit(p.unit);
    setCostPrice(p.costPrice.toString());
    setSellingPrice(p.sellingPrice.toString());
    setStockQuantity(p.stockQuantity.toString());
    setMinStockAlert(p.minStockAlert.toString());
    setCategory(p.category);
    setIsEditing(true);
    setErrorMessage("");
  };

  const handleAddNewClick = () => {
    setProdId("");
    setName("");
    setSku(`FL-${Math.floor(Math.random() * 90000 + 10000)}`);
    setBarcode("");
    setUnit("KG");
    setCostPrice("");
    setSellingPrice("");
    setStockQuantity("0");
    setMinStockAlert("100");
    setCategory("Flour");
    setIsEditing(true);
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !costPrice || !sellingPrice) {
      setErrorMessage("Please fill out all marked required fields.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      await api.tenant.saveProduct({
        id: prodId || undefined,
        name,
        sku,
        barcode,
        unit,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        stockQuantity: Number(stockQuantity),
        minStockAlert: Number(minStockAlert),
        category
      });
      setIsEditing(false);
      onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update product schema.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    setErrorMessage("");
    try {
      await api.tenant.deleteProduct(id);
      onRefreshNeeded();
    } catch (err: any) {
      console.error("Deletion failed:", err);
      setErrorMessage(err.message || "Failed to remove product from catalog.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-xs text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 pb-4 mb-5 gap-3">
        <div>
          <h2 className="font-bold text-gray-950 text-base md:text-lg flex items-center gap-2">
            <Package className="w-5.5 h-5.5 text-blue-600" />
            Flour Mill Catalog List
          </h2>
          <p className="text-xs text-gray-400">Add Atta grades, grain raw materials, sack units and base sales cost metrics</p>
        </div>
        
        {!isReadOnly && (
          <button
            onClick={handleAddNewClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>
      
      {errorMessage && !isEditing && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex justify-between items-center">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, SKU or brand barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400 transition"
          />
        </div>
        
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
                selectedCategory === cat 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog lists area */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-700">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px]">
              <th className="py-2 px-3">Product Classifier</th>
              <th className="py-2 px-3">SKU Code</th>
              <th className="py-2 px-3">Unit Level</th>
              <th className="py-2 px-3 text-right">Procure Cost</th>
              <th className="py-2 px-3 text-right">Selling Price</th>
              <th className="py-2 px-3 text-center">In-Stock qty</th>
              <th className="py-2 px-3 text-center">Alert Limit</th>
              <th className="py-2 px-3 text-center print:hidden">{isReadOnly ? "Role State" : "Operation"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 opacity-100">
            {filteredProducts.map(p => {
              const isAlert = p.stockQuantity <= p.minStockAlert;
              return (
                <tr key={p.id} className="hover:bg-gray-50/40">
                  <td className="py-3 px-3">
                    <span className="font-bold text-gray-950 block">{p.name}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold py-0.5 px-2 rounded-md inline-block mt-1">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-gray-500">{p.sku}</td>
                  <td className="py-3 px-3 font-medium text-gray-600 uppercase">{p.unit}</td>
                  <td className="py-3 px-3 text-right font-semibold text-gray-600">{currency} {p.costPrice}</td>
                  <td className="py-3 px-3 text-right font-extrabold text-blue-600">{currency} {p.sellingPrice}</td>
                  <td className="py-3 px-3 text-center font-bold">
                    <span className={`px-2 py-0.5 rounded-full ${
                      isAlert ? "bg-red-50 text-red-600 font-extrabold" : "bg-green-50 text-green-600"
                    }`}>
                    {p.stockQuantity} {p.unit}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-gray-500 font-semibold">{p.minStockAlert} {p.unit}</td>
                  <td className="py-3 px-3 text-center print:hidden">
                    {isReadOnly ? (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
                        🔒 Read-Only
                      </span>
                    ) : (
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleEditClick(p)}
                          className="p-1 px-1.5 border border-gray-150 rounded-lg hover:border-blue-200 text-gray-500 hover:text-blue-600 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(p.id)}
                          className="p-1 px-1.5 border border-gray-150 rounded-lg hover:border-red-200 text-gray-400 hover:text-red-500 cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-xs">No catalog items to render. Make one today!</div>
      )}

      {/* EDIT/ADD PRODUCT SCHEMA DIALOG OVERLAY */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-left border border-gray-100 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsEditing(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-3 mb-4 text-sm md:text-base flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              {prodId ? "Modify Catalog Item" : "Register Catalog Item"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Product Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fine Maida No. 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">SKU identifier *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FL-MD-44"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full rounded-xl border border-gray-100 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Barcode</label>
                  <input
                    type="text"
                    placeholder="89001"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full rounded-xl border border-gray-100 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Category Group</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-100 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 bg-white"
                  >
                    <option value="Flour">Flour (Atta)</option>
                    <option value="Grain">Wheat Grain</option>
                    <option value="Feed">Wheat Feed (Chokar)</option>
                    <option value="Packaging">Sacks & Packaging</option>
                    <option value="Other">Other Items</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Stock Unit Level</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full rounded-xl border border-gray-100 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 bg-white bg-[image:none]"
                  >
                    <option value="KG">Kilograms (KG)</option>
                    <option value="bag of 10 kg">Bag of 10 kg</option>
                    <option value="bag of 15 kg">Bag of 15 kg</option>
                    <option value="bag of 20 kg">Bag of 20 kg</option>
                    <option value="bag of 80 kg">Bag of 80 kg</option>
                    <option value="Bag">Standard Bag (50 KG)</option>
                    <option value="Maund">Maund (40 KG)</option>
                    <option value="Ton">Ton (Metric Ton)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Procurement Cost Price *</label>
                  <input
                    type="number"
                    required
                    placeholder="65"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full rounded-xl border border-gray-100 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Selling Base Price *</label>
                  <input
                    type="number"
                    required
                    placeholder="80"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full rounded-xl border border-gray-100 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Opening Stock Qty</label>
                  <input
                    type="number"
                    required
                    placeholder="250"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full rounded-xl border border-gray-100 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                    disabled={!!prodId} // Prevent raw editing of inventory stock quantity - must go through adjustments!
                  />
                  {prodId && <span className="text-[8px] text-slate-400 leading-none">Use inventory logs top actions.</span>}
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Min Stock Alert Limit</label>
                  <input
                    type="number"
                    required
                    placeholder="100"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    className="w-full rounded-xl border border-gray-100 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-2 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">{errorMessage}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center cursor-pointer"
              >
                {loading ? "Saving Item..." : "Confirm Save catalog"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL OVERLAY */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-left border border-gray-150 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-gray-950 border-b border-gray-100 pb-3 mb-4 text-sm md:text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-650 animate-pulse" />
              Confirm Catalog Deletion
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Are you sure you want to permanently remove this product? This will preserve historical records but hide the catalog entry from sales dashboards.
            </p>
            <div className="flex justify-end gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteConfirmId;
                  setDeleteConfirmId(null);
                  await handleDelete(id);
                }}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Product</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
