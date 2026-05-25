import React from "react";
import { 
  Truck, Plus, Search, DollarSign, X, AlertTriangle, ArrowUpRight, ShieldAlert, TrendingUp, Trash2, Calendar, ClipboardList
} from "lucide-react";
import { Supplier, PriceQuote } from "../types";
import api from "../lib/api";

interface SupplierMillProps {
  suppliers: Supplier[];
  priceQuotes?: PriceQuote[];
  onRefreshNeeded: () => void;
  currency: string;
  isReadOnly?: boolean;
}

export default function SupplierMill({ suppliers = [], priceQuotes = [], onRefreshNeeded, currency, isReadOnly = false }: SupplierMillProps) {
  const [searchWord, setSearchWord] = React.useState("");

  const [isAddingSupp, setIsAddingSupp] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [balance, setBalance] = React.useState("");

  const [isPaying, setIsPaying] = React.useState(false);
  const [activeSupp, setActiveSupp] = React.useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = React.useState("");
  const [payMethod, setPayMethod] = React.useState<"Cash" | "Bank" | "JazzCash" | "EasyPaisa">("Cash");
  const [payNote, setPayNote] = React.useState("");

  // Price Quote States
  const [isAddingQuote, setIsAddingQuote] = React.useState(false);
  const [quoteSupplierId, setQuoteSupplierId] = React.useState("");
  const [quoteGrainType, setQuoteGrainType] = React.useState("Premium Wheat (Sujata)");
  const [quotePricePerMaund, setQuotePricePerMaund] = React.useState("");
  const [quoteDate, setQuoteDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [quoteNote, setQuoteNote] = React.useState("");
  const [quoteGrainFilter, setQuoteGrainFilter] = React.useState("All");

  const [errorMessage, setErrorMessage] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchWord.toLowerCase()) || 
    s.companyName.toLowerCase().includes(searchWord.toLowerCase())
  );

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone || !company) {
      setErrorMessage("Please fill out Name, Phone, and Company fields.");
      return;
    }

    setActionLoading(true);
    setErrorMessage("");
    try {
      await api.tenant.saveSupplier({
        name: newName,
        phone: newPhone,
        companyName: company,
        outstandingBalance: Number(balance || 0)
      });
      setNewName("");
      setNewPhone("");
      setCompany("");
      setBalance("");
      setIsAddingSupp(false);
      onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to catalog dealer.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaySupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupp?.id || !payAmount) {
      setErrorMessage("Complete payment details required.");
      return;
    }

    setActionLoading(true);
    setErrorMessage("");
    try {
      await api.tenant.paySupplier({
        supplierId: activeSupp.id,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        note: payNote
      });
      setPayAmount("");
      setPayNote("");
      setIsPaying(false);
      setActiveSupp(null);
      onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || "Transaction logging failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteSupplierId || !quoteGrainType || !quotePricePerMaund || !quoteDate) {
      setErrorMessage("Please select a supplier, enter grain type, price, and date.");
      return;
    }

    const supplierObject = suppliers.find(s => s.id === quoteSupplierId);
    if (!supplierObject) {
      setErrorMessage("Selected supplier is invalid.");
      return;
    }

    setActionLoading(true);
    setErrorMessage("");
    try {
      await api.tenant.saveQuote({
        supplierId: quoteSupplierId,
        supplierName: `${supplierObject.name} (${supplierObject.companyName})`,
        grainType: quoteGrainType,
        pricePerMaund: Number(quotePricePerMaund),
        quoteDate,
        note: quoteNote
      });
      setQuoteSupplierId("");
      setQuotePricePerMaund("");
      setQuoteNote("");
      setIsAddingQuote(false);
      onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to log grain price quote.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteQuote = async (id: string) => {
    setActionLoading(true);
    setErrorMessage("");
    try {
      await api.tenant.deleteQuote(id);
      onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete price quote.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-xs text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 pb-4 mb-5 gap-3">
        <div>
          <h2 className="font-bold text-gray-950 text-base md:text-lg flex items-center gap-2">
            <Truck className="w-5.5 h-5.5 text-blue-600" />
            Wheat & Grain Suppliers Ledger
          </h2>
          <p className="text-xs text-gray-400">Manage grain mill dealers contracts, trade balances and invoice clears</p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => {
              setIsAddingSupp(true);
              setErrorMessage("");
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Dealer</span>
          </button>
        )}
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search supplier, miller, company..."
          value={searchWord}
          onChange={(e) => setSearchWord(e.target.value)}
          className="pl-9 w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400 transition"
        />
      </div>

      {/* Supplier Grid list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => {
          const hasBalance = s.outstandingBalance > 0;
          return (
            <div key={s.id} className="border border-gray-50 bg-gray-50/10 hover:bg-white rounded-xl p-4 flex flex-col justify-between hover:shadow-sm hover:border-blue-100 transition duration-150">
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50/50 py-0.5 px-2 rounded-md truncate max-w-[150px]">
                    🌾 {s.companyName}
                  </span>
                  {hasBalance && (
                    <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md flex items-center">
                      <ShieldAlert className="w-2.5 h-2.5 mr-0.5" /> Debt Due
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-gray-950 text-xs md:text-sm mt-2.5 leading-snug">{s.name}</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Contact: {s.phone}</p>
              </div>

              <div className="mt-5 border-t border-gray-50 pt-3 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-semibold block">Outstanding Due</span>
                  <span className={`text-xs md:text-sm font-black ${hasBalance ? "text-red-600 font-extrabold" : "text-gray-500"}`}>
                    {currency} {s.outstandingBalance}
                  </span>
                </div>

                {isReadOnly ? (
                  <span className="py-1 px-3 border border-slate-150 bg-slate-50 text-slate-400 font-bold text-[9px] rounded-lg select-none">
                    🔒 Audited
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setActiveSupp(s);
                      setErrorMessage("");
                      setIsPaying(true);
                    }}
                    className="py-1 px-3 border border-gray-150 hover:border-blue-300 hover:bg-blue-50/20 text-blue-600 font-bold text-[10px] rounded-lg transition cursor-pointer"
                  >
                    Clear balance
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center col-span-3 py-10 text-gray-400 text-xs">No supplier records linked yet.</div>
        )}
      </div>

      {/* ADD SUPPLIER MODAL */}
      {isAddingSupp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-left border border-gray-100 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsAddingSupp(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-3 mb-4 text-sm md:text-base flex items-center gap-1.5">
              <Truck className="w-5 h-5 text-blue-600" />
              Register raw wheat supplier
            </h3>

            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Supplier Representative *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mian Sharif Sab"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Company/Mill Classification Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Punjab Wheat Dealers"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +92 345 1122334"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Opening Debt We Owe (Rs.)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
                />
                <span className="text-[10px] text-gray-400 mt-1 block leading-tight">If we already owe past money to this dealer, enter it cleanly.</span>
              </div>

              {errorMessage && (
                <div className="p-2 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">{errorMessage}</div>
              )}

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center cursor-pointer"
              >
                {actionLoading ? "Registering..." : "Record supplier profile"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SETTLE BILLS MODAL */}
      {isPaying && activeSupp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-left border border-gray-100 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setIsPaying(false);
                setActiveSupp(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-3 mb-4 text-sm md:text-base flex items-center gap-1.5">
              <DollarSign className="w-5 h-5 text-green-600 bg-green-50 rounded-lg p-0.5" />
              Settle Supplier Debt
            </h3>

            <div className="mb-4 bg-gray-50 p-3 rounded-lg text-xs leading-tight">
              Dealer: <strong className="text-gray-950 font-bold">{activeSupp.name} ({activeSupp.companyName})</strong> <br />
              Total Debt We Owe: <strong className="text-red-600 font-extrabold">{currency} {activeSupp.outstandingBalance}</strong>
            </div>

            <form onSubmit={handlePaySupplierSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Paid Amount *</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-gray-400 font-bold">{currency}</span>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 10000"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="pl-7 w-full rounded-xl border border-gray-100 px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
                    max={activeSupp.outstandingBalance}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">Fund Payment channel *</label>
                <div className="grid grid-cols-4 gap-2">
                  {["Cash", "Bank", "JazzCash", "EasyPaisa"].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPayMethod(method as any)}
                      className={`py-1.5 px-0.5 bg-white border rounded-lg font-bold text-[10px] md:text-sm transition ${
                        payMethod === method 
                          ? "bg-slate-950 text-white border-slate-950" 
                          : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Payment Reference/Ref Sacks No.</label>
                <input
                  type="text"
                  placeholder="e.g. Settle cargo wheat bag contract 1A"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none"
                />
              </div>

              {errorMessage && (
                <div className="p-2 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs">{errorMessage}</div>
              )}

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center cursor-pointer shadow-md shadow-blue-50"
              >
                {actionLoading ? "Clearing..." : "Record Payment Clear"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GRAIN MARKET PRICE QUOTES AND TREND TRACKER SECTION */}
      <div className="mt-10 border-t border-gray-100 pt-8 text-left animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="font-extrabold text-gray-950 text-base flex items-center gap-1.5">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Grain Cost Price Quotes & Trend Book
            </h3>
            <p className="text-xs text-gray-400">Track and analyze direct mill raw grain quotes to maximize gross profit margins</p>
          </div>

          {!isReadOnly && (
            <button
              onClick={() => {
                setIsAddingQuote(true);
                setErrorMessage("");
                if (suppliers.length > 0) {
                  setQuoteSupplierId(suppliers[0].id);
                }
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Cost Quote</span>
            </button>
          )}
        </div>

        {/* Quotes filter & summary */}
        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-gray-500 font-bold shrink-0">Grain Focus Trend:</span>
            <select
              value={quoteGrainFilter}
              onChange={(e) => setQuoteGrainFilter(e.target.value)}
              className="rounded-lg border border-gray-100 bg-white px-2.5 py-1 text-xs focus:outline-none text-gray-700"
            >
              <option value="All">All Grain Types</option>
              <option value="Premium Wheat (Sujata)">Premium Wheat (Sujata)</option>
              <option value="Local Desi Wheat">Local Desi Wheat</option>
              <option value="Sarbati/Lokwan Wheat">Sarbati/Lokwan Wheat</option>
              <option value="Fine Maida Grain">Fine Maida Grain</option>
              <option value="Bran (Wheat Chokar)">Bran (Wheat Chokar)</option>
              <option value="Suji Semolina Grain">Suji Semolina Grain</option>
            </select>
          </div>

          <div className="text-[11px] text-gray-450 leading-tight w-full sm:w-auto text-right">
            Showing trends for <strong className="text-gray-955">{quoteGrainFilter === "All" ? "All Grains" : quoteGrainFilter}</strong>. Standard Pakistani Grain trade measures: 1 Maund = 40 Kilograms.
          </div>
        </div>

        {/* Quotes Table */}
        <div className="overflow-x-auto border border-gray-100 rounded-xl bg-white">
          <table className="w-full text-left text-xs text-gray-700">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 uppercase font-black text-[10px]">
                <th className="py-2.5 px-3">Quote Date</th>
                <th className="py-2.5 px-3">Grain Classification</th>
                <th className="py-2.5 px-3">Supplier Dealer</th>
                <th className="py-2.5 px-3 text-right">Cost Per Maund (40 kg)</th>
                <th className="py-2.5 px-3 text-right">Raw Cost Per Kg</th>
                <th className="py-2.5 px-3">Memo Detail</th>
                {!isReadOnly && <th className="py-2.5 px-3 text-center">Operation</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {priceQuotes
                .filter(q => quoteGrainFilter === "All" || q.grainType === quoteGrainFilter)
                .map(q => {
                  const perKg = q.pricePerKg || Number((q.pricePerMaund / 40).toFixed(2));
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/20">
                      <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                        {new Date(q.quoteDate).toLocaleDateString([], { dateStyle: 'medium' })}
                      </td>
                      <td className="py-3 px-3 font-bold text-gray-950">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-55/70 text-amber-850 text-[10px] font-extrabold uppercase whitespace-nowrap">
                          🌾 {q.grainType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-650 max-w-[150px] truncate" title={q.supplierName}>
                        {q.supplierName}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-blue-600">
                        {currency} {q.pricePerMaund}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-500 font-semibold">
                        {currency} {perKg} / Kg
                      </td>
                      <td className="py-3 px-3 text-gray-400 italic max-w-[200px] truncate" title={q.note}>
                        {q.note || "No memo annotations"}
                      </td>
                      {!isReadOnly && (
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              handleDeleteQuote(q.id);
                            }}
                            className="p-1 border border-gray-150 hover:border-red-100 rounded-lg text-gray-400 hover:text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {priceQuotes.filter(q => quoteGrainFilter === "All" || q.grainType === quoteGrainFilter).length === 0 && (
            <div className="text-center py-8 text-gray-400 italic text-xs">
              No price quotes cataloged for the active filters. Click 'Record Cost Quote' above to input mill offers.
            </div>
          )}
        </div>
      </div>

      {/* RECORD GRAIN QUOTE MODAL OVERLAY */}
      {isAddingQuote && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-left border border-gray-100 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsAddingQuote(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-650"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-gray-950 border-b border-gray-50 pb-3 mb-4 text-sm md:text-base flex items-center gap-1.5">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              Log Grain Price Quote
            </h3>

            <form onSubmit={handleCreateQuote} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Select Mill Supplier *</label>
                {suppliers.length === 0 ? (
                  <div className="text-xs text-amber-600 p-2 bg-amber-50 rounded-xl border border-amber-100 leading-tight font-medium">
                    Please register at least one dealer supplier profile in the ledger grid first to link quotes.
                  </div>
                ) : (
                  <select
                    required
                    value={quoteSupplierId}
                    onChange={(e) => setQuoteSupplierId(e.target.value)}
                    className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white text-gray-800 font-medium"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.companyName})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Grain Classification Type *</label>
                <select
                  value={quoteGrainType}
                  onChange={(e) => setQuoteGrainType(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white text-gray-800"
                >
                  <option value="Premium Wheat (Sujata)">Premium Wheat (Sujata)</option>
                  <option value="Local Desi Wheat">Local Desi Wheat</option>
                  <option value="Sarbati/Lokwan Wheat">Sarbati/Lokwan Wheat</option>
                  <option value="Fine Maida Grain">Fine Maida Grain</option>
                  <option value="Bran (Wheat Chokar)">Bran (Wheat Chokar)</option>
                  <option value="Suji Semolina Grain">Suji Semolina Grain</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1 mb-1.5">Price Per Maund *</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs text-gray-400 font-bold">{currency}</span>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 4200"
                      value={quotePricePerMaund}
                      onChange={(e) => setQuotePricePerMaund(e.target.value)}
                      className="pl-7 w-full rounded-xl border border-gray-100 px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1 mb-1.5">Quote Date *</label>
                  <input
                    type="date"
                    required
                    value={quoteDate}
                    onChange={(e) => setQuoteDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Quote Note / Memo annotations</label>
                <input
                  type="text"
                  placeholder="e.g. valid till May 30th on spot delivery offer"
                  value={quoteNote}
                  onChange={(e) => setQuoteNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              {errorMessage && (
                <div className="p-2 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs">{errorMessage}</div>
              )}

              <button
                type="submit"
                disabled={actionLoading || suppliers.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-350 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center cursor-pointer shadow-md shadow-emerald-50"
              >
                {actionLoading ? "Saving Offer details..." : "Register Cost Price Quote"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
