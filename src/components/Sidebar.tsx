import React from "react";
import { 
  Gauge, ShoppingCart, Package, Layers, Users, Truck, Receipt, Settings, ShieldCheck, LogOut, Sparkles, Menu, X, TrendingUp, ChevronLeft, ChevronRight
} from "lucide-react";
import { User, Shop } from "../types";

interface SidebarProps {
  user: User;
  shop: Shop | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ user, shop, activeTab, setActiveTab, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Gauge, roles: ["owner", "manager", "cashier", "viewer", "operator"] },
    { id: "pos", label: "Store POS (Sales)", icon: ShoppingCart, roles: ["owner", "manager", "cashier", "operator"] },
    { id: "products", label: "Flour Catalog", icon: Package, roles: ["owner", "manager", "viewer", "operator"] },
    { id: "inventory", label: "Inventory Stock", icon: Layers, roles: ["owner", "manager", "viewer", "operator"] },
    { id: "customers", label: "Customer Ledger", icon: Users, roles: ["owner", "manager", "cashier", "viewer", "operator"] },
    { id: "suppliers", label: "Supplier Bills", icon: Truck, roles: ["owner", "manager", "viewer"] },
    { id: "expenses", label: "Expenses Ledger", icon: Receipt, roles: ["owner", "manager", "viewer"] },
    { id: "reports", label: "Reports & Audits", icon: TrendingUp, roles: ["owner", "manager", "viewer"] },
    { id: "settings", label: "Settings Panel", icon: Settings, roles: ["owner"] },
  ];

  // Filter items matching user rule
  const visibleItems = menuItems.filter(item => item.roles.includes(user.role));

  const roleLabels: { [key: string]: string } = {
    super_admin: "Platform Administrator",
    owner: "Shop Owner",
    manager: "Mill Manager",
    cashier: "POS Cashier",
    operator: "POS Operator",
    viewer: "Workspace Viewer (Read-only)",
  };

  return (
    <>
      {/* Mobile Top Header Banner with Navigation Triggers */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">🌾</div>
          <span className="font-semibold text-gray-900 text-base">{shop?.name || "GrainSaaS Dashboard"}</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-1 px-2 border border-gray-100 rounded-md text-gray-500 hover:text-blue-600 focus:outline-none"
          id="btn-mobile-menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Main Sidebar Wrapper */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 transform lg:translate-x-0 lg:static flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out shadow-sm
        ${isCollapsed ? "w-64 lg:w-20" : "w-64 lg:w-64"}
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:flex"}
      `}>
        {/* Brand Header */}
        <div className={`hidden lg:flex items-center justify-between px-4 py-5 border-b border-slate-100 ${isCollapsed ? "flex-col gap-4 py-6" : ""}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <div className="w-4 h-4 border-2 border-white rounded-full"></div>
            </div>
            {!isCollapsed && (
              <span className="font-extrabold text-xl tracking-tight text-blue-900 uppercase">FlourFlow</span>
            )}
          </div>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-blue-600 focus:outline-none cursor-pointer transition-transform duration-100 active:scale-95"
            title={isCollapsed ? "Expand Sidebar Menu" : "Collapse Sidebar Menu"}
          >
            {isCollapsed ? <ChevronRight className="w-4.5 h-4.5" /> : <ChevronLeft className="w-4.5 h-4.5" />}
          </button>
        </div>

        {/* Sidebar Nav Area */}
        <nav className={`flex-1 p-4 space-y-1 overflow-y-auto ${isCollapsed ? "px-2" : ""}`}>
          {/* Super Admin Panel Tab Override */}
          {user.role === "super_admin" && (
            <button
              onClick={() => {
                setActiveTab("super_admin");
                setIsOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === "super_admin"
                  ? "bg-red-50 text-red-700 font-semibold"
                  : "text-slate-500 hover:bg-slate-50"
              } ${isCollapsed ? "justify-center px-2" : ""}`}
              title={isCollapsed ? "Super Admin Desk" : undefined}
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span>Super Admin Desk</span>}
            </button>
          )}

          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm transition-all font-medium ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                } ${isCollapsed ? "justify-center px-1" : ""}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Workspace Account Status Widget */}
        <div className="p-4 border-t border-slate-100">
          <div className={`flex items-center gap-3 bg-slate-900 text-white p-3 rounded-lg shadow-sm ${isCollapsed ? "justify-center px-1" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold leading-none select-none text-white shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left overflow-hidden">
                <span className="text-sm font-semibold truncate leading-tight">{user.name}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">{roleLabels[user.role] || "Staff"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Log Out Actions */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={onLogout}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-red-600 transition-colors ${isCollapsed ? "justify-center px-1" : ""}`}
            title={isCollapsed ? "Sign Out Session" : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Sign Out Session</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar backdrop screen mask */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
        />
      )}
    </>
  );
}
