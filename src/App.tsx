import React from "react";
import { 
  api, setAuthToken, clearAuthToken 
} from "./lib/api";
import { 
  User, Shop, ShopSettings, Sale, Product, Customer, Supplier, Expense, InventoryLog, Notification, safeFormatDate, safeFormatDateTime, PriceQuote 
} from "./types";
import {
  Sparkles, Bell, DollarSign, ArrowUpRight, ArrowDownRight, Package, Users, AlertTriangle, 
  Settings as SettingsIcon, ShieldCheck, RefreshCw, X, ChevronRight, CheckCircle2, Moon, Sun, Trash2, Printer,
  Zap, Receipt, Plus, ArrowUpDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

// Operational Subcomponents imports
import Sidebar from "./components/Sidebar";
import POSSystem from "./components/POSSystem";
import CustomerLedger from "./components/CustomerLedger";
import ProductsPanel from "./components/ProductsPanel";
import InventoryManager from "./components/InventoryManager";
import SupplierMill from "./components/SupplierMill";
import ExpensesPanel from "./components/ExpensesPanel";
import ReportsPanel from "./components/ReportsPanel";
import { SecurityPanel } from "./components/SecurityPanel";

export default function App() {
  // Authentication states
  const [user, setUser] = React.useState<User | null>(null);
  const [shop, setShop] = React.useState<Shop | null>(null);
  const [settings, setSettings] = React.useState<ShopSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Login / Signup Form states
  const [isLoginView, setIsLoginView] = React.useState(true);
  const [emailInput, setEmailInput] = React.useState("");
  const [passwordInput, setPasswordInput] = React.useState("");
  const [signUpName, setSignUpName] = React.useState("");
  const [signUpPhone, setSignUpPhone] = React.useState("");
  const [signUpShop, setSignUpShop] = React.useState("");
  const [authError, setAuthError] = React.useState("");
  const [authSuccess, setAuthSuccess] = React.useState("");

  // Forgot Password Form states
  const [isForgotView, setIsForgotView] = React.useState(false);
  const [forgotEmail, setForgotEmail] = React.useState("");
  const [resetCodeInput, setResetCodeInput] = React.useState("");
  const [newPasswordInput, setNewPasswordInput] = React.useState("");
  const [resetStep, setResetStep] = React.useState(1); // 1 = enter email, 2 = verify and update
  const [demoResetCode, setDemoResetCode] = React.useState("");

  // Live Database inspection states
  const [rawDbJson, setRawDbJson] = React.useState<any>(null);
  const [showRawDbModal, setShowRawDbModal] = React.useState(false);

  // User password change controls
  const [adminSelectedUser, setAdminSelectedUser] = React.useState<{ id: string; name: string; current: string; role?: string; shopId?: string | null } | null>(null);
  const [adminNewPasswordInput, setAdminNewPasswordInput] = React.useState("");
  const [adminNewRole, setAdminNewRole] = React.useState("owner");
  const [adminNewShopId, setAdminNewShopId] = React.useState("null");

  // Add Shop Form states
  const [showAddShopModal, setShowAddShopModal] = React.useState(false);
  const [newShopName, setNewShopName] = React.useState("");
  const [newShopPhone, setNewShopPhone] = React.useState("");
  const [newShopEmail, setNewShopEmail] = React.useState("");
  const [newShopSubscription, setNewShopSubscription] = React.useState("trial");

  // Add User Account Form states
  const [showAddUserModal, setShowAddUserModal] = React.useState(false);
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserPhone, setNewUserPhone] = React.useState("");
  const [newUserPassword, setNewUserPassword] = React.useState("");
  const [newUserRole, setNewUserRole] = React.useState("owner");
  const [newUserShopId, setNewUserShopId] = React.useState("null");

  // Navigation workspace
  const [activeTab, setActiveTab] = React.useState("dashboard");
  const [settingsSubTab, setSettingsSubTab] = React.useState<"general" | "security">("general");

  // Core Data Lists
  const [dashboardMetrics, setDashboardMetrics] = React.useState<any>(null);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [inventoryLogs, setInventoryLogs] = React.useState<InventoryLog[]>([]);
  const [priceQuotes, setPriceQuotes] = React.useState<PriceQuote[]>([]);

  // Super Admin view state
  const [superAdminData, setSuperAdminData] = React.useState<any>(null);

  // Settings screen inputs
  const [shopNameInput, setShopNameInput] = React.useState("");
  const [taxRateInput, setTaxRateInput] = React.useState("");
  const [currencyInput, setCurrencyInput] = React.useState("Rs.");
  const [invoicePrefixInput, setInvoicePrefixInput] = React.useState("INV");
  const [settingsMessage, setSettingsMessage] = React.useState("");
  
  // Custom Dynamic UI Themes Toggles state
  const [theme, setTheme] = React.useState<"blue" | "green">("blue");
  const [themeInput, setThemeInput] = React.useState<"blue" | "green">("blue");
  
  // Custom interactive click & touch toaster states
  const [toasts, setToasts] = React.useState<{id: string, message: string, type: 'success' | 'info' | 'warning' | 'error'}[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // Quick Actions Floating Menu / Overlay Modal States
  const [showQuickActions, setShowQuickActions] = React.useState(false);
  const [showQuickExpenseModal, setShowQuickExpenseModal] = React.useState(false);
  const [showQuickInventoryModal, setShowQuickInventoryModal] = React.useState(false);

  // States for Quick Expense Form
  const [quickExpenseCategory, setQuickExpenseCategory] = React.useState<"Electricity" | "Transport" | "Labor" | "Rent" | "Packaging" | "Maintenance" | "Other">("Electricity");
  const [quickExpenseAmount, setQuickExpenseAmount] = React.useState("");
  const [quickExpenseDescription, setQuickExpenseDescription] = React.useState("");
  const [quickExpenseDate, setQuickExpenseDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [quickExpenseLoading, setQuickExpenseLoading] = React.useState(false);
  const [quickExpenseError, setQuickExpenseError] = React.useState("");

  // States for Quick Stock Adjustment Form
  const [quickAdjustProdId, setQuickAdjustProdId] = React.useState("");
  const [quickAdjustType, setQuickAdjustType] = React.useState<"in" | "out" | "adjustment" | "wastage">("in");
  const [quickAdjustQuantity, setQuickAdjustQuantity] = React.useState("");
  const [quickAdjustNote, setQuickAdjustNote] = React.useState("");
  const [quickAdjustLoading, setQuickAdjustLoading] = React.useState(false);
  const [quickAdjustError, setQuickAdjustError] = React.useState("");

  // Submit handlers for Quick Actions
  const handleQuickExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickExpenseAmount || !quickExpenseDate) {
      setQuickExpenseError("All marked fields are required.");
      return;
    }
    setQuickExpenseLoading(true);
    setQuickExpenseError("");
    try {
      await api.tenant.saveExpense({
        category: quickExpenseCategory,
        amount: Number(quickExpenseAmount),
        description: quickExpenseDescription,
        date: quickExpenseDate,
      });
      setQuickExpenseAmount("");
      setQuickExpenseDescription("");
      setQuickExpenseDate(new Date().toISOString().split("T")[0]);
      setShowQuickExpenseModal(false);
      await loadWorkspaceData();
    } catch (err: any) {
      setQuickExpenseError(err.message || "Failed to log expense.");
    } finally {
      setQuickExpenseLoading(false);
    }
  };

  const handleQuickAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdjustProdId || !quickAdjustQuantity) {
      setQuickAdjustError("Please choose grain product and quantity.");
      return;
    }
    setQuickAdjustLoading(true);
    setQuickAdjustError("");
    try {
      await api.tenant.adjustInventory({
        productId: quickAdjustProdId,
        type: quickAdjustType,
        quantity: Number(quickAdjustQuantity),
        note: quickAdjustNote,
      });
      setQuickAdjustProdId("");
      setQuickAdjustQuantity("");
      setQuickAdjustNote("");
      setShowQuickInventoryModal(false);
      await loadWorkspaceData();
    } catch (err: any) {
      setQuickAdjustError(err.message || "Failed to record stock adjustment.");
    } finally {
      setQuickAdjustLoading(false);
    }
  };

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  React.useEffect(() => {
    if (settings) {
      const activeTheme = (settings as any).theme || "blue";
      setTheme(activeTheme);
      setThemeInput(activeTheme);
    }
  }, [settings]);

  // System Loading state during tabs refresh
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // All Transactions Modal in Dashboard
  const [showAllTransactionsModal, setShowAllTransactionsModal] = React.useState(false);
  const [txStartDate, setTxStartDate] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [txEndDate, setTxEndDate] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [txSearchQuery, setTxSearchQuery] = React.useState("");
  const [txSelectedSale, setTxSelectedSale] = React.useState<Sale | null>(null);

  // Core boot validator helper
  const checkCurrentUser = async () => {
    setIsLoading(true);
    const token = localStorage.getItem("chakki_auth_token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const resp = await api.auth.me();
      setUser(resp.user);
      setShop(resp.shop);
      setSettings(resp.settings);
      
      // Auto routing based on roles
      if (resp.user?.role === "super_admin") {
        setActiveTab("super_admin");
      } else {
        setActiveTab("dashboard");
      }
    } catch (e) {
      console.error("Invalid local token check, clearing state: ", e);
      clearAuthToken();
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    checkCurrentUser();
  }, []);

  // Sync / refresh workspace state data
  const loadWorkspaceData = async (retryCount = 0) => {
    if (!user || user.role === "super_admin") return;
    setIsRefreshing(true);
    try {
      const syncData = await api.tenant.syncWorkspace();
      
      // 1. Update Metrics
      const m = syncData.metrics || {};
      setDashboardMetrics({
        ...m,
        todaySales: m.todaySales ?? 0,
        dailyProfit: m.dailyProfit ?? 0,
        cashBalance: m.cashInHand ?? 0,
        inventoryValue: m.inventoryValue ?? 0,
        outstandingCredits: m.creditSales ?? 0,
        salesChartData: syncData.salesHistory || []
      });

      // 2. Update Datasets
      setProducts(syncData.products || []);
      setCustomers(syncData.customers || []);
      setSuppliers(syncData.suppliers || []);
      setExpenses(syncData.expenses || []);
      setSales(syncData.sales || []);
      setInventoryLogs(syncData.inventoryLogs || []);
      setNotifications(syncData.notifications || []);
      setPriceQuotes(syncData.priceQuotes || []);

      // 3. Update shop settings context
      if (syncData.settings) {
        setSettings(syncData.settings);
        setTaxRateInput(syncData.settings.taxRate.toString());
        setCurrencyInput(syncData.settings.currency);
        setInvoicePrefixInput(syncData.settings.invoicePrefix);
      }
      
    } catch (e: any) {
      console.error("Failed to sync workspace datasets: ", e);
      if (retryCount < 1 && e.message?.toLowerCase().includes("failed to fetch")) {
        console.log("Retrying workspace sync in 1.5s...");
        setTimeout(() => loadWorkspaceData(retryCount + 1), 1500);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Run on user changes
  React.useEffect(() => {
    if (user && user.role !== "super_admin") {
      loadWorkspaceData();
    } else if (user && user.role === "super_admin") {
      loadSuperAdminPlatform();
    }
  }, [user]);

  // Ensure data is fresh when switching tabs (debounced slightly to avoid rapid double-refreshes)
  React.useEffect(() => {
    if (user && user.role !== "super_admin") {
      const timer = setTimeout(() => {
        loadWorkspaceData();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Load super admin metrics
  const loadSuperAdminPlatform = async () => {
    try {
      const data = await api.admin.getOverview();
      setSuperAdminData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!emailInput || !passwordInput) {
      setAuthError("Email and Password options must be fully defined.");
      return;
    }

    try {
      const data = await api.auth.login({ email: emailInput, password: passwordInput });
      const authToken = data.token || data.user.id;
      setAuthToken(authToken);
      setUser(data.user);
      setShop(data.shop);
      setSettings(data.settings);
      
      if (data.user.role === "super_admin") {
        setActiveTab("super_admin");
      } else {
        setActiveTab("dashboard");
      }
      setAuthSuccess(`Hello, welcome back ${data.user.name}`);
    } catch (err: any) {
      setAuthError(err.message || "Invalid authentication. Confirm credentials.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!signUpName || !emailInput || !signUpPhone || !passwordInput || !signUpShop) {
      setAuthError("All credentials and shop branding elements must be defined.");
      return;
    }

    try {
      const session = await api.auth.signup({
        name: signUpName,
        email: emailInput,
        phone: signUpPhone,
        password: passwordInput,
        shopName: signUpShop
      });
      const authToken = session.token || session.user.id;
      setAuthToken(authToken);
      setUser(session.user);
      setShop(session.shop);
      setSettings(session.settings);
      setActiveTab("dashboard");
      setAuthSuccess("Onboarding complete! Your Flour mill is active on the SaaS database.");
    } catch (err: any) {
      setAuthError(err.message || "Failed to establish tenant space.");
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
    setShop(null);
    setSettings(null);
    setEmailInput("");
    setPasswordInput("");
    setSignUpName("");
    setSignUpPhone("");
    setSignUpShop("");
    setAuthError("");
    setAuthSuccess("");
  };

  const handleToggleForgotView = (show: boolean) => {
    setIsForgotView(show);
    setAuthError("");
    setAuthSuccess("");
    setForgotEmail(emailInput);
    setResetCodeInput("");
    setNewPasswordInput("");
    setResetStep(1);
    setDemoResetCode("");
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!forgotEmail) {
      setAuthError("Please enter your registered email address.");
      return;
    }

    try {
      const resp = await api.auth.forgotPassword(forgotEmail);
      setDemoResetCode(resp.debugCode || "");
      setResetStep(2);
      setAuthSuccess(`✓ Verification code has been generated. Use code ${resp.debugCode} to complete reset.`);
    } catch (err: any) {
      setAuthError(err.message || "Failed to initiate password reset.");
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!forgotEmail || !resetCodeInput || !newPasswordInput) {
      setAuthError("Please fill out all reset details.");
      return;
    }

    try {
      const resp = await api.auth.resetPassword({
        email: forgotEmail,
        resetCode: resetCodeInput,
        newPassword: newPasswordInput
      });
      setAuthSuccess(resp.message || "Password changed successfully! You can now log in.");
      
      // Auto-populate for convenient testing
      setEmailInput(forgotEmail);
      setPasswordInput(newPasswordInput);
      
      setIsForgotView(false);
      setForgotEmail("");
      setResetCodeInput("");
      setNewPasswordInput("");
      setResetStep(1);
    } catch (err: any) {
      setAuthError(err.message || "Failed to reset password.");
    }
  };

  // Pre-seed testing helper profiles
  const handlePrepopulateAdmin = () => {
    setEmailInput("ac.repair.in.dubai3@gmail.com");
    setPasswordInput("admin123");
    setIsLoginView(true);
    setAuthError("");
  };

  const handlePrepopulateShop = () => {
    setEmailInput("owner@chakki.com");
    setPasswordInput("owner123");
    setIsLoginView(true);
    setAuthError("");
  };

  // Handle dismiss notifications
  const handleDismissNotification = async (id: string) => {
    try {
      await api.tenant.markNotificationsRead(id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  // Update Settings handler
  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMessage("");
    try {
      const updated = await api.tenant.saveSettings({
        shopName: shopNameInput,
        currency: currencyInput,
        taxRate: Number(taxRateInput || 0),
        invoicePrefix: invoicePrefixInput,
        theme: themeInput
      });
      setSettings(updated.settings);
      if (updated.shop) setShop(updated.shop);
      if (updated.settings && (updated.settings as any).theme) {
        setTheme((updated.settings as any).theme);
      }
      setSettingsMessage("Shop system settings updated successfully!");
      loadWorkspaceData();
    } catch (err: any) {
      setSettingsMessage(`Error saving specifications: ${err.message}`);
    }
  };

  // Super Admin Reset Database action
  const handleDbReset = async () => {
    if (!confirm("Are you sure you want to completely erase and re-seed the file database to defaults? Past invoices and newly registered customers will be discarded.")) {
      return;
    }
    try {
      await api.admin.resetDatabase();
      alert("Database successfully reset to standard Atta Chakki demo settings.");
      loadSuperAdminPlatform();
    } catch (e) {
      alert("Reset failed.");
    }
  };

  // Toggle Shop block action
  const handleToggleShopAction = async (id: string, currentStatus: string) => {
    const targ = currentStatus === "active" ? "inactive" : "active";
    try {
      await api.admin.toggleShop(id, targ);
      loadSuperAdminPlatform();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Fetch Entire Database JSON for interactive modal inspection
  const handleFetchRawDb = async () => {
    try {
      const data = await api.admin.dbRaw();
      setRawDbJson(data);
      setShowRawDbModal(true);
    } catch (e: any) {
      alert("Failed to retrieve live database: " + e.message);
    }
  };

  // Export full raw db.json onto client storage as backup download
  const handleDownloadDbFile = async () => {
    try {
      const data = await api.admin.dbRaw();
      const stringified = JSON.stringify(data, null, 2);
      const blob = new Blob([stringified], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "db.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Failed to download database file: " + e.message);
    }
  };

  const handleUpdateUserProfile = async () => {
    if (!adminSelectedUser || !adminNewPasswordInput.trim()) {
      alert("Please provide a password.");
      return;
    }
    try {
      await api.admin.updateUserProfile(adminSelectedUser.id, {
        password: adminNewPasswordInput.trim(),
        role: adminNewRole,
        shopId: adminNewShopId === "null" || adminNewShopId === "" ? null : adminNewShopId
      });
      alert(`Successfully updated profile for ${adminSelectedUser.name}.`);
      setAdminSelectedUser(null);
      setAdminNewPasswordInput("");
      setAdminNewRole("owner");
      setAdminNewShopId("null");
      loadSuperAdminPlatform();
    } catch (e: any) {
      alert("Failed to update user profile: " + e.message);
    }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) {
      alert("Please provide a shop name.");
      return;
    }
    try {
      await api.admin.createShop({
        name: newShopName.trim(),
        phone: newShopPhone.trim(),
        email: newShopEmail.trim(),
        subscription: newShopSubscription
      });
      alert(`Shop "${newShopName}" created successfully.`);
      setNewShopName("");
      setNewShopPhone("");
      setNewShopEmail("");
      setNewShopSubscription("trial");
      setShowAddShopModal(false);
      loadSuperAdminPlatform();
    } catch (e: any) {
      alert("Failed to create shop: " + e.message);
    }
  };

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    if (!window.confirm(`Are you sure you want to delete the shop "${shopName}"? This action is permanent and will delete default configurations as well.`)) {
      return;
    }
    try {
      await api.admin.deleteShop(shopId);
      alert("Shop deleted successfully.");
      loadSuperAdminPlatform();
    } catch (e: any) {
      alert("Failed to delete shop: " + e.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      alert("Name, Email and Password are required.");
      return;
    }
    try {
      await api.admin.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        phone: newUserPhone.trim(),
        password: newUserPassword.trim(),
        role: newUserRole,
        shopId: newUserShopId === "null" || newUserShopId === "" ? null : newUserShopId
      });
      alert(`User "${newUserName}" created successfully.`);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPhone("");
      setNewUserPassword("");
      setNewUserRole("owner");
      setNewUserShopId("null");
      setShowAddUserModal(false);
      loadSuperAdminPlatform();
    } catch (e: any) {
      alert("Failed to create user account: " + e.message);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete user account "${userName}"?`)) {
      return;
    }
    try {
      await api.admin.deleteUser(userId);
      alert("User account deleted successfully.");
      loadSuperAdminPlatform();
    } catch (e: any) {
      alert("Failed to delete user account: " + e.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 font-bold text-2xl animate-bounce mb-4">
          🌾
        </div>
        <p className="text-sm font-semibold text-gray-900">Configuring Atta Chakki SaaS core workspace...</p>
        <p className="text-xs text-gray-400 mt-1">Acquiring token signatures and database connection states</p>
      </div>
    );
  }

  // --- UNAUTHENTICATED ONBOARDING GATEWAY (LOGIN / SIGNUP) ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-xl grid grid-cols-1 md:grid-cols-2">
          
          {/* Left panel: Product showcase & Branding */}
          <div className="bg-blue-600 px-8 py-12 text-white flex flex-col justify-between text-left relative overflow-hidden">
            {/* Ambient Background Grid */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, #fff 10%, transparent 11%)`, backgroundSize: '15px 15px' }} />
            
            <div className="z-10">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl font-black mb-6">
                🌾
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">Atta Chakki SaaS Workspace</h1>
              <p className="text-blue-100 text-xs md:text-sm mt-3.5 font-medium leading-relaxed max-w-[320px]">
                The ultimate cloud enterprise platform designed specifically for Flour shops, Grain millers, and Atta Chakki businesses.
              </p>
            </div>

            <div className="mt-12 z-10">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-white/10 rounded-lg text-xs font-bold mt-0.5">🗸</div>
                  <div>
                    <h4 className="text-xs font-bold">Khata Debt Registers</h4>
                    <p className="text-[10px] text-blue-100 leading-normal">Track flour credits and balance settlement histories cleanly.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-white/10 rounded-lg text-xs font-bold mt-0.5">🗸</div>
                  <div>
                    <h4 className="text-xs font-bold">Point of Sale (Retail ERP)</h4>
                    <p className="text-[10px] text-blue-100 leading-normal">Generate invoice receipts for Kilo, Bags or Maunds trades instantly.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-white/10 rounded-lg text-xs font-bold mt-0.5">🗸</div>
                  <div>
                    <h4 className="text-xs font-bold">Cloud Reporting</h4>
                    <p className="text-[10px] text-blue-100 leading-normal">Deep analytical insights into your mill's milling efficiency and profit cycles.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-blue-500/50 mt-8 z-10 text-[10px] text-blue-200">
              SaaS Multi-Tenant Cloud Platform · Standard V1.0
            </div>
          </div>

          {/* Right panel: Dynamic Client credentials form */}
          <div className="p-6 md:p-10 flex flex-col justify-between text-left bg-white">
            <div>
              {isForgotView ? (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                      Reset Password
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleToggleForgotView(false)}
                      className="text-xs font-bold text-blue-600 hover:underline focus:outline-none"
                    >
                      Back to Sign In
                    </button>
                  </div>

                  {resetStep === 1 ? (
                    <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
                      <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                        Forgot your password? Enter your registered email and we'll retrieve a 6-digit confirmation reset code on the spot.
                      </p>

                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Email Connection *</label>
                        <input
                          type="email"
                          required
                          placeholder="chakki@saas.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full rounded-xl border border-gray-150 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      {authError && (
                        <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold leading-relaxed">
                          ⚠ {authError}
                        </div>
                      )}

                      {authSuccess && (
                        <div className="p-2.5 bg-green-50 border border-green-100 rounded-xl text-green-600 text-xs font-semibold">
                          ✓ {authSuccess}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition cursor-pointer text-xs md:text-sm shadow-md shadow-blue-50"
                      >
                        Request Reset Code
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                      <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                        Reset code retrieved! Provide the 6-digit code and choose a new password for your mill workspace.
                      </p>

                      {demoResetCode && (
                        <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-amber-850 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Preview Test Helper Code</span>
                          <p className="text-xs leading-tight">
                            Temporary reset code for <strong>{forgotEmail}</strong> is: <code className="bg-white px-1.5 py-0.5 border rounded-md font-extrabold text-[#d97706] tracking-widest text-sm">{demoResetCode}</code>
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Email Connection</label>
                        <input
                          type="email"
                          disabled
                          value={forgotEmail}
                          className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs md:text-sm text-gray-400 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">6-Digit Reset Code *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 123456"
                          maxLength={6}
                          value={resetCodeInput}
                          onChange={(e) => setResetCodeInput(e.target.value)}
                          className="w-full rounded-xl border border-gray-150 px-3 py-2 text-xs md:text-sm tracking-wider font-extrabold focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">New Password *</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          className="w-full rounded-xl border border-gray-150 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      {authError && (
                        <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold leading-relaxed">
                          ⚠ {authError}
                        </div>
                      )}

                      {authSuccess && (
                        <div className="p-2.5 bg-green-50 border border-green-100 rounded-xl text-green-600 text-xs font-semibold">
                          ✓ {authSuccess}
                        </div>
                      )}

                      <div className="flex gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setResetStep(1)}
                          className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold py-3 rounded-xl transition cursor-pointer text-xs md:text-sm"
                        >
                          Change Email
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition cursor-pointer text-xs md:text-sm shadow-md shadow-green-50"
                        >
                          Reset Password
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                      {isLoginView ? "Sign In Business" : "Create Grain SaaS Shop"}
                    </h2>
                    <button
                      onClick={() => setIsLoginView(!isLoginView)}
                      className="text-xs font-bold text-blue-600 hover:underline focus:outline-none"
                    >
                      {isLoginView ? "Create Shop?" : "Have password?"}
                    </button>
                  </div>

                  {/* Form entries */}
                  <form onSubmit={isLoginView ? handleLogin : handleSignup} className="space-y-4">
                    {!isLoginView && (
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Representative Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Zaman Khan"
                          value={signUpName}
                          onChange={(e) => setSignUpName(e.target.value)}
                          className="w-full rounded-xl border border-gray-150 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    )}

                    {!isLoginView && (
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Chakki Flour Shop Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Pak Fine Grain Millers"
                          value={signUpShop}
                          onChange={(e) => setSignUpShop(e.target.value)}
                          className="w-full rounded-xl border border-gray-150 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Email Connection *</label>
                      <input
                        type="email"
                        required
                        placeholder="chakki@saas.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full rounded-xl border border-gray-150 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400"
                      />
                    </div>

                    {!isLoginView && (
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Phone Line *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. +92 300 1234567"
                          value={signUpPhone}
                          onChange={(e) => setSignUpPhone(e.target.value)}
                          className="w-full rounded-xl border border-gray-150 px-3 py-2 text-xs md:text-sm"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Profile Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full rounded-xl border border-gray-150 px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-400"
                      />
                      {isLoginView && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleToggleForgotView(true)}
                            className="text-[10px] font-extrabold text-blue-600 hover:underline focus:outline-none mt-1"
                          >
                            Forgot Profile Password?
                          </button>
                        </div>
                      )}
                    </div>

                    {authError && (
                      <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold leading-relaxed">
                        ⚠ {authError}
                      </div>
                    )}

                    {authSuccess && (
                      <div className="p-2.5 bg-green-50 border border-green-100 rounded-xl text-green-600 text-xs font-semibold">
                        ✓ {authSuccess}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition cursor-pointer text-xs md:text-sm shadow-md shadow-blue-50"
                    >
                      {isLoginView ? "Sign In to Chakki Desk" : "Activate Onboarding Desk"}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Quick pre-populate links for testing speed */}
            <div className="mt-8 border-t border-gray-100 pt-5">
              <p className="text-[11px] text-gray-400 font-bold uppercase mb-2">Platform Testing Seed Desks</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePrepopulateShop}
                  className="text-left text-[10px] bg-slate-50 border border-gray-100 hover:border-blue-200 hover:bg-white p-2 rounded-xl text-gray-600 cursor-pointer"
                >
                  <strong className="text-gray-900 block font-bold">🌾 Demo Shop Owner</strong>
                  owner@chakki.com
                </button>
                <button
                  onClick={handlePrepopulateAdmin}
                  className="text-left text-[10px] bg-slate-50 border border-gray-100 hover:border-red-200 hover:bg-white p-2 rounded-xl text-gray-600 cursor-pointer"
                >
                  <strong className="text-gray-900 block font-bold">🛡 Super Administrator</strong>
                  ac.repair.in.dubai3@gmail.com
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Choose visual currency symbol
  const curr = settings?.currency || "Rs.";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-950">
      
      {/* Dynamic Nav Sidebar layout */}
      <Sidebar 
        user={user} 
        shop={shop} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />

      {/* Main App Workspace Area container */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-screen">
        
        {/* Top bar header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <h1 className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-1.5">
              <span>{activeTab === "super_admin" ? "SaaS Platform Control Panel" : `${shop?.name || "Grain Mill"} Ledger`}</span>
              {isRefreshing && (
                <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
              )}
            </h1>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-extrabold rounded select-none uppercase tracking-wider">LIVE</span>
          </div>

          <div className="flex items-center space-x-3.5 justify-end">
            <button
              onClick={loadWorkspaceData}
              className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold bg-white text-slate-600 hover:bg-slate-50 transition text-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Refresh State Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync tables</span>
            </button>
            <div className="text-right shrink-0 hidden sm:block">
              <span className="text-[9px] text-slate-400 block font-semibold leading-none uppercase tracking-wider">Current Date Ledger</span>
              <span className="text-xs font-bold text-slate-800 leading-none">{new Date().toLocaleDateString([], { dateStyle: 'long' })}</span>
            </div>
          </div>
        </header>

        {/* Dynamic dismissible system alerts banner */}
        {notifications.length > 0 && activeTab !== "super_admin" && (
          <div className="mx-6 mt-4 space-y-2 select-none">
            {notifications.map(notif => (
              <div 
                key={notif.id} 
                className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex items-center justify-between gap-3 text-left animate-in fade-in"
              >
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{notif.message}</span>
                </div>
                <button
                  onClick={() => handleDismissNotification(notif.id)}
                  className="p-0.5 hover:text-rose-950 text-rose-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dynamic view switcher workspace */}
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          
          {user?.role === "viewer" && (
            <div className="bg-amber-50/75 border border-amber-200/80 rounded-2xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none">👁️</span>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                    Viewing Shop Workspace (Read-Only Mode)
                    <span className="bg-amber-200 text-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-200">
                      Guest View
                    </span>
                  </h4>
                  <p className="text-xs text-amber-700/85 mt-0.5 leading-relaxed">
                    You have secure auditing credentials. Write operations, grain adjustments, cash-drawer settlements, and credit changes are locked but live simulations remain active.
                  </p>
                </div>
              </div>
              <div className="hidden md:block shrink-0 px-3 py-1 bg-amber-100/60 border border-amber-200/50 rounded-xl text-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
                Auditor Role Active
              </div>
            </div>
          )}
          
          {/* A. HOME DASHBOARD WORKSPACE */}
          {activeTab === "dashboard" && dashboardMetrics && (
            <div className="space-y-6 text-left font-sans">
              
              {/* Grid 1: KPI Cards Bento box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. Daily sales */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 block">Today's Sales</span>
                    <h2 className="text-2xl font-bold text-slate-900 mt-1">{curr} {dashboardMetrics.todaySales.toLocaleString()}</h2>
                  </div>
                  <div className="mt-3.5 flex items-center text-green-600 text-xs font-semibold">
                    <ArrowUpRight className="w-4 h-4 mr-1 shrink-0" />
                    Est. margin: {curr} {dashboardMetrics.dailyProfit.toLocaleString()} Today
                  </div>
                </div>

                {/* 2. Cash Register estimates */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 block">Cash in Hand</span>
                    <h2 className="text-2xl font-bold text-slate-900 mt-1">{curr} {dashboardMetrics.cashBalance.toLocaleString()}</h2>
                  </div>
                  <span className="mt-3.5 text-xs text-slate-400 block leading-none font-medium">
                    Calculated from POS + credit collections
                  </span>
                </div>

                {/* 3. Inventory Valuation */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 block">Inventory Value</span>
                    <h2 className="text-2xl font-bold text-slate-900 mt-1">{curr} {dashboardMetrics.inventoryValue.toLocaleString()}</h2>
                  </div>
                  <span className="mt-3.5 text-xs text-orange-600 font-semibold block leading-none">
                    {products.filter(p => p.stockQuantity <= p.minStockAlert).length} items low on stock
                  </span>
                </div>

                {/* 4. Highlight MTD Profit / Outstanding Credits visualizer */}
                <div className="bg-blue-900 text-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1 block">Outstanding Credits</span>
                    <h2 className="text-2xl font-bold mt-1">{curr} {dashboardMetrics.outstandingCredits.toLocaleString()}</h2>
                  </div>
                  <div className="mt-3.5 flex items-center text-blue-200 text-xs font-medium">
                    {dashboardMetrics.outstandingCredits > 15000 ? "⚠️ Review outstanding books" : "On track for safe ledger"}
                  </div>
                </div>

              </div>

              {/* Grid 2: Main Layout Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Column Span 2: Recent Sales Card + Weekly Sales Trend Chart */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Recent sales with top-notch design table */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 text-sm">Recent Ledger Journals (Latest 20 Checkout Slips)</h3>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setTxStartDate(new Date().toISOString().split("T")[0]);
                            setTxEndDate(new Date().toISOString().split("T")[0]);
                            setTxSearchQuery("");
                            setShowAllTransactionsModal(true);
                          }} 
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center"
                        >
                          View All History
                        </button>
                        <button onClick={() => setActiveTab("pos")} className="text-blue-600 hover:text-blue-700 font-bold text-xs transition cursor-pointer">
                          Billing Desk
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto relational-sales-list">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                            <th className="px-6 py-3">Invoice No</th>
                            <th className="px-6 py-3">Customer</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-center">Modality</th>
                            <th className="px-6 py-3 text-right">Grand Total</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-slate-100 text-slate-700">
                          {sales.slice(0, 20).map((s, idx) => (
                            <tr key={s.id} className={`transition duration-150 relative ${idx < 5 ? "bg-blue-50/20 hover:bg-blue-100/60" : "hover:bg-slate-100"}`}>
                              <td className="px-6 py-4 font-mono font-bold text-slate-600">
                                {idx < 5 && <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></span>}
                                {s.invoiceNumber}
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-900">
                                {s.customerName}
                                {idx < 5 && <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] uppercase font-black rounded-sm">New</span>}
                              </td>
                              <td className="px-6 py-4 text-slate-500">{safeFormatDate(s.createdAt)}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                  s.saleType === "Credit" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                                }`}>
                                  {s.saleType}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-slate-900">{curr} {s.total.toLocaleString()}</td>
                            </tr>
                          ))}
                          {sales.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center py-12 text-slate-400">No sales transactions found in your shop history yet</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 7-Day Sales Volume Trends area */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-800 text-sm">7-Day Sales & Profit Margin Curves</h3>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Daily performance telemetry</span>
                    </div>
                    
                    <div className="h-48 md:h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardMetrics.salesChartData}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                          <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                          <Tooltip />
                          <Area type="monotone" name="Sales" dataKey="Sales" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                          <Area type="monotone" name="Profit Margin" dataKey="Profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* Column Span 1: Embedded AI Assistant + Stock alert visual states */}
                <div className="space-y-6">

                  {/* Low Stock Replenishment card */}
                  {products.filter(p => p.stockQuantity <= p.minStockAlert).length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 p-5 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-orange-900 font-bold text-sm">Low Stock Alert</h4>
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="space-y-3.5">
                        {products.filter(p => p.stockQuantity <= p.minStockAlert).slice(0, 3).map(p => {
                          const percentage = Math.min(100, Math.max(5, (p.stockQuantity / (p.minStockAlert * 3)) * 100));
                          return (
                            <div key={p.id} className="space-y-1 text-left">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-orange-800 font-semibold">{p.name}</span>
                                <span className="font-bold text-orange-900">{p.stockQuantity} {p.unit} left</span>
                              </div>
                              <div className="w-full bg-orange-200 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-orange-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button 
                        onClick={() => setActiveTab("inventory")} 
                        className="mt-4 w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-2 rounded-lg transition"
                      >
                        Adjust catalog stocks
                      </button>
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* B. POS BILLING SYSTEM TAB */}
          {activeTab === "pos" && (
            <POSSystem 
              products={products} 
              customers={customers} 
              onSaleComplete={loadWorkspaceData} 
              currency={curr} 
              isReadOnly={user?.role === "viewer"}
            />
          )}

          {/* C. FLOUR CATALOG TAB */}
          {activeTab === "products" && (
            <ProductsPanel 
              products={products} 
              onRefreshNeeded={loadWorkspaceData} 
              currency={curr} 
              isReadOnly={user?.role === "viewer"}
            />
          )}

          {/* D. INVENTORY STOCK LOGS TAB */}
          {activeTab === "inventory" && (
            <InventoryManager 
              products={products} 
              logs={inventoryLogs} 
              onRefreshNeeded={loadWorkspaceData} 
              currency={curr} 
              isReadOnly={user?.role === "viewer"}
            />
          )}

          {/* E. CUSTOMER LEDGER TAB */}
          {activeTab === "customers" && (
            <CustomerLedger 
              customers={customers} 
              onRefreshNeeded={loadWorkspaceData} 
              currency={curr} 
              isReadOnly={user?.role === "viewer"}
            />
          )}

          {/* F. SUPPLIERS CONTRACTS TAB */}
          {activeTab === "suppliers" && (
            <SupplierMill 
              suppliers={suppliers} 
              priceQuotes={priceQuotes}
              onRefreshNeeded={loadWorkspaceData} 
              currency={curr} 
              isReadOnly={user?.role === "viewer"}
            />
          )}

          {/* G. EXPENSES LEDGER TAB */}
          {activeTab === "expenses" && (
            <ExpensesPanel 
              expenses={expenses} 
              onRefreshNeeded={loadWorkspaceData} 
              currency={curr} 
              isReadOnly={user?.role === "viewer"}
            />
          )}

          {/* H. REPORTS & AUDITS WEB DESK */}
          {activeTab === "reports" && (
            <ReportsPanel 
              products={products}
              customers={customers}
              sales={sales}
              expenses={expenses}
              suppliers={suppliers}
              inventoryLogs={inventoryLogs}
              currency={curr}
            />
          )}

          {/* I. SYSTEM SETTINGS PANEL */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="flex border-b border-gray-150">
                <button
                  onClick={() => setSettingsSubTab("general")}
                  className={`px-6 py-3 text-xs font-black uppercase tracking-tight transition-all relative ${
                    settingsSubTab === "general" 
                    ? "text-blue-600 border-b-2 border-blue-600" 
                    : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  General Settings
                </button>
                <button
                  onClick={() => setSettingsSubTab("security")}
                  className={`px-6 py-3 text-xs font-black uppercase tracking-tight transition-all relative ${
                    settingsSubTab === "security" 
                    ? "text-blue-600 border-b-2 border-blue-600" 
                    : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Security & Devices
                </button>
              </div>

              {settingsSubTab === "general" ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
              
              <div className="lg:col-span-2 bg-white p-6 border border-gray-150 rounded-2xl shadow-xs">
                <h3 className="font-bold text-gray-950 text-base border-b border-gray-50 pb-3 mb-4">
                  Shop Identity Configurations
                </h3>

                <form onSubmit={handleSaveSettingsSubmit} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Chakki Flour Shop Name *</label>
                    <input
                      type="text"
                      required
                      value={shopNameInput}
                      onChange={(e) => setShopNameInput(e.target.value)}
                      className="w-full rounded-xl border border-gray-150 px-3 py-2 text-xs md:text-sm focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Currency Symbol</label>
                      <input
                        type="text"
                        required
                        value={currencyInput}
                        onChange={(e) => setCurrencyInput(e.target.value)}
                        className="w-full rounded-xl border border-gray-150 px-3 py-1.5 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Tax rate (%)</label>
                      <input
                        type="number"
                        required
                        value={taxRateInput}
                        onChange={(e) => setTaxRateInput(e.target.value)}
                        className="w-full rounded-xl border border-gray-150 px-3 py-1.5 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Receipt Prefix</label>
                      <input
                        type="text"
                        required
                        value={invoicePrefixInput}
                        onChange={(e) => setInvoicePrefixInput(e.target.value)}
                        className="w-full rounded-xl border border-gray-150 px-3 py-1.5 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Dynamic Color Palette Setting option */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3.5">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">Chakki Store UI Color Palette Preview</h4>
                      <p className="text-[10px] text-gray-400">Select and compare system themes below. See the real-time simulation before saving changes.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* PREVIEW CARD: Professional Blue */}
                      <button
                        type="button"
                        onClick={() => setThemeInput("blue")}
                        className={`flex flex-col gap-3.5 p-4 rounded-xl border text-left transition-all select-none cursor-pointer duration-200 ${
                          themeInput === "blue" 
                            ? "border-[#2563eb] bg-[#eff6ff]/70 text-[#1e3a8a] ring-2 ring-[#2563eb]/20" 
                            : "border-gray-200 bg-white hover:bg-slate-50 text-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0" style={{ borderColor: themeInput === "blue" ? '#2563eb' : '#cbd5e1' }}>
                            {themeInput === "blue" && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2563eb' }}></div>}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-xs">Professional Blue</span>
                            <span className="text-[9px] text-gray-400">Classic corporate slate UI theme</span>
                          </div>
                        </div>

                        {/* Visual Miniature Dashboard Mock */}
                        <div className="w-full border rounded-xl p-2.5 space-y-2 bg-white" style={{ borderColor: '#bfdbfe' }}>
                          <div className="flex justify-between items-center text-[8px] font-black" style={{ color: '#1e3a8a' }}>
                            <span>Atta Pro</span>
                            <span className="px-1.5 py-0.5 rounded-md text-[7px]" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>Active</span>
                          </div>
                          
                          <div className="space-y-0.5">
                            <span className="text-[7px] text-gray-400 block font-semibold">Today's Sales</span>
                            <span className="text-xs font-black block" style={{ color: '#2563eb' }}>Rs. 45,900</span>
                          </div>

                          <div className="w-full text-center text-[7px] font-bold py-1 rounded-md text-white" style={{ backgroundColor: '#2563eb' }}>
                            Issue Receipt
                          </div>
                        </div>

                        {/* Color Swatch Dots */}
                        <div className="flex justify-between items-center">
                          <div className="flex gap-1.5">
                            <span className="w-3.5 h-3.5 rounded-full border border-white shrink-0" style={{ backgroundColor: '#2563eb', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} title="Primary"></span>
                            <span className="w-3.5 h-3.5 rounded-full border border-white shrink-0" style={{ backgroundColor: '#1d4ed8', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} title="Accent Hover"></span>
                            <span className="w-3.5 h-3.5 rounded-full border border-white shrink-0" style={{ backgroundColor: '#eff6ff', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} title="Light Accent Card"></span>
                          </div>
                          {themeInput === "blue" && (
                            <span className="text-[8px] tracking-wide text-[#2563eb] font-bold uppercase py-0.5 px-2 bg-[#eff6ff] rounded-md">Selected</span>
                          )}
                        </div>
                      </button>

                      {/* PREVIEW CARD: Nature Green */}
                      <button
                        type="button"
                        onClick={() => setThemeInput("green")}
                        className={`flex flex-col gap-3.5 p-4 rounded-xl border text-left transition-all select-none cursor-pointer duration-200 ${
                          themeInput === "green" 
                            ? "border-[#16a34a] bg-[#f0fdf4]/70 text-[#14532d] ring-2 ring-[#16a34a]/20" 
                            : "border-gray-200 bg-white hover:bg-slate-50 text-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0" style={{ borderColor: themeInput === "green" ? '#16a34a' : '#cbd5e1' }}>
                            {themeInput === "green" && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#16a34a' }}></div>}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-xs">Nature Green</span>
                            <span className="text-[9px] text-gray-450">Biological forest flour-mill UI theme</span>
                          </div>
                        </div>

                        {/* Visual Miniature Dashboard Mock */}
                        <div className="w-full border rounded-xl p-2.5 space-y-2 bg-white" style={{ borderColor: '#bbf7d0' }}>
                          <div className="flex justify-between items-center text-[8px] font-black" style={{ color: '#14532d' }}>
                            <span>Atta Pro</span>
                            <span className="px-1.5 py-0.5 rounded-md text-[7px]" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>Active</span>
                          </div>
                          
                          <div className="space-y-0.5">
                            <span className="text-[7px] text-gray-400 block font-semibold">Today's Sales</span>
                            <span className="text-xs font-black block" style={{ color: '#16a34a' }}>Rs. 45,900</span>
                          </div>

                          <div className="w-full text-center text-[7px] font-bold py-1 rounded-md text-white" style={{ backgroundColor: '#16a34a' }}>
                            Issue Receipt
                          </div>
                        </div>

                        {/* Color Swatch Dots */}
                        <div className="flex justify-between items-center">
                          <div className="flex gap-1.5">
                            <span className="w-3.5 h-3.5 rounded-full border border-white shrink-0" style={{ backgroundColor: '#16a34a', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} title="Primary"></span>
                            <span className="w-3.5 h-3.5 rounded-full border border-white shrink-0" style={{ backgroundColor: '#15803d', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} title="Accent Hover"></span>
                            <span className="w-3.5 h-3.5 rounded-full border border-white shrink-0" style={{ backgroundColor: '#f0fdf4', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} title="Light Accent Card"></span>
                          </div>
                          {themeInput === "green" && (
                            <span className="text-[8px] tracking-wide text-[#16a34a] font-bold uppercase py-0.5 px-2 bg-[#f0fdf4] rounded-md">Selected</span>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* LIVE INTERACTIVE SIMULATOR PREVIEW CONTAINER */}
                    <div className="mt-4 border border-dashed border-slate-200 rounded-xl p-4 bg-white transition-all duration-300">
                      <div className="flex items-center justify-between mb-3 text-left">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                            Workspace Simulator
                          </span>
                          <span className="text-[9px] text-slate-450">Real-time simulation of selection</span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full uppercase shrink-0">
                          <span className="w-1 h-1 bg-rose-600 rounded-full animate-ping"></span>
                          Unsaved Preview
                        </span>
                      </div>

                      {/* Simulated Interface elements swapping colors according to themeInput */}
                      <div className={`p-4 rounded-xl border transition-all duration-300 text-left ${
                        themeInput === "blue" 
                          ? "bg-[#eff6ff]/40 border-[#bfdbfe] text-[#1e3a8a]" 
                          : "bg-[#f0fdf4]/40 border-[#bbf7d0] text-[#14532d]"
                      }`}>
                        
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <span className="text-[9px] text-gray-400 uppercase font-black tracking-wide block">Today's Atta Sales</span>
                            <div className="text-xl font-extrabold" style={{ color: themeInput === "blue" ? '#2563eb' : '#16a34a' }}>
                              Rs. 45,980
                            </div>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{ 
                            backgroundColor: themeInput === "blue" ? '#dbeafe' : '#dcfce7',
                            color: themeInput === "blue" ? '#1e40af' : '#15803d'
                          }}>
                            + 12.5% Today
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="p-2 border bg-white rounded-lg" style={{ borderColor: themeInput === "blue" ? '#bfdbfe/40' : '#bbf7d0/40' }}>
                            <span className="text-[9px] text-gray-400 block font-semibold leading-none">Grinding Status</span>
                            <span className="text-[10px] font-bold block mt-1" style={{ color: themeInput === "blue" ? '#2563eb' : '#16a34a' }}>
                              ● Mill Running
                            </span>
                          </div>
                          
                          <div className="p-2 border bg-white rounded-lg" style={{ borderColor: themeInput === "blue" ? '#bfdbfe/40' : '#bbf7d0/40' }}>
                            <span className="text-[9px] text-gray-450 block font-semibold leading-none">Inventory Level</span>
                            <span className="text-[10px] font-black block mt-1" style={{ color: themeInput === "blue" ? '#1d4ed8' : '#15803d' }}>
                              3 alert stocks
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="flex-1 text-center font-bold text-[10px] py-1.5 rounded-lg transition-colors text-white"
                            style={{ backgroundColor: themeInput === "blue" ? '#2563eb' : '#16a34a' }}
                          >
                            New Bill Sale
                          </button>
                          
                          <button
                            type="button"
                            className="flex-1 text-center font-semibold text-[10px] py-1.5 rounded-lg border bg-white"
                            style={{ 
                              borderColor: themeInput === "blue" ? '#bfdbfe' : '#bbf7d0',
                              color: themeInput === "blue" ? '#2563eb' : '#16a34a'
                            }}
                          >
                            Add Grain Stock
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>

                  {settingsMessage && (
                    <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 text-xs font-semibold leading-relaxed">
                      {settingsMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    Confirm Save settings
                  </button>
                </form>
              </div>

              {/* Maintenance Tools (Restricted to Super Admin only) */}
              {user?.role === "super_admin" && (
                <div className="bg-red-50/20 border border-red-100 rounded-2xl p-5">
                  <h3 className="font-extrabold text-red-950 text-sm border-b border-red-100/50 pb-2.5 mb-3 uppercase flex items-center justify-between">
                    <span>Danger maintenance</span>
                    <ShieldCheck className="w-5 h-5 text-red-600" />
                  </h3>
                  <p className="text-[11px] text-gray-500 mb-4 leading-normal">
                    Perform system-wide diagnostics of variables. If demo parameters ever get locked or misaligned, you can seed the database to factory settings instantly.
                  </p>
                  <button
                    onClick={handleDbReset}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition border cursor-pointer"
                  >
                    Factory database Reset
                  </button>
                </div>
              )}

                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  <SecurityPanel onToast={showToast} />
                </div>
              )}
            </div>
          )}

          {/* I. SUPER PLATFORM ADMIN TAB */}
          {activeTab === "super_admin" && superAdminData && (
            <div className="space-y-6 text-left">
              
              {/* Stats bento */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-xs">
                  <span className="text-[10px] text-gray-400 uppercase font-black block">Total Shops</span>
                  <h4 className="text-xl font-bold mt-1 text-gray-950">{superAdminData.totalShops} registered</h4>
                </div>
                <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-xs">
                  <span className="text-[10px] text-gray-400 uppercase font-black block">Active workspaces</span>
                  <h4 className="text-xl font-bold mt-1 text-green-600">{superAdminData.activeShops} Online</h4>
                </div>
                <div className="bg-white border border-gray-155 rounded-xl p-4 shadow-xs">
                  <span className="text-[10px] text-gray-400 uppercase font-black block">Platform Users</span>
                  <h4 className="text-xl font-bold mt-1 text-gray-950">{superAdminData.totalUsers} profiles</h4>
                </div>
                <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-xs bg-gradient-to-tr from-slate-50 to-white">
                  <span className="text-[10px] text-red-500 uppercase font-extrabold block">Est. SaaS Revenue MRR</span>
                  <h4 className="text-xl font-black mt-1 text-blue-600">PKR {superAdminData.platformRevenue} / mo</h4>
                </div>
              </div>

              {/* Advanced database management */}
              <div className="bg-white rounded-xl border border-gray-150 p-5">
                <div className="flex flex-wrap items-center justify-between border-b border-gray-50 pb-3 mb-4 gap-2">
                  <h3 className="font-bold text-gray-950 text-sm">Tenant Business directory list</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddShopModal(true)}
                      className="p-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shrink-0 inline-flex items-center gap-1 cursor-pointer"
                    >
                      ➕ Add New Shop
                    </button>
                    <button
                      onClick={handleFetchRawDb}
                      className="p-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition shrink-0 inline-flex items-center gap-1 cursor-pointer"
                    >
                      🔍 Inspect Live DB
                    </button>
                    <button
                      onClick={handleDownloadDbFile}
                      className="p-1.5 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition shrink-0 inline-flex items-center gap-1 cursor-pointer"
                    >
                      📥 Export db.json
                    </button>
                    <button
                      onClick={handleDbReset}
                      className="p-1.5 px-3 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-lg transition shrink-0 cursor-pointer"
                    >
                      Reseed seed data
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead>
                      <tr className="border-b border-gray-100 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="py-2 px-3">Shop Branding</th>
                        <th className="py-2 px-3">Owner Contact</th>
                        <th className="py-2 px-3 text-center">Plan</th>
                        <th className="py-2 px-3 text-center">SaaS Status</th>
                        <th className="py-2 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {superAdminData.shops.map((s: any) => (
                        <tr key={s.id} className="hover:bg-slate-50/20">
                          <td className="py-3 px-3">
                            <strong className="text-gray-950 block">{s.name}</strong>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">{s.id}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-gray-700 block">{s.phone}</span>
                            <span className="text-[10px] text-gray-400 font-mono">Tenant</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full inline-block">
                              {s.subscription}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                              s.status === "active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                            }`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleToggleShopAction(s.id, s.status)}
                                className={`py-1 px-2 border rounded-lg text-[10px] font-black transition cursor-pointer ${
                                  s.status === "active"
                                    ? "bg-red-50 border-red-150 text-red-600 hover:bg-red-100"
                                    : "bg-green-50 border-green-150 text-green-600 hover:bg-green-100"
                                }`}
                              >
                                {s.status === "active" ? "Block" : "Activate"}
                              </button>
                              <button
                                onClick={() => handleDeleteShop(s.id, s.name)}
                                className="py-1 px-2.5 bg-rose-50 border border-rose-150 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded-lg transition inline-flex items-center cursor-pointer"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* System User Profiles Directory Table Card */}
              <div className="bg-white rounded-xl border border-gray-150 p-5 mt-6">
                <div className="border-b border-gray-50 pb-3 mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-950 text-sm">System Login & Registered Tenant Accounts</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">
                      Direct authentication records recorded inside the SaaS database instance. Use these credentials to sign into the respective shops.
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(true)}
                      className="p-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      ➕ Add New Account
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700 font-sans">
                    <thead>
                      <tr className="border-b border-gray-100 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="py-2 px-3">User Profile</th>
                        <th className="py-2 px-3">Email connection</th>
                        <th className="py-2 px-3">Phone line</th>
                        <th className="py-2 px-3">Access Password</th>
                        <th className="py-2 px-3 text-center">Security Role</th>
                        <th className="py-2 px-3">Workspace Context</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {superAdminData.users?.map((u: any) => {
                        const associatedShop = superAdminData.shops?.find((s: any) => s.id === u.shopId);
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/20">
                            <td className="py-3 px-3">
                              <strong className="text-gray-950 block">{u.name}</strong>
                              <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">{u.id}</span>
                            </td>
                            <td className="py-3 px-3 font-semibold text-gray-800 font-mono text-[11px]">
                              {u.email}
                            </td>
                            <td className="py-3 px-3 text-gray-600 font-mono text-[11px]">
                              {u.phone || "-"}
                            </td>
                            <td className="py-3 px-3">
                              <span className="bg-amber-50 text-amber-800 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-amber-250">
                                {u.password || "No password stored"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                                u.role === "super_admin" 
                                  ? "bg-purple-100 text-purple-700 border border-purple-200" 
                                  : u.role === "owner" 
                                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                                    : "bg-gray-100 text-gray-700 border border-gray-200"
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {associatedShop ? (
                                <div>
                                  <strong className="text-gray-800 block text-[11px]">{associatedShop.name}</strong>
                                  <span className="text-[9px] text-gray-400 uppercase font-mono tracking-wider">ID: {u.shopId}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-[11px]">Global Platform Admin</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setAdminSelectedUser({ id: u.id, name: u.name, current: u.password || "", role: u.role, shopId: u.shopId });
                                    setAdminNewPasswordInput(u.password || "");
                                    setAdminNewRole(u.role || "owner");
                                    setAdminNewShopId(u.shopId || "null");
                                  }}
                                  className="py-1 px-2.5 bg-blue-50 border border-blue-150 hover:bg-blue-100 text-blue-600 text-[10px] font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                                >
                                  ⚙️ Edit Profile
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  className="py-1 px-2.5 bg-rose-50 border border-rose-150 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded-lg transition inline-flex items-center cursor-pointer"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* Live JSON Database Inspector Modal overlay */}
      {showRawDbModal && rawDbJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-gray-150 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-left">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-950">🔍 Live Enterprise Database JSON Dump</h3>
                <p className="text-[10px] text-gray-400 mt-0.5 font-mono">Instance Type: Atta Chakki CRM Sandbox Database</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadDbFile}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold rounded-lg transition pointer hover:opacity-90"
                >
                  Download db.json
                </button>
                <button
                  type="button"
                  onClick={() => setShowRawDbModal(false)}
                  className="px-3 py-1.5 border border-gray-200 hover:bg-gray-100 text-gray-700 text-[11px] font-bold rounded-lg transition pointer"
                >
                  Close Inspector
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-[11px] text-emerald-400 leading-relaxed">
              <pre className="whitespace-pre-wrap selection:bg-emerald-900 selection:text-white pre-db text-emerald-400">
                {JSON.stringify(rawDbJson, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Admin User Password administration modal overlay */}
      {adminSelectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-gray-150 max-w-md w-full shadow-2xl overflow-hidden text-left">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-950">⚙️ Manage User Security & Workspace</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">User: <span className="font-mono font-bold text-gray-700">{adminSelectedUser.name}</span> (ID: {adminSelectedUser.id})</p>
              </div>
              <button
                type="button"
                onClick={() => setAdminSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Passcode/Access Password</label>
                <input
                  type="text"
                  value={adminNewPasswordInput}
                  onChange={(e) => setAdminNewPasswordInput(e.target.value)}
                  placeholder="Enter user log-in key..."
                  className="w-full text-xs font-mono font-semibold bg-white border border-gray-200 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Security Role Mapping</label>
                <select
                  value={adminNewRole}
                  onChange={(e) => setAdminNewRole(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="super_admin">⚡ super_admin (Global Platform Admin)</option>
                  <option value="owner">💼 owner (Tenant Business Owner)</option>
                  <option value="manager">👤 manager (Branch Store Manager)</option>
                  <option value="operator">🖥️ operator (Counter POS Operator)</option>
                  <option value="viewer">👁️ viewer (Read-only Guest Viewer)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Active Workspace Assignment</label>
                <select
                  value={adminNewShopId}
                  onChange={(e) => setAdminNewShopId(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="null">🌐 None (Global Platform Root Context)</option>
                  {superAdminData?.shops?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      🏪 {s.name} (ID: {s.id})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                  Associates the personnel login with a direct merchant shop context for standard office access.
                </p>
              </div>
            </div>

            <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAdminSelectedUser(null)}
                className="px-3.5 py-2 border border-gray-200 hover:bg-white text-gray-700 font-bold rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateUserProfile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition cursor-pointer shadow-xs"
              >
                Save Profile Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add new tenant shop modal overlay */}
      {showAddShopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-gray-150 max-w-sm w-full shadow-2xl overflow-hidden text-left">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-950">🏪 Create New Tenant Grain Shop</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Launches a fresh business workspace instance</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddShopModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold shadow-xs transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShop}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Shop Name *</label>
                  <input
                    type="text"
                    required
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    placeholder="e.g. Al-Hamd Flour & Grain Mill"
                    className="w-full text-xs bg-white border border-gray-200 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Phone Line</label>
                  <input
                    type="text"
                    value={newShopPhone}
                    onChange={(e) => setNewShopPhone(e.target.value)}
                    placeholder="e.g. +92 300 1234567"
                    className="w-full text-xs font-mono bg-white border border-gray-200 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newShopEmail}
                    onChange={(e) => setNewShopEmail(e.target.value)}
                    placeholder="e.g. shopname@gmail.com"
                    className="w-full text-xs font-mono bg-white border border-gray-200 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">SaaS Subscription Plan</label>
                  <select
                    value={newShopSubscription}
                    onChange={(e) => setNewShopSubscription(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="trial">🌱 Free Trial Plan</option>
                    <option value="premium">⭐ Premium Shop Plan (5,000 PKR)</option>
                    <option value="enterprise">🏢 Enterprise Flour mill (15,000 PKR)</option>
                  </select>
                </div>
              </div>

              <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddShopModal(false)}
                  className="px-3.5 py-2 border border-gray-200 hover:bg-white text-gray-700 font-bold rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition cursor-pointer shadow-xs"
                >
                  Create Mill Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add new user account modal overlay */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-gray-150 max-w-sm w-full shadow-2xl overflow-hidden text-left">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-950">👤 Add New Security Account</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Creates credentials for system login</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Muhammad Ali"
                    className="w-full text-xs bg-white border border-gray-200 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Email Connection *</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="e.g. ali@flourmill.com"
                    className="w-full text-xs font-mono bg-white border border-gray-200 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Phone Line</label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="e.g. +92 321 9876543"
                    className="w-full text-xs font-mono bg-white border border-gray-200 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Access Passcode / Password *</label>
                  <input
                    type="text"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Set direct login key..."
                    className="w-full text-xs font-mono bg-white border border-gray-200 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Security Role Mapping</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="super_admin">⚡ super_admin (Global Platform Admin)</option>
                    <option value="owner">💼 owner (Tenant Business Owner)</option>
                    <option value="manager">👤 manager (Branch Store Manager)</option>
                    <option value="operator">🖥️ operator (Counter POS Operator)</option>
                    <option value="viewer">👁️ viewer (Read-only Guest Viewer)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Active Workspace Assignment</label>
                  <select
                    value={newUserShopId}
                    onChange={(e) => setNewUserShopId(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="null">🌐 None (Global Platform Root Context)</option>
                    {superAdminData?.shops?.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        🏪 {s.name} (ID: {s.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3.5 py-2 border border-gray-200 hover:bg-white text-gray-700 font-bold rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition cursor-pointer shadow-xs"
                >
                  Create Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LARGE ALL TRANSACTIONS LIST MODAL */}
      {showAllTransactionsModal && (() => {
        // Pre-calculate listing based on filters
        const filteredTxSales = sales.filter(s => {
          const sDate = s.createdAt ? s.createdAt.substring(0, 10) : "";
          const matchesStart = !txStartDate || sDate >= txStartDate;
          const matchesEnd = !txEndDate || sDate <= txEndDate;
          const matchesSearch = !txSearchQuery || 
            (s.invoiceNumber || "").toLowerCase().includes(txSearchQuery.toLowerCase()) ||
            (s.customerName || "").toLowerCase().includes(txSearchQuery.toLowerCase()) ||
            (s.paymentMethod || "").toLowerCase().includes(txSearchQuery.toLowerCase()) ||
            (s.saleType || "").toLowerCase().includes(txSearchQuery.toLowerCase());
          return matchesStart && matchesEnd && matchesSearch;
        });

        const filteredRevenue = filteredTxSales.reduce((sum, s) => sum + s.total, 0);
        const filteredCost = filteredTxSales.reduce((sum, s) => sum + s.totalCost, 0);
        const filteredProfit = Math.max(0, filteredRevenue - filteredCost);

        const setTodayFilter = () => {
          const today = new Date().toISOString().split("T")[0];
          setTxStartDate(today);
          setTxEndDate(today);
        };

        const setYesterdayFilter = () => {
          const d = new Date();
          d.setDate(d.getDate() - 1);
          const yesterday = d.toISOString().split("T")[0];
          setTxStartDate(yesterday);
          setTxEndDate(yesterday);
        };

        const setMonthFilter = () => {
          const d = new Date();
          d.setDate(1);
          const monthStart = d.toISOString().split("T")[0];
          const today = new Date().toISOString().split("T")[0];
          setTxStartDate(monthStart);
          setTxEndDate(today);
        };

        const setAllTimeFilter = () => {
          setTxStartDate("");
          setTxEndDate("");
        };

        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-gray-150 max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-left">
              
              {/* Header */}
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-950 flex items-center gap-2">
                    📊 Complete Sales Ledger & Checkout Journals
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Search and filter all historic and real-time mill sales counter invoices
                  </p>
                </div>
                <button
                  onClick={() => setShowAllTransactionsModal(false)}
                  className="p-1 px-3 border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Close Journals
                </button>
              </div>

              {/* Filters Panel */}
              <div className="p-5 bg-slate-50 border-b border-gray-150 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Date range inputs */}
                <div className="md:col-span-5 flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Start Date</label>
                    <input 
                      type="date" 
                      value={txStartDate} 
                      onChange={e => setTxStartDate(e.target.value)} 
                      className="w-full text-xs font-semibold bg-white border border-gray-200 text-gray-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <span className="text-gray-400 text-xs mt-4">to</span>
                  <div className="flex-1">
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">End Date</label>
                    <input 
                      type="date" 
                      value={txEndDate} 
                      onChange={e => setTxEndDate(e.target.value)} 
                      className="w-full text-xs font-semibold bg-white border border-gray-200 text-gray-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Quick select tags */}
                <div className="md:col-span-3">
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Quick Select Range</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button 
                      onClick={setTodayFilter} 
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                        txStartDate === new Date().toISOString().split("T")[0] && txEndDate === new Date().toISOString().split("T")[0]
                          ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      Today
                    </button>
                    <button 
                      onClick={setYesterdayFilter} 
                      className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 transition cursor-pointer"
                    >
                      Yesterday
                    </button>
                    <button 
                      onClick={setMonthFilter} 
                      className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 transition cursor-pointer"
                    >
                      This Month
                    </button>
                    <button 
                      onClick={setAllTimeFilter} 
                      className={`px-2 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                        !txStartDate && !txEndDate 
                          ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      All Time
                    </button>
                  </div>
                </div>

                {/* Search bar */}
                <div className="md:col-span-4">
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Search Journals</label>
                  <input 
                    type="text" 
                    placeholder="Search client, invoice #, modality, cash type..."
                    value={txSearchQuery}
                    onChange={e => setTxSearchQuery(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Summary Stats Panels */}
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-white rounded-xl border border-gray-150 shadow-2xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Invoiced Amount</span>
                  <p className="text-xl font-extrabold text-slate-900 mt-0.5">{curr} {filteredRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-150 shadow-2xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Est. Profit Margin</span>
                  <p className="text-xl font-extrabold text-green-600 mt-0.5">{curr} {filteredProfit.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-150 shadow-2xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Transactions Count</span>
                  <p className="text-xl font-extrabold text-indigo-600 mt-0.5">{filteredTxSales.length} Checkout Slips</p>
                </div>
              </div>

              {/* Journal Table Body */}
              <div className="p-5 overflow-y-auto flex-1 bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Invoice No</th>
                      <th className="px-4 py-3">Customer Client Name</th>
                      <th className="px-4 py-3 text-center">Modality</th>
                      <th className="px-4 py-3 text-center">Payment System</th>
                      <th className="px-4 py-3 text-right">Grand Total</th>
                      <th className="px-4 py-3 text-right">Amount Paid</th>
                      <th className="px-4 py-3 text-center">Operation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredTxSales.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 text-slate-500 font-medium whitespace-nowrap">
                          {safeFormatDateTime(s.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">{s.invoiceNumber}</td>
                        <td className="px-4 py-3 font-semibold text-slate-950">{s.customerName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            s.saleType === "Credit" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                          }`}>
                            {s.saleType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">
                            {s.paymentMethod || "Cash"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-950">{curr} {s.total.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-600">{curr} {s.amountPaid.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setTxSelectedSale(s)}
                            className="text-xs bg-slate-900 hover:bg-black text-white font-bold px-2.5 py-1 rounded transition cursor-pointer"
                          >
                            View Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredTxSales.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-16 text-slate-400 font-medium">
                          No active sales journals matching specified date boundaries and filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* RETAIL RECEIPT DETAIL DIALOG */}
      {txSelectedSale && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-left border border-gray-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setTxSelectedSale(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt print Friendly layout */}
            <div className="text-center pb-4 border-b border-dashed border-gray-200">
              <span className="text-2xl">🌾</span>
              <h3 className="font-extrabold text-gray-950 text-base uppercase leading-tight mt-1">PAK GRAIN CHAKKI</h3>
              <p className="text-[10px] text-gray-500">Chakki Stop, Main Baazar, Lahore · +92 300 1234567</p>
              <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Retail Sales Receipt</p>
            </div>

            <div className="py-4 text-[11.5px] text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Invoice No:</span>
                <strong className="text-gray-950 font-bold">{txSelectedSale.invoiceNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span>Date Mill:</span>
                <span>{safeFormatDateTime(txSelectedSale.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Client ledger:</span>
                <span className="font-semibold text-gray-950">{txSelectedSale.customerName}</span>
              </div>
              <div className="flex justify-between flex-wrap gap-1">
                <span>Checkout type:</span>
                <span className="font-bold text-blue-600 uppercase text-[10px] bg-blue-50 px-1.5 py-0.5 rounded">{txSelectedSale.saleType} ({txSelectedSale.paymentMethod})</span>
              </div>
            </div>

            {/* Purchased Items lists */}
            <table className="w-full text-left text-[11px] mb-4">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase">
                  <th className="py-1">Flour Item</th>
                  <th className="py-1 text-center font-bold">Qty</th>
                  <th className="py-1 text-right font-bold">Rate</th>
                  <th className="py-1 text-right font-black">Sum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {txSelectedSale.items?.map(item => (
                  <tr key={item.id} className="text-gray-700">
                    <td className="py-2 max-w-[140px] truncate font-medium text-gray-950">{item.productName}</td>
                    <td className="py-2 text-center font-semibold">{item.quantity} {item.unit}</td>
                    <td className="py-2 text-right">{curr} {item.price}</td>
                    <td className="py-2 text-right font-extrabold text-gray-950">{curr} {item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations summaries */}
            <div className="border-t border-dashed border-gray-200 pt-4 text-[11px] text-gray-600 space-y-1.5 pb-2">
              <div className="flex justify-between">
                <span>Subtotal amount</span>
                <span>{curr} {txSelectedSale.subtotal}</span>
              </div>
              {txSelectedSale.discount > 0 && (
                <div className="flex justify-between text-red-500 font-semibold">
                  <span>Deducted Discount</span>
                  <span>- {curr} {txSelectedSale.discount}</span>
                </div>
              )}
              {txSelectedSale.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax GST Charged</span>
                  <span>+ {curr} {txSelectedSale.tax}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black text-gray-950 uppercase pt-2 border-t border-gray-150">
                <span>Invoice Total</span>
                <span>{curr} {txSelectedSale.total}</span>
              </div>
              <div className="flex justify-between text-[11px] pt-1 text-gray-500 font-semibold">
                <span>Amount Paid Today</span>
                <span>{curr} {txSelectedSale.amountPaid}</span>
              </div>
              {txSelectedSale.total - txSelectedSale.amountPaid > 0 && (
                <div className="flex justify-between text-[11px] text-red-600 font-bold">
                  <span>Ledger Credit Balance Added</span>
                  <span>Rs. {txSelectedSale.total - txSelectedSale.amountPaid}</span>
                </div>
              )}
            </div>

            {/* Footnote greeting */}
            <div className="text-center pt-5 border-t border-gray-100 text-[10px] text-gray-400 font-semibold italic">
              Thank you for trusting Pak Grain Millers! <br />
              Generated via Atta Chakki SaaS Desk.
            </div>

            <div className="mt-5 flex gap-2 print:hidden justify-center">
              <button
                onClick={() => window.print()}
                className="w-full bg-gray-900 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-black transition flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setTxSelectedSale(null)}
                className="w-full border border-gray-200 text-gray-500 font-bold py-2.5 rounded-xl text-xs hover:bg-gray-100 transition flex items-center justify-center cursor-pointer"
              >
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Quick Actions FAB and Modals */}
      {user && user.role !== "super_admin" && (
        <>
          {/* Floating Action Button */}
          <div className="fixed bottom-6 right-6 z-40 print:hidden text-left">
            <div className="relative">
              {/* Dropdown Menu */}
              <AnimatePresence>
                {showQuickActions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 15 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-16 right-0 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
                  >
                    <div className="p-3 bg-slate-50 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Quick Actions
                      </span>
                    </div>
                    <div className="p-1.5 space-y-1">
                      {/* 1. Add New Sale */}
                      <button
                        onClick={() => {
                          setActiveTab("pos");
                          setShowQuickActions(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl transition flex items-center gap-2.5 cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                          <Plus className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-[11px] leading-tight">Add New Sale</p>
                          <p className="text-[9px] text-slate-400 font-medium truncate">Launch POS invoice</p>
                        </div>
                      </button>

                      {/* 2. Create New Expense */}
                      <button
                        onClick={() => {
                          setShowQuickExpenseModal(true);
                          setShowQuickActions(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl transition flex items-center gap-2.5 cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-[11px] leading-tight">Log Expense</p>
                          <p className="text-[9px] text-slate-400 font-medium truncate">Record daily shop cost</p>
                        </div>
                      </button>

                      {/* 3. Adjust Inventory */}
                      <button
                        disabled={user?.role === "viewer"}
                        onClick={() => {
                          setShowQuickInventoryModal(true);
                          setShowQuickActions(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl transition flex items-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        title={user?.role === "viewer" ? "Auditor locked" : ""}
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-[11px] leading-tight">Adjust Inventory</p>
                          <p className="text-[9px] text-slate-400 font-medium truncate">Intake wheat or adjust levels</p>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Toggle Trigger Main Button */}
              <button
                id="quick-actions-fab"
                onClick={() => setShowQuickActions(!showQuickActions)}
                className={`w-14 h-14 sm:w-12 sm:h-12 rounded-full ${
                  showQuickActions ? "bg-slate-800 rotate-45" : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:shadow-xl hover:scale-105"
                } text-white shadow-lg flex items-center justify-center transition-all duration-200 cursor-pointer`}
                title="Quick Operations Panel"
              >
                {showQuickActions ? <X className="w-6 h-6" /> : <Zap className="w-5 h-5 fill-current" />}
              </button>
            </div>
          </div>

          {/* QUICK EXPENSE MODAL */}
          <AnimatePresence>
            {showQuickExpenseModal && (
              <div className="fixed inset-0 bg-black/50 overflow-y-auto flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden text-left"
                >
                  <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-rose-700">
                      <Receipt className="w-5 h-5" />
                      <h4 className="font-black text-sm uppercase tracking-wide">Quick Expense Log</h4>
                    </div>
                    <button
                      onClick={() => setShowQuickExpenseModal(false)}
                      className="p-1 rounded-lg hover:bg-rose-100 text-rose-400 hover:text-rose-700 cursor-pointer font-bold"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleQuickExpenseSubmit} className="p-5 space-y-4">
                    {quickExpenseError && (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-[11px] font-semibold rounded-xl flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{quickExpenseError}</span>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Expense Category *</label>
                      <select
                        value={quickExpenseCategory}
                        onChange={(e: any) => setQuickExpenseCategory(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white"
                      >
                        <option value="Electricity">Electricity</option>
                        <option value="Transport">Transport</option>
                        <option value="Labor">Labor (Helper wages)</option>
                        <option value="Rent">Rent</option>
                        <option value="Packaging">Packaging</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Amount ({curr}) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 1500"
                        value={quickExpenseAmount}
                        onChange={(e) => setQuickExpenseAmount(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white"
                        required
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Date Logged *</label>
                      <input
                        type="date"
                        value={quickExpenseDate}
                        onChange={(e) => setQuickExpenseDate(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Voucher Description</label>
                      <textarea
                        placeholder="Write audit notes or helper name..."
                        rows={2}
                        value={quickExpenseDescription}
                        onChange={(e) => setQuickExpenseDescription(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white resize-none"
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100 font-semibold">
                      <button
                        type="button"
                        onClick={() => setShowQuickExpenseModal(false)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs cursor-pointer transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={quickExpenseLoading}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-450 text-white rounded-xl text-xs cursor-pointer transition inline-flex items-center gap-1"
                      >
                        {quickExpenseLoading ? "Saving..." : "Log Expense"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* QUICK INVENTORY ADJUSTMENT MODAL */}
          <AnimatePresence>
            {showQuickInventoryModal && (
              <div className="fixed inset-0 bg-black/50 overflow-y-auto flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden text-left"
                >
                  <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-800">
                      <ArrowUpDown className="w-5 h-5 animate-pulse" />
                      <h4 className="font-black text-sm uppercase tracking-wide">Quick Stock Adjust</h4>
                    </div>
                    <button
                      onClick={() => setShowQuickInventoryModal(false)}
                      className="p-1 rounded-lg hover:bg-amber-100 text-amber-500 hover:text-amber-800 cursor-pointer font-bold"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleQuickAdjustSubmit} className="p-5 space-y-4">
                    {quickAdjustError && (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-[11px] font-semibold rounded-xl flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{quickAdjustError}</span>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Target Product *</label>
                      <select
                        value={quickAdjustProdId}
                        onChange={(e) => setQuickAdjustProdId(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white"
                        required
                      >
                        <option value="">Choose grain item...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) - {p.stockQuantity} {p.unit} left
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Adjustment Type *</label>
                      <select
                        value={quickAdjustType}
                        onChange={(e: any) => setQuickAdjustType(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white"
                        required
                      >
                        <option value="in">Intake / Stock Addition (+)</option>
                        <option value="out">Correction / Deduct (-)</option>
                        <option value="adjustment">Custom Adjustment (Audit)</option>
                        <option value="wastage">Moisture Loss / Wastage (-)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Quantity *</label>
                      <input
                        type="number"
                        placeholder="e.g. 50"
                        value={quickAdjustQuantity}
                        onChange={(e) => setQuickAdjustQuantity(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white"
                        required
                        min="0.1"
                        step="any"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Reason / Note</label>
                      <textarea
                        placeholder="Write stock adjustment remarks..."
                        rows={2}
                        value={quickAdjustNote}
                        onChange={(e) => setQuickAdjustNote(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white resize-none"
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100 font-semibold">
                      <button
                        type="button"
                        onClick={() => setShowQuickInventoryModal(false)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs cursor-pointer transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={quickAdjustLoading}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-450 text-white rounded-xl text-xs cursor-pointer transition inline-flex items-center gap-1"
                      >
                        {quickAdjustLoading ? "Updating..." : "Adjust Level"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Global toaster container */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none print:hidden">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className={`p-3.5 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md pointer-events-auto ${
                t.type === 'success' ? 'bg-emerald-50/95 border-emerald-100 text-emerald-800' :
                t.type === 'error' ? 'bg-rose-50/95 border-rose-100 text-rose-800' :
                t.type === 'warning' ? 'bg-amber-50/95 border-amber-100 text-amber-800' :
                'bg-blue-50/95 border-blue-100 text-blue-800'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                t.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                t.type === 'error' ? 'bg-rose-100 text-rose-600' :
                t.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {t.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {t.type === 'error' && <X className="w-5 h-5" />}
                {t.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                {t.type === 'info' && <Bell className="w-5 h-5" />}
              </div>
              <p className="text-xs font-black leading-tight">{t.message}</p>
              <button 
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className="ml-auto text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
