import React from "react";
import { 
  Receipt, Plus, Search, Calendar, Trash2, Tag, AlertTriangle 
} from "lucide-react";
import { Expense } from "../types";
import api from "../lib/api";

interface ExpensesPanelProps {
  expenses: Expense[];
  onRefreshNeeded: () => void;
  currency: string;
  isReadOnly?: boolean;
}

export default function ExpensesPanel({ expenses = [], onRefreshNeeded, currency, isReadOnly = false }: ExpensesPanelProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("All");

  const [isAddingExpense, setIsAddingExpense] = React.useState(false);
  const [category, setCategory] = React.useState<"Electricity" | "Transport" | "Labor" | "Rent" | "Packaging" | "Maintenance" | "Other">("Electricity");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0]);

  const [errorMessage, setErrorMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const categories = ["All", "Electricity", "Transport", "Labor", "Rent", "Packaging", "Maintenance", "Other"];

  const filteredExpenses = expenses.filter(e => {
    const descMatch = e.description.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase());
    const catMatch = categoryFilter === "All" || e.category === categoryFilter;
    return descMatch && catMatch;
  });

  const totalExpenseSum = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) {
      setErrorMessage("Please fill out marked required parameters.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      await api.tenant.saveExpense({
        category,
        amount: Number(amount),
        description,
        date
      });
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setIsAddingExpense(false);
      onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record expense log.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setLoading(true);
    setErrorMessage("");
    try {
      await api.tenant.deleteExpense(id);
      setDeleteConfirmId(null);
      onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || "Error deleting expense row.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-xs text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 pb-4 mb-5 gap-3">
        <div>
          <h2 className="font-bold text-gray-950 text-base md:text-lg flex items-center gap-2">
            <Receipt className="w-5.5 h-5.5 text-blue-600" />
            Shop Expenses Ledger & Logs
          </h2>
          <p className="text-xs text-gray-400">Log electricity motor bills, packaging costs, and labor loader helper boys wages</p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => {
              setIsAddingExpense(true);
              setErrorMessage("");
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Expense Voucher</span>
          </button>
        )}
      </div>

      {/* Summary Banner totals */}
      <div className="mb-5 p-4 bg-slate-50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between border border-gray-50 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            Rs.
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Consolidated Expenses (Current Filter)</span>
            <h4 className="font-black text-gray-950 text-sm md:text-base leading-none mt-1">{currency} {totalExpenseSum}</h4>
          </div>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-0.5 max-w-lg">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
                categoryFilter === cat 
                  ? "bg-slate-900 text-white" 
                  : "bg-white border border-gray-100 text-gray-600 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Filter description, e.g. 'April Bill'..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Expenses list tables */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-700">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 uppercase font-bold text-[10px]">
              <th className="py-2.5 px-3">Billing Date</th>
              <th className="py-2.5 px-3">Expense Category</th>
              <th className="py-2.5 px-3">Description Memo</th>
              <th className="py-2.5 px-3 text-right">Debit amount</th>
              <th className="py-2.5 px-3 text-center print:hidden">{isReadOnly ? "Role State" : "Operation"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredExpenses.map(e => (
              <tr key={e.id} className="hover:bg-gray-50/20">
                <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                  {new Date(e.date).toLocaleDateString([], { dateStyle: 'medium' })}
                </td>
                <td className="py-3 px-3">
                  <span className="text-[10px] bg-red-50 text-red-600 font-extrabold uppercase px-2 py-0.5 rounded-md inline-block">
                    {e.category}
                  </span>
                </td>
                <td className="py-3 px-3 font-semibold text-gray-950 leading-relaxed max-w-[250px] truncate" title={e.description}>
                  {e.description || "N/A"}
                </td>
                <td className="py-3 px-3 text-right font-black text-red-600">
                  {currency} {e.amount}
                </td>
                <td className="py-3 px-3 text-center print:hidden">
                  {isReadOnly ? (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                      🔒 Restricted
                    </span>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(e.id)}
                      className="p-1 px-1.5 border border-gray-100 rounded-lg text-gray-300 hover:text-red-500 hover:border-red-100 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredExpenses.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-xs">No expense logs found.</div>
      )}

      {/* CREATE NEW EXPENSE Voucher OVERLAY */}
      {isAddingExpense && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-left border border-gray-100 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsAddingExpense(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 overflow-hidden"
            >
              ✕
            </button>

            <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-3 mb-4 text-sm md:text-base flex items-center gap-1.5">
              <Receipt className="w-5 h-5 text-blue-600 bg-blue-50 rounded-lg p-0.5" />
              Log Expense Voucher
            </h3>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Expense Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white"
                >
                  <option value="Electricity">Electricity Bill (Motor)</option>
                  <option value="Transport">Transport / Delivery truck</option>
                  <option value="Labor">Labor Wages (Helper boys)</option>
                  <option value="Rent">Shop/Warehouse Rent</option>
                  <option value="Packaging">Sacks & Suture Packings</option>
                  <option value="Maintenance">Chakki Machine maintenance</option>
                  <option value="Other">Other Expenses</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Transaction date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Payment Amount *</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-gray-400 font-bold">{currency}</span>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-7 w-full rounded-xl border border-gray-100 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Voucher Description/Memo memo</label>
                <input
                  type="text"
                  placeholder="e.g. Helper wage week ending May 22"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none"
                />
              </div>

              {errorMessage && (
                <div className="p-2 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">{errorMessage}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center cursor-pointer shadow-md shadow-blue-50"
              >
                {loading ? "Recording..." : "Record voucher"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION OVERLAY MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-sm w-full shadow-2xl text-left space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-650">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-650" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-950 text-base">Delete Expense?</h3>
                <p className="text-[10px] text-gray-400">This action is permanent.</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-650 leading-relaxed">
              Are you sure you want to delete this expense record from your accounts ledger register? Net profit margins and reporting aggregates will adjust instantly.
            </p>

            {errorMessage && (
              <div className="p-2 bg-red-50 text-red-650 text-xs rounded-xl font-medium">
                {errorMessage}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                disabled={loading}
                onClick={() => {
                  setDeleteConfirmId(null);
                  setErrorMessage("");
                }}
                className="flex-1 py-2 border border-gray-150 hover:bg-gray-50 text-gray-600 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={() => handleDeleteExpense(deleteConfirmId)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-red-50"
              >
                {loading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
