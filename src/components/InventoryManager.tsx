import React from "react";
import { 
  History, PlusCircle, Search, ArrowUpCircle, ArrowDownCircle, AlertCircle, FileText 
} from "lucide-react";
import { Product, InventoryLog } from "../types";
import api from "../lib/api";

interface InventoryManagerProps {
  products: Product[];
  logs: InventoryLog[];
  onRefreshNeeded: () => void;
  currency: string;
  isReadOnly?: boolean;
}

export default function InventoryManager({ products = [], logs = [], onRefreshNeeded, currency, isReadOnly = false }: InventoryManagerProps) {
  const [isAdjusting, setIsAdjusting] = React.useState(false);
  
  // Selection
  const [productId, setProductId] = React.useState("");
  const [type, setType] = React.useState<"in" | "out" | "adjustment" | "wastage">("in");
  const [quantity, setQuantity] = React.useState("");
  const [note, setNote] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [errorMess, setErrorMess] = React.useState("");

  // Search local
  const [searchFilter, setSearchFilter] = React.useState("");

  const filteredLogs = logs.filter(l => 
    l.productName.toLowerCase().includes(searchFilter.toLowerCase()) || 
    l.type.toLowerCase() === searchFilter.toLowerCase()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!productId || !quantity) {
      setErrorMess("Please select a product and supply quantity metric.");
      return;
    }

    setLoading(true);
    setErrorMess("");
    try {
      await api.tenant.adjustInventory({
        productId,
        type,
        quantity: Number(quantity),
        note
      });
      // Clear up states
      setProductId("");
      setQuantity("");
      setNote("");
      setIsAdjusting(false);
      onRefreshNeeded();
    } catch (err: any) {
      setErrorMess(err.message || "Failed to commit stock ledger item.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT PANEL: Log adjust form */}
      <div className="lg:col-span-4 bg-white p-5 border border-gray-100 rounded-2xl shadow-xs text-left">
        <h3 className="font-bold text-gray-950 text-sm md:text-base border-b border-gray-50 pb-3 mb-4 flex items-center gap-1.5">
          <PlusCircle className="w-5 h-5 text-blue-600" />
          Update Inventory Levels
        </h3>

        {isReadOnly ? (
          <div className="p-5 py-8 bg-slate-50 border border-slate-200/60 rounded-xl text-center space-y-3.5 shadow-inner">
            <span className="text-4xl block animate-bounce duration-1000">🔒</span>
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">Silo Controls Locked</h4>
            <p className="text-[11px] text-slate-500 font-medium leading-normal">
              You are signed in under a workspace guest viewer profile. Real-time grain intake entries, adjustments, and wastage write-downs are restricted to Mill Managers & Owners.
            </p>
            <div className="pt-2">
              <span className="inline-block bg-slate-100 border border-slate-200 text-slate-500 font-mono text-[9px] font-bold px-2 py-1 rounded">
                AUDITOR VIEW ONLY
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Target Product</label>
              <select
                value={productId}
                required
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white"
              >
                <option value="">Select product to adjust...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (In-stock: {p.stockQuantity} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Adjustment Action</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "in", label: "Stock In (+)" },
                  { id: "out", label: "Stock Out (-)" },
                  { id: "adjustment", label: "Count Audit" },
                  { id: "wastage", label: "Spillage (Waste)" }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setType(opt.id as any)}
                    className={`py-2 px-1 border rounded-lg text-xs font-bold transition ${
                      type === opt.id 
                        ? "bg-blue-50 border-blue-500 text-blue-600" 
                        : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Operation Quantity</label>
              <input
                type="number"
                required
                placeholder="e.g. 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Comments / Audit Notes</label>
              <input
                type="text"
                placeholder="e.g. Received wheat procurement shift from Miller"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400"
              />
            </div>

            {errorMess && (
              <div className="p-2 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[11px] font-medium leading-tight">
                {errorMess}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs sm:text-sm transition flex items-center justify-center cursor-pointer shadow-md shadow-blue-50"
            >
              {loading ? "Registering stocks..." : "Execute Adjustments"}
            </button>
          </form>
        )}
      </div>

      {/* RIGHT PANEL: Inventory logs audits trail charts list */}
      <div className="lg:col-span-8 bg-white p-5 border border-gray-100 rounded-2xl shadow-xs text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 pb-3 mb-4 gap-3">
          <h3 className="font-bold text-gray-950 text-sm md:text-base flex items-center gap-1.5">
            <History className="w-5 h-5 text-blue-600 animate-pulse" />
            Stock Inventory History Audit Trail
          </h3>

          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search history, e.g. 'wastage'..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 py-1.5 w-full border border-gray-100 focus:border-blue-200 focus:outline-none rounded-lg text-[11px]"
            />
          </div>
        </div>

        {/* Audits logs timeline table */}
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto pr-1">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-50 text-gray-400 text-[10px] uppercase font-bold">
                <th className="py-2.5 px-2">Timestamp Date</th>
                <th className="py-2.5 px-2">Wheat Product</th>
                <th className="py-2.5 px-2 text-center">Operation Type</th>
                <th className="py-2.5 px-2 text-right">Yield Quantity</th>
                <th className="py-2.5 px-2">Adjuster Memo Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {filteredLogs.map(log => {
                const isIn = log.type === "in";
                const isOut = log.type === "out" || log.type === "wastage";
                
                let typeBadge = "bg-blue-50 text-blue-600";
                if (log.type === "in") typeBadge = "bg-green-50 text-green-600 font-extrabold";
                if (log.type === "out") typeBadge = "bg-gray-100 text-gray-500";
                if (log.type === "wastage") typeBadge = "bg-red-50 text-red-500 font-bold";

                return (
                  <tr key={log.id} className="hover:bg-gray-50/20 text-[11px]">
                    <td className="py-2.5 px-2 text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-2.5 px-2 font-bold text-gray-950">{log.productName}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${typeBadge}`}>
                        {log.type}
                      </span>
                    </td>
                    <td className={`py-2.5 px-2 text-right font-black ${isIn ? "text-green-600" : isOut ? "text-red-500" : "text-gray-950"}`}>
                      {isIn ? "+" : isOut ? "-" : " "}{log.quantity} {log.unit}
                    </td>
                    <td className="py-2.5 px-2 text-gray-500 max-w-[180px] truncate leading-tight" title={log.note}>
                      {log.note}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-16 flex flex-col items-center justify-center text-gray-400">
            <FileText className="w-10 h-10 stroke-1 text-gray-200 mb-1.5" />
            <p className="text-xs">No matching historical audit logs found.</p>
          </div>
        )}

      </div>
    </div>
  );
}
