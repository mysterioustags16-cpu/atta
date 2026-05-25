import React from "react";
import { 
  Users, Search, Plus, UserPlus, FileText, DollarSign, CreditCard, ChevronRight, X, Printer, Calendar, ArrowUpRight, ArrowDownLeft, Trash2, AlertTriangle 
} from "lucide-react";
import { Customer } from "../types";
import api from "../lib/api";

interface CustomerLedgerProps {
  customers: Customer[];
  onRefreshNeeded: () => void;
  currency: string;
  isReadOnly?: boolean;
}

export default function CustomerLedger({ customers = [], onRefreshNeeded, currency, isReadOnly = false }: CustomerLedgerProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
  
  // Ledger statement container
  const [ledgerData, setLedgerData] = React.useState<{ customer: Customer; ledger: any[] } | null>(null);
  const [ledgerLoading, setLedgerLoading] = React.useState(false);

  // Forms states
  const [isAddingCustomer, setIsAddingCustomer] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newAddress, setNewAddress] = React.useState("");
  const [newOpening, setNewOpening] = React.useState("");

  const [isRecordingPayment, setIsRecordingPayment] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<"Cash" | "Bank" | "JazzCash" | "EasyPaisa">("Cash");
  const [paymentNote, setPaymentNote] = React.useState("");

  const [errorMessage, setErrorMessage] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  // Filtering
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  const fetchLedger = async (id: string) => {
    setLedgerLoading(true);
    try {
      const data = await api.tenant.getCustomerLedger(id);
      setLedgerData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleSelectCustomerForLedger = (id: string) => {
    setSelectedCustomerId(id);
    setLedgerData(null);
    fetchLedger(id);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) {
      setErrorMessage("Customer Name and Phone are required parameters.");
      return;
    }

    setActionLoading(true);
    setErrorMessage("");
    try {
      await api.tenant.saveCustomer({
        name: newName,
        phone: newPhone,
        address: newAddress,
        openingBalance: Number(newOpening || 0)
      });
      setSuccessMessage("Customer successfully listed on Khata book.");
      setNewName("");
      setNewPhone("");
      setNewAddress("");
      setNewOpening("");
      setIsAddingCustomer(false);
      onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create customer.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerData?.customer.id || !paymentAmount) {
      setErrorMessage("Please fill required recovery amount details.");
      return;
    }

    setActionLoading(true);
    setErrorMessage("");
    try {
      await api.tenant.receiveCustomerPayment({
        customerId: ledgerData.customer.id,
        amount: Number(paymentAmount),
        paymentMethod,
        note: paymentNote
      });
      setSuccessMessage(`Collected ${currency} ${paymentAmount} from ${ledgerData.customer.name}! Ledger adjusted.`);
      setPaymentAmount("");
      setPaymentNote("");
      setIsRecordingPayment(false);
      onRefreshNeeded();
      // Recalculate current showing ledger
      fetchLedger(ledgerData.customer.id);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to balance ledger.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setActionLoading(true);
    setErrorMessage("");
    try {
      await api.tenant.deleteCustomer(id);
      setSuccessMessage("Customer account removed from file registry.");
      setDeleteConfirmId(null);
      setSelectedCustomerId(null);
      setLedgerData(null);
      onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to excise customer record.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintLedger = () => {
    window.print();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT PANEL: Customer Khata list register */}
      <div className="lg:col-span-5 bg-white p-5 border border-gray-100 rounded-2xl shadow-xs text-left">
        <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
          <h2 className="font-bold text-gray-900 text-sm md:text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Active Khata customers ({customers.length})
          </h2>
          {!isReadOnly && (
            <button
              onClick={() => {
                setIsAddingCustomer(true);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="p-1 px-3 border border-gray-100 bg-blue-50/20 hover:border-blue-200 text-blue-600 font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add khata</span>
            </button>
          )}
        </div>

        {/* Dynamic Outstanding Debt Summary Widget Card */}
        {(() => {
          const activeDebtors = customers.filter(c => c.creditBalance > 0);
          const totalOutstandingDebt = activeDebtors.reduce((sum, c) => sum + c.creditBalance, 0);
          return (
            <div className="mb-4 bg-gradient-to-tr from-rose-50 to-amber-50/20 border border-rose-100 p-3.5 rounded-xl shadow-xs flex items-center justify-between gap-3 text-left">
              <div className="space-y-1">
                <span className="text-[10px] text-rose-500 uppercase font-extrabold tracking-wider block">Outstanding Khata Debt</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-rose-700">{activeDebtors.length}</span>
                  <span className="text-[11px] text-rose-600 font-bold">active debtors</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-tight">Accounts with outstanding credit margins.</p>
              </div>
              
              <div className="text-right border-l border-rose-100 pl-3 space-y-0.5 shrink-0">
                <span className="text-[10px] text-gray-400 font-bold block">Total Outstanding Debt</span>
                <span className="text-sm md:text-base font-black text-rose-600 block">
                  {currency} {totalOutstandingDebt.toLocaleString()}
                </span>
                <div className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-800 bg-rose-100/60 px-2 py-0.5 rounded-md">
                  <span className="w-1 h-1 rounded-full bg-rose-600 animate-ping"></span>
                  Action Required
                </div>
              </div>
            </div>
          );
        })()}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customer name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full rounded-xl border border-gray-100 px-3 py-2 text-xs focus:outline-none focus:border-blue-400 transition"
          />
        </div>

        {/* Khata register collection */}
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {filteredCustomers.map(c => {
            const hasDebt = c.creditBalance > 0;
            const isSelected = selectedCustomerId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => handleSelectCustomerForLedger(c.id)}
                className={`p-3.5 border rounded-xl cursor-pointer hover:border-blue-100 transition flex items-center justify-between ${
                  isSelected 
                    ? "bg-blue-50/40 border-blue-400/50 hover:bg-blue-50/50" 
                    : "bg-white border-gray-50 hover:bg-gray-50/50"
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <h3 className="font-bold text-gray-950 text-xs md:text-sm truncate">{c.name}</h3>
                  <p className="text-[10px] text-gray-400 truncate leading-tight mt-0.5">{c.phone}</p>
                  {c.address && <p className="text-[9px] text-gray-500 truncate mt-0.5">{c.address}</p>}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[9px] text-gray-400 block font-medium">Credit Balance</span>
                  <span className={`text-[11px] md:text-xs font-black px-2 py-0.5 rounded-full ${
                    hasDebt ? "bg-red-50 text-red-600 font-extrabold" : "bg-green-50 text-green-600"
                  }`}>
                    {currency} {c.creditBalance}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredCustomers.length === 0 && (
            <div className="text-center py-10">
              <p className="text-xs text-gray-400">No customers registered on file.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Live Customer ledger records (Audit statement) */}
      <div className="lg:col-span-12 xl:col-span-7 bg-white p-5 border border-gray-100 rounded-2xl shadow-xs text-left min-h-[400px]">
        {ledgerLoading ? (
          <div className="space-y-4 py-16 text-center">
            <div className="animate-spin w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="text-xs text-gray-500">Retrieving full ledger statements journals...</p>
          </div>
        ) : ledgerData ? (
          <div className="space-y-5">
            {/* Ledger client header block */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 pb-5 gap-3">
              <div>
                <h2 className="font-black text-gray-950 text-base md:text-lg uppercase whitespace-nowrap">{ledgerData.customer.name}</h2>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                  📁 Phone: {ledgerData.customer.phone} · Address: {ledgerData.customer.address || "N/A"}
                </p>
              </div>

              <div className="flex gap-2">
                {!isReadOnly && (
                  <button
                    onClick={() => {
                      setIsRecordingPayment(true);
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Receive Settle</span>
                  </button>
                )}
                {isReadOnly && (
                  <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-500 font-bold text-[10px] uppercase rounded-xl inline-flex items-center gap-1 select-none">
                    🔒 Read-Only
                  </span>
                )}
                {!isReadOnly && (
                  <button
                    onClick={() => setDeleteConfirmId(ledgerData.customer.id)}
                    className="px-3 py-1.5 border border-red-200 bg-red-50/10 hover:bg-rose-50 hover:border-red-300 text-red-650 font-bold text-xs rounded-xl transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Customer</span>
                  </button>
                )}
                <button
                  onClick={handlePrintLedger}
                  className="px-3 py-1.5 border border-gray-100 hover:bg-gray-50 text-gray-600 font-bold text-xs rounded-xl transition inline-flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ledger</span>
                </button>
              </div>
            </div>

            {/* Credit books stats cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-gray-50 rounded-xl p-3 bg-red-50/10">
                <span className="text-[10px] text-gray-500 font-semibold uppercase block">Opening setup</span>
                <span className="font-black text-gray-950 text-xs md:text-sm">{currency} {ledgerData.customer.openingBalance}</span>
              </div>
              <div className="border border-gray-50 rounded-xl p-3 bg-green-50/10">
                <span className="text-[10px] text-gray-500 font-semibold uppercase block">Settle Receipts</span>
                <span className="font-black text-green-600 text-xs md:text-sm">
                  {currency} {ledgerData.ledger.filter(l => l.type.includes("Payment")).reduce((sum, item) => sum + item.credit, 0)}
                </span>
              </div>
              <div className="border border-gray-50 rounded-xl p-3 bg-red-50/30">
                <span className="text-[10px] text-red-500 font-bold uppercase block">Current debt</span>
                <span className="font-black text-red-600 text-xs md:text-sm">{currency} {ledgerData.customer.creditBalance}</span>
              </div>
            </div>

            {/* Ledger Transactions table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" id="ledger-print-table">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase font-semibold text-[10px]">
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Transaction Title</th>
                    <th className="py-2.5">Reference</th>
                    <th className="py-2.5 text-right font-bold text-red-600">Debit (+)</th>
                    <th className="py-2.5 text-right font-bold text-green-600">Credit (-)</th>
                    <th className="py-2.5 text-right font-black text-gray-950">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {ledgerData.ledger.map((entry, idx) => {
                    const isDebit = entry.debit > 0;
                    const isCredit = entry.credit > 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50/30">
                        <td className="py-3 text-[11px] whitespace-nowrap text-gray-500">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <span className="font-bold text-gray-950 block">{entry.type}</span>
                          <span className="text-[10px] text-gray-400 inline-block max-w-[200px] truncate">{entry.note}</span>
                        </td>
                        <td className="py-3 font-semibold text-gray-500 whitespace-nowrap">{entry.reference}</td>
                        <td className="py-3 text-right text-red-600 font-bold">
                          {isDebit ? `+ ${entry.debit}` : "-"}
                        </td>
                        <td className="py-3 text-right text-green-600 font-bold">
                          {isCredit ? `- ${entry.credit}` : "-"}
                        </td>
                        <td className="py-3 text-right font-extrabold text-gray-950">
                          {currency} {entry.runningBalance}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <FileText className="w-12 h-12 stroke-1 text-gray-300 mb-2.5" />
            <p className="text-xs">Select a customer from the left register to build ledger sheets.</p>
          </div>
        )}
      </div>

      {/* CREATE NEW CUSTOMER MODAL OVERLAY */}
      {isAddingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-left border border-gray-100 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsAddingCustomer(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-3 mb-4 text-sm md:text-base flex items-center gap-1.5">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Register khata client
            </h3>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zaman Khan Bhatti"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400 transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1 font-semibold text-gray-900">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 03009876543"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400 transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Residential/Shop Address</label>
                <input
                  type="text"
                  placeholder="e.g. Mughalpura, Lahore"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400 transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Opening Credit Balance (Rs.)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newOpening}
                  onChange={(e) => setNewOpening(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs focus:outline-none focus:border-blue-400 transition"
                />
                <span className="text-[10px] text-gray-400 mt-1 block leading-tight">If customer owes money from past offline flour balances, enter it here.</span>
              </div>

              {errorMessage && (
                <div className="p-2 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center cursor-pointer"
              >
                {actionLoading ? "Registering..." : "Add to ledger book"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT/COLLECTION MODAL OVERLAY */}
      {isRecordingPayment && ledgerData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-left border border-gray-100 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsRecordingPayment(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-3 mb-4 text-sm md:text-base flex items-center gap-1.5">
              <DollarSign className="w-5 h-5 text-green-600 bg-green-50 rounded-lg p-0.5" />
              Settle customer credit
            </h3>

            <div className="mb-4 bg-gray-50 p-3 rounded-lg text-xs leading-tight">
              Customer: <strong className="text-gray-950 font-bold">{ledgerData.customer.name}</strong> <br />
              Current Outstanding Credit: <strong className="text-red-600 font-extrabold">{currency} {ledgerData.customer.creditBalance}</strong>
            </div>

            <form onSubmit={handleRecordCollection} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Collection Amount Collected *</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-gray-400 font-bold">{currency}</span>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="pl-7 w-full rounded-xl border border-gray-100 px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
                    max={ledgerData.customer.creditBalance}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">Fund Collection Channel *</label>
                <div className="grid grid-cols-4 gap-2">
                  {["Cash", "Bank", "JazzCash", "EasyPaisa"].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method as any)}
                      className={`py-1.5 px-1 bg-white border rounded-lg font-bold text-[10px] md:text-xs transition ${
                        paymentMethod === method 
                          ? "bg-gray-950 text-white border-gray-950" 
                          : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Collection memo / comments</label>
                <input
                  type="text"
                  placeholder="e.g. Settle old chakki atta balance"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              {errorMessage && (
                <div className="p-2 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center cursor-pointer"
              >
                {actionLoading ? "Processing Settle..." : "Apply Ledger Credit"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-sm w-full shadow-xl text-left space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-950 text-base">Delete Customer?</h3>
                <p className="text-xs text-gray-500">This action is permanent.</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-650 leading-relaxed">
              Are you sure you want to delete this customer record from your ledger register? Any outstanding debt books balance will be archived from current views.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 border border-gray-150 hover:bg-gray-50 text-gray-600 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleDeleteCustomer(deleteConfirmId)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
              >
                {actionLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
