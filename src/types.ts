/**
 * Shared Type Definitions for Atta Chakki / Grain Business SaaS
 */

export type UserRole = "super_admin" | "owner" | "manager" | "cashier" | "viewer" | "operator";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  shopId: string | null;
  createdAt: string;
  password?: string;
  resetCode?: string;
  resetExpires?: string;
}

export interface Shop {
  id: string;
  name: string;
  status: "active" | "inactive";
  subscription: "trial" | "premium" | "enterprise";
  ownerId: string;
  createdAt: string;
  ntnGst?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  sku: string;
  barcode?: string;
  unit: "KG" | "Bag" | "Maund" | "Ton" | "bag of 10 kg" | "bag of 15 kg" | "bag of 20 kg" | "bag of 80 kg";
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLog {
  id: string;
  shopId: string;
  productId: string;
  productName: string;
  type: "in" | "out" | "adjustment" | "wastage";
  quantity: number;
  unit: string;
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  address?: string;
  openingBalance: number;
  creditBalance: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  companyName: string;
  outstandingBalance: number; // Positive means we owe supplier
  createdAt: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  cost: number;
  total: number;
}

export interface Sale {
  id: string;
  shopId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  items: SaleItem[];
  discount: number;
  tax: number;
  subtotal: number;
  total: number;
  totalCost: number;
  paymentMethod: "Cash" | "Bank" | "JazzCash" | "EasyPaisa";
  saleType: "Cash" | "Credit" | "Wholesale";
  status: "paid" | "unpaid" | "partial";
  amountPaid: number;
  createdBy: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  shopId: string;
  category: "Electricity" | "Transport" | "Labor" | "Rent" | "Packaging" | "Maintenance" | "Other";
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

export interface PaymentLog {
  id: string;
  shopId: string;
  partyType: "customer" | "supplier";
  partyId: string;
  partyName: string;
  amount: number;
  paymentMethod: "Cash" | "Bank" | "JazzCash" | "EasyPaisa";
  note?: string;
  date: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  shopId: string | null; // null for platform-wide/super-admin notifications
  type: "low_stock" | "pending_payment" | "credit_reminder" | "failed_transaction" | "system";
  message: string;
  read: boolean;
  createdAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
  lastActive: string;
  createdAt: string;
  userAgent: string;
  isCurrent?: boolean;
}

export interface ShopSettings {
  shopId: string;
  currency: string;
  language: string;
  taxRate: number;
  invoicePrefix: string;
  invoiceCounter: number;
  allowedFlourPrices: { [productName: string]: number };
}

export interface PriceQuote {
  id: string;
  shopId: string;
  supplierId: string;
  supplierName: string;
  grainType: string;
  pricePerMaund: number;
  pricePerKg?: number;
  quoteDate: string;
  note?: string;
  createdAt: string;
}

// Complete Session payload
export interface Session {
  user: User;
  shop: Shop | null;
  settings: ShopSettings | null;
  token?: string;
}

export function safeFormatDate(dateStr: any, fallbackStr: string = "N/A"): string {
  if (!dateStr) return fallbackStr;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return String(dateStr);
  }
}

export function safeFormatDateTime(dateStr: any, fallbackStr: string = "N/A"): string {
  if (!dateStr) return fallbackStr;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return String(dateStr);
  }
}

export function getWeightInKg(unit: string): number {
  if (!unit) return 1;
  const lower = unit.toLowerCase();
  if (lower === "kg") return 1;
  if (lower === "maund") return 40;
  if (lower === "ton") return 1000;
  if (lower === "bag") return 50; // defaults to 50kg for standard Bag
  
  // Regex to extract kilograms from "bag of X kg" or "bag of Xkg"
  const match = lower.match(/bag\s+of\s+(\d+)\s*kg/);
  if (match) {
    return parseFloat(match[1]);
  }
  return 1;
}
