import React from "react";
import { 
  ShoppingCart, Search, User, Plus, Minus, Trash2, Tag, Percent, Receipt, CreditCard, ChevronRight, CheckCircle2, RefreshCw, X, Printer, FileDown
} from "lucide-react";
import { Product, Customer, Sale, safeFormatDateTime, getWeightInKg } from "../types";
import api from "../lib/api";
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from "motion/react";

interface POSSystemProps {
  products: Product[];
  customers: Customer[];
  onSaleComplete: () => void;
  currency: string;
  isReadOnly?: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POSSystem({ products = [], customers = [], onSaleComplete, currency, isReadOnly = false }: POSSystemProps) {
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("All");
  
  // Custom interactive click & touch toaster states
  const [toasts, setToasts] = React.useState<{id: string, message: string, type: 'success' | 'info' | 'warning'}[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  };

  // Sale details state
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [saleType, setSaleType] = React.useState<"Cash" | "Credit" | "Wholesale">("Cash");
  const [paymentMethod, setPaymentMethod] = React.useState<"Cash" | "Bank" | "JazzCash" | "EasyPaisa">("Cash");
  const [discountAmount, setDiscountAmount] = React.useState(0);
  const [taxRate, setTaxRate] = React.useState(0);
  const [amountPaidState, setAmountPaidState] = React.useState("");
  const [cartWarning, setCartWarning] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [checkoutResult, setCheckoutResult] = React.useState<Sale | null>(null);
  const [errorMessage, setErrorMessage] = React.useState("");

  const triggerCartWarning = (msg: string) => {
    setCartWarning(msg);
    setTimeout(() => setCartWarning(""), 4000);
  };

  // Categories extraction
  const categories = ["All", ...Array.from(new Set(products.map(p => p.category)))];

  // Filtering products (with 0 stock items sorted to the end)
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "All" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    const aStock = a.stockQuantity <= 0 ? 1 : 0;
    const bStock = b.stockQuantity <= 0 ? 1 : 0;
    return aStock - bStock;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    if (checkoutResult) {
      setCheckoutResult(null);
      setAmountPaidState("");
    }
    if (product.stockQuantity <= 0) {
      showToast(`"${product.name}" is currently out of stock!`, "warning");
      triggerCartWarning("This grain or flour product is currently out of stock!");
      return;
    }
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stockQuantity) {
        showToast(`Only ${product.stockQuantity} ${product.unit} available in stock!`, "warning");
        triggerCartWarning(`Only ${product.stockQuantity} ${product.unit} available in current mill stock!`);
        return;
      }
      setCart(cart.map(item => 
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
      showToast(`Added another ${product.unit} of ${product.name}`, "info");
    } else {
      setCart([...cart, { product, quantity: 1 }]);
      showToast(`Added ${product.name} to basket`, "success");
    }
  };

  const updateQuantityValue = (productId: string, newQty: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    if (newQty <= 0) {
      setCart(cart.filter(i => i.product.id !== productId));
      showToast(`Removed "${item.product.name}" from basket`, "info");
    } else {
      if (newQty > item.product.stockQuantity) {
        showToast(`Cannot exceed current stock for ${item.product.name}!`, "warning");
        triggerCartWarning("Cannot exceed actual physical grain mill stock availability.");
        return;
      }
      setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));
    }
  };

  const updateQuantity = (productId: string, amount: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;
    updateQuantityValue(productId, item.quantity + amount);
  };

  const removeFromCart = (productId: string) => {
    const item = cart.find(i => i.product.id === productId);
    setCart(cart.filter(item => item.product.id !== productId));
    if (item) {
      showToast(`Removed "${item.product.name}" from basket`, "info");
    }
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  const currentCostTotal = cart.reduce((sum, item) => sum + (item.product.costPrice * item.quantity), 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100));
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);

  // Auto set fields on type shifts
  React.useEffect(() => {
    if (saleType === "Cash") {
      setAmountPaidState(grandTotal.toString());
    } else if (saleType === "Credit") {
      // Allow user to write custom partial payment
      setAmountPaidState("");
    } else if (saleType === "Wholesale") {
      setAmountPaidState(grandTotal.toString());
    }
  }, [saleType, grandTotal]);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMessage("Please add at least one item to checkout.");
      return;
    }

    if (saleType === "Credit" && !selectedCustomer) {
      setErrorMessage("Please select a valid customer from the ledger for credit book tracking!");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const paidVal = saleType === "Credit" ? Number(amountPaidState || 0) : grandTotal;

    const saleItemsPayload = cart.map(item => ({
      id: `item_${Math.random().toString(36).substr(2, 9)}`,
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unit: item.product.unit,
      price: item.product.sellingPrice,
      cost: item.product.costPrice,
      total: item.product.sellingPrice * item.quantity
    }));

    try {
      const resultObj = await api.tenant.checkoutSale({
        customerId: selectedCustomer?.id || undefined,
        customerName: selectedCustomer ? selectedCustomer.name : "Walk-in Customer",
        items: saleItemsPayload,
        discount: discountAmount,
        tax: taxAmount,
        subtotal,
        total: grandTotal,
        totalCost: currentCostTotal,
        paymentMethod,
        saleType,
        status: paidVal >= grandTotal ? "paid" : paidVal === 0 ? "unpaid" : "partial",
        amountPaid: paidVal
      });

      setCheckoutResult(resultObj);
      setCart([]);
      setSelectedCustomer(null);
      setDiscountAmount(0);
      onSaleComplete();
      showToast(`Sale Invoice #${resultObj.invoiceNumber} recorded!`, "success");
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to finalize transactions. Review parameters.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = (resultToUse?: any) => {
    // Detect if we were called by a React event (onClick) rather than with a Sale data object
    const isReactEvent = resultToUse && (resultToUse.nativeEvent || resultToUse.target);
    const activeResult = (!isReactEvent && resultToUse) ? resultToUse : checkoutResult;
    
    if (!activeResult) {
      console.warn("PDF Download triggered but no sale record found in active context.");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, 180] // Receipt standard format (80mm width)
      });

      // Styling parameters
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(20, 20, 20);
      doc.text("PAK GRAIN CHAKKI", 40, 15, { align: "center" });

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("Chakki Stop, Main Baazar, Lahore", 40, 20, { align: "center" });
      doc.text("Phone: +92 300 1234567", 40, 24, { align: "center" });
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text("RETAIL SALES RECEIPT", 40, 30, { align: "center" });

      // Horizontal dashed line
      doc.setDrawColor(200, 200, 200);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(5, 33, 75, 33);

      // Metadata info block
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Invoice No: ${activeResult.invoiceNumber}`, 6, 38);
      doc.text(`Date & Time: ${safeFormatDateTime(activeResult.createdAt)}`, 6, 43);
      doc.text(`Customer Name: ${activeResult.customerName}`, 6, 48);
      doc.text(`Payment: ${activeResult.saleType} (${activeResult.paymentMethod})`, 6, 53);

      // Horizontal dashed line
      doc.line(5, 56, 75, 56);

      // Header for items
      doc.setFont("Helvetica", "bold");
      doc.text("Flour Item", 6, 61);
      doc.text("Qty", 42, 61, { align: "center" });
      doc.text("Rate", 54, 61, { align: "right" });
      doc.text("Total", 74, 61, { align: "right" });

      doc.setFont("Helvetica", "normal");
      doc.line(5, 63, 75, 63);

      let currentY = 68;

      // Render purchased items with array safety check
      const itemsToRender = activeResult.items || [];
      itemsToRender.forEach((item: any) => {
        let pName = item.productName || "Product";
        if (pName.length > 20) {
          pName = pName.substring(0, 18) + "...";
        }
        
        doc.text(pName, 6, currentY);
        doc.text(`${item.quantity} ${item.unit}`, 42, currentY, { align: "center" });
        doc.text(`${currency} ${item.price}`, 54, currentY, { align: "right" });
        doc.text(`${currency} ${item.total}`, 74, currentY, { align: "right" });
        
        currentY += 6;
      });

      // Horizontal dashed line
      doc.line(5, currentY - 2, 75, currentY - 2);

      // Calculations summaries
      doc.setFont("Helvetica", "normal");
      doc.text("Subtotal:", 40, currentY + 3, { align: "right" });
      doc.text(`${currency} ${activeResult.subtotal}`, 74, currentY + 3, { align: "right" });
      
      let nextY = currentY + 8;
      if (activeResult.discount > 0) {
        doc.setFont("Helvetica", "bold");
        doc.text("Discount:", 40, nextY, { align: "right" });
        doc.text(`- ${currency} ${activeResult.discount}`, 74, nextY, { align: "right" });
        nextY += 5;
      }

      if (activeResult.tax > 0) {
        doc.setFont("Helvetica", "normal");
        doc.text("GST Tax:", 40, nextY, { align: "right" });
        doc.text(`+ ${currency} ${activeResult.tax}`, 74, nextY, { align: "right" });
        nextY += 5;
      }

      doc.line(40, nextY - 2, 75, nextY - 2);
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Invoice Total:", 40, nextY + 3, { align: "right" });
      doc.text(`${currency} ${activeResult.total}`, 74, nextY + 3, { align: "right" });

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Amount Paid:", 40, nextY + 8, { align: "right" });
      doc.text(`${currency} ${activeResult.amountPaid}`, 74, nextY + 8, { align: "right" });

      let balanceY = nextY + 13;
      if (activeResult.total - activeResult.amountPaid > 0) {
        doc.setFont("Helvetica", "bold");
        doc.text("Credit Balance:", 40, balanceY, { align: "right" });
        doc.text(`Rs. ${activeResult.total - activeResult.amountPaid}`, 74, balanceY, { align: "right" });
        balanceY += 5;
      }

      // Final outer boundary line
      doc.setLineDashPattern([], 0);
      doc.setDrawColor(220, 220, 220);
      doc.line(5, balanceY, 75, balanceY);

      // Footer
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text("Thank you for trusting Pak Grain Millers!", 40, balanceY + 5, { align: "center" });
      doc.text("Generated via Atta Chakki SaaS Web Portal.", 40, balanceY + 9, { align: "center" });

      doc.save(`Invoice_${activeResult.invoiceNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to render PDF document.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      
      {/* LEFT PANEL: Flour Catalog & Stock items list */}
      <div className="lg:col-span-12 xl:col-span-7 bg-slate-100/90 p-3.5 border-2 border-slate-300 rounded-xl shadow-inner text-left">
        <div className="flex flex-col sm:flex-row gap-2 justify-between mb-3.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search product name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition font-medium"
            />
          </div>
          
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hidden">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setCategoryFilter(cat);
                  showToast(`Showing category: ${cat}`, "info");
                }}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold shrink-0 transition active:scale-90 duration-100 cursor-pointer ${
                  categoryFilter === cat 
                    ? "bg-blue-600 text-white shadow-xs" 
                    : "bg-white border text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {filteredProducts.map(p => {
            const isLow = p.stockQuantity <= p.minStockAlert;
            const isOut = p.stockQuantity <= 0;
            return (
              <div
                key={p.id}
                onClick={() => !isOut && addToCart(p)}
                className={`p-2.5 border rounded-lg cursor-pointer transition-all duration-150 text-left relative flex flex-col justify-between active:scale-[0.97] duration-70 select-none ${
                  isOut 
                    ? "opacity-55 cursor-not-allowed bg-slate-200/50 border-slate-300 shadow-none" 
                    : "bg-white border-slate-300 hover:border-blue-600 hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-1 gap-1">
                    <span className="text-[8px] bg-slate-200/95 text-slate-700 font-bold px-1 py-0.5 rounded-md truncate max-w-[70px]">
                      {p.category}
                    </span>
                    <span className={`text-[8px] font-black px-1 rounded-full uppercase tracking-wide py-0.5 ${
                      isOut ? "bg-red-100 text-red-700 border border-red-200" : isLow ? "bg-amber-100 text-amber-700 border border-amber-200" : "text-green-700 bg-green-100 border border-green-200"
                    }`}>
                      {isOut ? "Out" : isLow ? "Low" : "Ready"}
                    </span>
                  </div>
                  <h3 className="text-slate-950 font-black text-xs leading-tight line-clamp-2 min-h-[28px]">{p.name}</h3>
                  <p className="text-[9px] text-slate-400 font-bold tracking-tight mt-0.5">{p.sku}</p>
                </div>

                <div className="mt-2.5 border-t border-slate-150 pt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-slate-400 text-[8px] font-bold block">Rate / {p.unit}</span>
                    <span className="text-slate-950 font-black text-xs">{currency} {p.sellingPrice}</span>
                  </div>
                  <span className={`text-[9px] font-extrabold ${isLow || isOut ? "text-amber-600" : "text-slate-500"}`}>
                    Qty: {Number(p.stockQuantity).toFixed(1)} {p.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm font-bold text-slate-400">No matching chalkki products found.</p>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Current Sales checkout basket card */}
      <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-4 sticky top-5">
        
        {!checkoutResult ? (
          /* Active POS shopping Cart */
          <div className="bg-white p-3.5 border-2 border-slate-300 rounded-xl shadow-md text-left">
            <h2 className="font-extrabold text-slate-800 border-b border-slate-150 pb-2 mb-2.5 text-xs md:text-sm flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-blue-600 shrink-0" />
                Receipt Basket
              </span>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                {cart.length} items
              </span>
            </h2>

            {cartWarning && (
              <div className="p-1.5 bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-semibold rounded-lg mb-2">
                ⚠️ {cartWarning}
              </div>
            )}

            {/* Cart items list */}
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 pr-1 select-none">
              {cart.map(item => (
                <div key={item.product.id} className="py-2.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-gray-950 truncate">{item.product.name}</h4>
                      <p className="text-[10px] text-gray-400 font-extrabold tracking-tight">
                        {currency} {item.product.sellingPrice} / {item.product.unit}
                      </p>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-gray-300 hover:text-red-500 cursor-pointer p-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2.5">
                    {/* Quantity controls */}
                    <div className="flex items-center border border-slate-200 rounded-lg p-0.5 shrink-0 bg-slate-50 shadow-xs">
                      <button 
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 px-1.5 hover:text-blue-600 cursor-pointer active:scale-90 transition-transform text-slate-400"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-[11px] font-black text-slate-950 px-1 min-w-[35px] text-center">
                        {item.quantity % 1 === 0 ? item.quantity : Number(item.quantity).toFixed(2)}
                      </span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 px-1.5 hover:text-blue-600 cursor-pointer active:scale-90 transition-transform text-slate-400"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Open Pay amount input */}
                    <div className="flex-1 max-w-[110px] relative">
                      <span className="absolute left-2 top-1.5 text-[10px] text-slate-400 font-black">{currency}</span>
                      <input 
                        type="number"
                        placeholder="Amount"
                        className="w-full pl-6 pr-2 py-1 bg-amber-50/50 border border-amber-200 rounded-lg text-right text-[11px] font-black text-slate-900 focus:outline-none focus:border-amber-500 transition shadow-xs"
                        value={Math.round(item.product.sellingPrice * item.quantity)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            updateQuantityValue(item.product.id, val / item.product.sellingPrice);
                          } else if (e.target.value === "") {
                            updateQuantityValue(item.product.id, 0);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {getWeightInKg(item.product.unit) > 1 && (
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Total Yield weight</span>
                      <span className="text-[10px] text-slate-600 font-extrabold">{Number((item.quantity * getWeightInKg(item.product.unit)).toFixed(2))} KG</span>
                    </div>
                  )}
                </div>
              ))}

              {cart.length === 0 && (
                <div className="text-center py-7">
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">Select items from catalog to construct receipt.</p>
                </div>
              )}
            </div>

            {/* Transaction configurations */}
            <div className="mt-3 border-t border-slate-150 pt-3.5 space-y-2.5">
              
              {/* Customer select ledger block */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-1 flex items-center justify-between">
                  <span>Select Ledger Customer</span>
                  {selectedCustomer && (
                    <span className="text-[9px] text-blue-600 font-extrabold cursor-pointer" onClick={() => setSelectedCustomer(null)}>
                      Clear Customer
                    </span>
                  )}
                </label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedCustomer ? selectedCustomer.id : ""}
                    onChange={(e) => {
                      const cust = customers.find(c => c.id === e.target.value);
                      setSelectedCustomer(cust || null);
                      if (cust) {
                        showToast(`Attached customer ledger: ${cust.name}`, "info");
                      }
                    }}
                    className="pl-8 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition bg-white font-semibold"
                  >
                    <option value="">Walk-in Customer (General Cash Ledger)</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) - Debt: Rs. {c.creditBalance}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sale catalog categorization choices */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "Cash", label: "Cash Sale" },
                  { id: "Credit", label: "Credit Book" },
                  { id: "Wholesale", label: "Wholesale" }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setSaleType(type.id as any);
                      showToast(`Sale type set to ${type.label}`, "info");
                    }}
                    className={`py-1 px-1 border-2 rounded-lg font-bold text-[11px] transition active:scale-95 duration-100 cursor-pointer ${
                      saleType === type.id 
                        ? "bg-blue-50 border-blue-500 text-blue-700 font-extrabold" 
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              {/* Payment channel selection */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">
                  Discount & Taxes (Settings)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-bold">{currency}</span>
                    <input
                      type="number"
                      placeholder="Discount"
                      value={discountAmount || ""}
                      onChange={(e) => {
                        setDiscountAmount(Number(e.target.value));
                      }}
                      className="pl-6 w-full rounded-lg border-2 border-slate-200 px-2 py-1 text-xs focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute right-2 top-1.5 text-xs text-slate-400 font-bold">%</span>
                    <input
                      type="number"
                      placeholder="GST Rate"
                      value={taxRate || ""}
                      onChange={(e) => {
                        setTaxRate(Number(e.target.value));
                      }}
                      className="pr-6 w-full rounded-lg border-2 border-slate-200 px-2 py-1 text-xs focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Payment methods list */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">
                  Fund Collection Channel
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {["Cash", "Bank", "JazzCash", "EasyPaisa"].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method as any);
                        showToast(`Selected channel: ${method}`, "info");
                      }}
                      className={`py-1 px-1 border rounded-lg font-black text-[10px] transition active:scale-95 duration-100 cursor-pointer ${
                        paymentMethod === method 
                          ? "bg-slate-900 border-slate-900 text-white" 
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Partial credit-book entry collections */}
              {saleType === "Credit" && (
                <div>
                  <label className="text-[10px] font-black text-amber-700 uppercase block mb-1 flex items-center justify-between">
                    <span>Down Payment Today</span>
                    <span className="text-[8px] text-amber-600 font-bold italic">Balance builds debt</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">Rs.</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={amountPaidState}
                      onChange={(e) => setAmountPaidState(e.target.value)}
                      className="pl-8 w-full rounded-lg border border-slate-200 px-3 py-1 text-xs focus:outline-none focus:border-blue-500 bg-white font-bold"
                      max={grandTotal}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Checkout grand sums ledger */}
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-550 font-medium">
                <span>Gross Items Subtotal</span>
                <span>{currency} {subtotal}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-red-500 font-bold">
                  <span>Discount Deduction</span>
                  <span>- {currency} {discountAmount}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-slate-550 font-medium">
                  <span>GST Tax Added ({taxRate}%)</span>
                  <span>+ {currency} {taxAmount}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1.5 border-t border-dotted border-slate-250 text-xs font-black text-slate-950 uppercase">
                <span>Grand Total Bill</span>
                <span className="text-sm text-blue-600 font-black">{currency} {grandTotal}</span>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-[10px] font-semibold leading-tight flex items-center gap-1">
                <span>⚠️ {errorMessage}</span>
              </div>
            )}

            {/* Submit Actions */}
            {isReadOnly ? (
              <div className="mt-3 p-2 bg-slate-100 border-2 border-slate-200 rounded-lg text-center space-y-1">
                <p className="text-[10px] text-slate-500 font-bold leading-normal">
                  Basket checkout locked in Auditor Mode.
                </p>
                <button
                  disabled
                  className="w-full bg-slate-200 text-slate-400 font-black py-2 rounded-lg text-xs flex items-center justify-center space-x-1.5 cursor-not-allowed uppercase tracking-wider"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Auditor Mode (Read-Only)</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
                className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-lg transition duration-150 disabled:opacity-50 flex items-center justify-center space-x-2 shadow-sm cursor-pointer active:scale-95 text-xs uppercase tracking-wider duration-100"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{loading ? "Processing..." : "Generate Receipt Invoice"}</span>
              </button>
            )}
          </div>
        ) : (
          /* State B: RETAIL INVOICE INLINED (Replaces modal so print/pdf buttons are visible on POS panel!) */
          <div className="bg-white p-6 text-left border-2 border-dashed border-slate-400 shadow-xl relative animate-in fade-in zoom-in-95 duration-200 mx-auto" style={{ width: '80mm' }} id="print-area">
            
            <div className="flex items-center justify-center gap-2 text-green-700 font-black text-[10px] mb-4 border-b border-green-100 pb-2.5 print:hidden">
              <CheckCircle2 className="w-4 h-4 text-green-600 animate-bounce" />
              <span>RECORDED SUCCESSFULLY</span>
            </div>

            {/* Print Friendly Bill Layout */}
            <div className="text-center pb-4 border-b border-dashed border-slate-250">
              <span className="text-2xl">🌾</span>
              <h3 className="font-extrabold text-slate-950 text-base uppercase leading-tight mt-1">PAK GRAIN CHAKKI</h3>
              <p className="text-[10px] text-slate-500">Chakki Stop, Main Baazar, Lahore · +92 300 1234567</p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Retail Sales Receipt</p>
            </div>

            <div className="py-4 text-[11px] text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span>Invoice No:</span>
                <strong className="text-slate-950 font-bold">{checkoutResult.invoiceNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span>Date Mill:</span>
                <span>{safeFormatDateTime(checkoutResult.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Client ledger:</span>
                <span className="font-semibold text-slate-950">{checkoutResult.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Checkout type:</span>
                <span className="font-bold text-blue-600 uppercase">{checkoutResult.saleType}</span>
              </div>
            </div>

            {/* Purchased Items lists */}
            <table className="w-full text-left text-[11px] mb-4">
              <thead>
                <tr className="border-b border-slate-300 text-slate-400 font-bold uppercase">
                  <th className="py-1">Flour Item</th>
                  <th className="py-1 text-center font-black">Qty</th>
                  <th className="py-1 text-right font-black">Sum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checkoutResult.items.map(item => (
                  <tr key={item.id} className="text-slate-705">
                    <td className="py-2 max-w-[150px] truncate leading-tight font-extrabold text-slate-950">{item.productName}</td>
                    <td className="py-2 text-center font-bold">{item.quantity} {item.unit}</td>
                    <td className="py-2 text-right font-black text-slate-950">{currency} {item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations summaries */}
            <div className="border-t border-dashed border-slate-250 pt-4 text-[11px] text-slate-700 space-y-1.5 pb-2">
              <div className="flex justify-between">
                <span>Subtotal amount</span>
                <span>{currency} {checkoutResult.subtotal}</span>
              </div>
              {checkoutResult.discount > 0 && (
                <div className="flex justify-between text-red-500 font-semibold animate-pulse">
                  <span>Deducted Discount</span>
                  <span>- {currency} {checkoutResult.discount}</span>
                </div>
              )}
              {checkoutResult.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax GST Charged</span>
                  <span>+ {currency} {checkoutResult.tax}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-black text-slate-950 uppercase pt-3 pb-1 border-t-2 border-slate-800 mt-2">
                <span>Invoice Total</span>
                <span className="text-lg">{currency} {checkoutResult.total}</span>
              </div>
              <div className="flex justify-between text-[11px] pt-1 text-slate-500 font-semibold">
                <span>Amount Paid Today</span>
                <span>{currency} {checkoutResult.amountPaid}</span>
              </div>
              {checkoutResult.total - checkoutResult.amountPaid > 0 && (
                <div className="flex justify-between text-[11px] text-red-650 font-extrabold">
                  <span>Ledger Credit Balance Added</span>
                  <span>Rs. {checkoutResult.total - checkoutResult.amountPaid}</span>
                </div>
              )}
            </div>

            {/* Footnote greeting */}
            <div className="mt-6 mb-4 flex justify-center">
                <div className="border-2 border-slate-300 text-slate-400 transform -rotate-12 px-3 py-1 font-black text-xl uppercase tracking-widest rounded-lg opacity-60">
                  Thank You
                </div>
              </div>
            <div className="text-center pt-3 border-t border-slate-200 text-[9px] text-slate-500 font-bold italic">
              Generated via Atta Chakki SaaS. <br />
              System Verified Receipt.
            </div>

            {/* Button Actions displayed directly on the POS panel instead of the modal */}
            <div className="mt-5 space-y-2.5 print:hidden">
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex-1 bg-slate-900 border-2 border-slate-900 hover:bg-black text-white font-extrabold py-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 duration-100 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => handleDownloadPDF()}
                  className="flex-1 bg-blue-600 border-2 border-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 duration-100 shadow-sm"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
              
              <button
                onClick={() => {
                  setCheckoutResult(null);
                  setAmountPaidState("");
                  showToast("Basket cleared. Ready for new checkout!", "success");
                }}
                className="w-full bg-slate-100 border-2 border-slate-200 text-slate-700 font-extrabold py-2.5 rounded-xl text-xs hover:bg-slate-200 transition text-center cursor-pointer active:scale-95 duration-100 block"
              >
                + Reset / Start New Sale Basket
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Local dynamic tactile notification system to display quick actions & touch feedbacks */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none print:hidden">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`p-3.5 rounded-xl shadow-lg border-2 text-xs font-black pointer-events-auto flex items-center gap-2 ${
                t.type === 'success' 
                  ? 'bg-green-50 border-green-300 text-green-800'
                  : t.type === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-blue-50 border-blue-300 text-blue-800'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0 animate-ping bg-current" />
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
