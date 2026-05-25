/**
 * Atta Chakki CRM/ERP API Client
 */

const getAuthToken = (): string | null => {
  return localStorage.getItem("chakki_auth_token");
};

export const setAuthToken = (token: string) => {
  localStorage.setItem("chakki_auth_token", token);
};

export const clearAuthToken = () => {
  localStorage.removeItem("chakki_auth_token");
};

async function request(path: string, options: RequestInit = {}, retries = 3) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(path, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed with code ${response.status}`);
      } else {
        const text = await response.text();
        if (text.trim().startsWith("<!doctype html>") || text.trim().startsWith("<html")) {
          throw new Error(`Server returned HTML instead of JSON (Status ${response.status}). This usually means a routing or session error.`);
        }
        throw new Error(`API request failed with code ${response.status}: ${text.slice(0, 100)}`);
      }
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    } else {
      const text = await response.text();
      if (text.trim().startsWith("<!doctype html>") || text.trim().startsWith("<html")) {
        throw new Error("Server returned HTML instead of JSON. The requested route might be missing or restricted.");
      }
      return text;
    }
  } catch (err: any) {
    if (retries > 0 && (err.message === "Failed to fetch" || err.message.toLowerCase().includes("failed to fetch") || err.message.toLowerCase().includes("network error"))) {
      // Wait a bit and retry (exponential backoff approach)
      const delay = (4 - retries) * 1200;
      await new Promise(resolve => setTimeout(resolve, delay));
      return request(path, options, retries - 1);
    }
    throw err;
  }
}

export const api = {
  // Authentication
  auth: {
    signup: (data: any) => request("/api/auth/signup", { method: "POST", body: JSON.stringify(data) }),
    login: (data: any) => request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
    me: () => request("/api/auth/me"),
    forgotPassword: (email: string) => request("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (data: any) => request("/api/auth/reset-password", { method: "POST", body: JSON.stringify(data) }),
    getSessions: () => request("/api/auth/sessions"),
    terminateSession: (sessionId: string) => request(`/api/auth/sessions/${sessionId}`, { method: "DELETE" }),
    terminateAllOtherSessions: () => request("/api/auth/sessions", { method: "DELETE" }),
  },

  // Super Platform Admin
  admin: {
    getOverview: () => request("/api/admin/overview"),
    toggleShop: (shopId: string, status: "active" | "inactive") =>
      request("/api/admin/toggle-shop", { method: "POST", body: JSON.stringify({ shopId, status }) }),
    resetDatabase: () => request("/api/admin/db-reset", { method: "POST" }),
    dbRaw: () => request("/api/admin/db-raw"),
    changePassword: (userId: string, newPassword: string) =>
      request("/api/admin/change-password", { method: "POST", body: JSON.stringify({ userId, newPassword }) }),
    updateUserProfile: (userId: string, data: { password?: string; role?: string; shopId?: string | null }) =>
      request("/api/admin/update-user", { method: "POST", body: JSON.stringify({ userId, ...data }) }),
    createShop: (data: { name: string; phone?: string; email?: string; subscription?: string }) =>
      request("/api/admin/create-shop", { method: "POST", body: JSON.stringify(data) }),
    deleteShop: (shopId: string) =>
      request("/api/admin/delete-shop", { method: "POST", body: JSON.stringify({ shopId }) }),
    createUser: (data: { name: string; email: string; phone?: string; password?: string; role: string; shopId?: string | null }) =>
      request("/api/admin/create-user", { method: "POST", body: JSON.stringify(data) }),
    deleteUser: (userId: string) =>
      request("/api/admin/delete-user", { method: "POST", body: JSON.stringify({ userId }) }),
  },

  // Tenants Office CRM/POS modules
  tenant: {
    getDashboard: () => request("/api/tenant/dashboard"),
    
    // Products setup
    getProducts: () => request("/api/tenant/products"),
    saveProduct: (data: any) => request("/api/tenant/products", { method: "POST", body: JSON.stringify(data) }),
    deleteProduct: (id: string) => request(`/api/tenant/products/${id}`, { method: "DELETE" }),
    
    // Low stock / Stock tracking
    getInventoryLogs: () => request("/api/tenant/inventory/logs"),
    adjustInventory: (data: { productId: string; type: "in" | "out" | "adjustment" | "wastage"; quantity: number; note?: string }) =>
      request("/api/tenant/inventory/adjust", { method: "POST", body: JSON.stringify(data) }),
    
    // Customer records & credit books (Hata Book)
    getCustomers: () => request("/api/tenant/customers"),
    saveCustomer: (data: any) => request("/api/tenant/customers", { method: "POST", body: JSON.stringify(data) }),
    deleteCustomer: (id: string) => request(`/api/tenant/customers/${id}`, { method: "DELETE" }),
    getCustomerLedger: (id: string) => request(`/api/tenant/customers/${id}/ledger`),
    receiveCustomerPayment: (data: { customerId: string; amount: number; paymentMethod: string; note?: string }) =>
      request("/api/tenant/customers/receive-payment", { method: "POST", body: JSON.stringify(data) }),
    
    // Suppliers ledger
    getSuppliers: () => request("/api/tenant/suppliers"),
    saveSupplier: (data: any) => request("/api/tenant/suppliers", { method: "POST", body: JSON.stringify(data) }),
    paySupplier: (data: { supplierId: string; amount: number; paymentMethod: string; note?: string }) =>
      request("/api/tenant/suppliers/pay", { method: "POST", body: JSON.stringify(data) }),
    getQuotes: () => request("/api/tenant/quotes"),
    saveQuote: (data: any) => request("/api/tenant/quotes", { method: "POST", body: JSON.stringify(data) }),
    deleteQuote: (id: string) => request(`/api/tenant/quotes/${id}`, { method: "DELETE" }),

    // Expenses records
    getExpenses: () => request("/api/tenant/expenses"),
    saveExpense: (data: any) => request("/api/tenant/expenses", { method: "POST", body: JSON.stringify(data) }),
    deleteExpense: (id: string) => request(`/api/tenant/expenses/${id}`, { method: "DELETE" }),

    // Sales transactions
    getSales: () => request("/api/tenant/sales"),
    checkoutSale: (data: any) => request("/api/tenant/sales", { method: "POST", body: JSON.stringify(data) }),

    // System profile settings
    saveSettings: (data: any) => request("/api/tenant/settings", { method: "PUT", body: JSON.stringify(data) }),

    // Consolidated sync
    syncWorkspace: () => request("/api/tenant/sync"),

    // Alarm notifications
    getNotifications: () => request("/api/tenant/notifications"),
    markNotificationsRead: (notificationId?: string) =>
      request("/api/tenant/notifications/read", { method: "POST", body: JSON.stringify({ notificationId }) }),
  },
};
export default api;
