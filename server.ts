import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { UAParser } from "ua-parser-js";
import { dbService } from "./server/db-service";
import { supabaseService } from "./server/supabase-service";
import { PaymentLog, Sale, UserSession, getWeightInKg } from "./src/types";

// Start Express server
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Initialize Supabase dynamic sync on backend start if configuration keys exist
  if (supabaseService.isConfigured()) {
    // Run bootstrapping in background to avoid blocking server listener
    (async () => {
      try {
        const isSchemaVerified = await supabaseService.verifyAndInitializeSchema();
        if (isSchemaVerified) {
          await supabaseService.pullAllData();
          supabaseService.subscribeToRealtimeChanges();
        }
      } catch (err: any) {
        console.error("Failed to run Supabase bootstrap/sync on startup:", err.message || err);
      }
    })();
  } else {
    console.log("ℹ️ Supabase environment variables not set. Running completely offline (local disk db) with default demo accounts active.");
  }

  // --- API Authentication Helpers ---
  const authenticateUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header. Please log in." });
    }
    const token = authHeader.split(" ")[1];
    
    let userId: string;
    let sessionId: string | undefined;

    if (token.includes(":")) {
      const parts = token.split(":");
      userId = parts[0];
      sessionId = parts[1];
    } else {
      userId = token;
    }

    const user = dbService.getUserById(userId);
    if (!user) {
      return res.status(401).json({ error: "Active profile not found. Please log in again." });
    }

    if (sessionId) {
      dbService.updateSessionActivity(sessionId);
      (req as any).sessionId = sessionId;
    }

    // Attach user information to request
    (req as any).user = user;

    // Enforce read-only restriction for viewer role
    if (user.role === "viewer" && req.method !== "GET") {
      return res.status(403).json({ error: "Access Denied: Viewer role is restricted to read-only access. You cannot make any modifications." });
    }

    next();
  };

  const getShopContextId = (req: express.Request): string => {
    const user = (req as any).user;
    if (!user || !user.shopId) {
      throw new Error("No active shop tenant found for user workspace context.");
    }
    return user.shopId;
  };

  const isManualCustomerPayment = (p: PaymentLog): boolean => {
    if (!p.note) return true;
    const lowNote = p.note.toLowerCase();
    return !(
      lowNote.includes("invoice") ||
      lowNote.includes("sale") ||
      lowNote.includes("paid on cash") ||
      lowNote.includes("partial paid") ||
      lowNote.includes("partial payment")
    );
  };

  // ==========================================
  // 1. AUTHENTICATION SERVICE ENDPOINTS
  // ==========================================

  app.post("/api/auth/signup", (req, res) => {
    const { name, email, phone, password, shopName } = req.body;
    if (!name || !email || !phone || !password || !shopName) {
      return res.status(400).json({ error: "Please fill out all onboarding registration details." });
    }

    const existingUser = dbService.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "This email is already registered with another Flour shop." });
    }

    try {
      const authSession = dbService.registerTenant({
        name,
        email,
        phone,
        password,
        shopName,
        role: "owner"
      });

      const ua = req.headers['user-agent'] || '';
      const parser = new UAParser(ua);
      const result = parser.getResult();
      
      const sessionRecord: UserSession = {
        id: `sess_${Math.random().toString(36).substr(2, 9)}`,
        userId: authSession.user.id,
        deviceName: `${result.device.vendor || ''} ${result.device.model || result.os.name || 'Unknown Device'}`.trim(),
        browser: `${result.browser.name || 'Unknown Browser'} ${result.browser.version || ''}`.trim(),
        os: `${result.os.name || 'Unknown OS'} ${result.os.version || ''}`.trim(),
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        userAgent: ua,
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      dbService.createSession(sessionRecord);

      res.json({
        ...authSession,
        token: `${authSession.user.id}:${sessionRecord.id}`
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to establish new business workspace." });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = dbService.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "Invalid login credentials. Flour user profile not found." });
    }

    // If password exists, require exact match. Otherwise, any password completes login for demo speed.
    if (user.password && user.password !== password) {
      return res.status(400).json({ error: "Incorrect password. Confirm your credentials or reset your password." });
    }

    const shop = user.shopId ? dbService.getShopById(user.shopId) : null;
    const settings = user.shopId ? dbService.getShopSettings(user.shopId) : null;

    const ua = req.headers['user-agent'] || '';
    const parser = new UAParser(ua);
    const result = parser.getResult();
    
    const sessionRecord: UserSession = {
      id: `sess_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      deviceName: `${result.device.vendor || ''} ${result.device.model || result.os.name || 'Unknown Device'}`.trim(),
      browser: `${result.browser.name || 'Unknown Browser'} ${result.browser.version || ''}`.trim(),
      os: `${result.os.name || 'Unknown OS'} ${result.os.version || ''}`.trim(),
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
      userAgent: ua,
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    dbService.createSession(sessionRecord);

    res.json({
      user,
      shop,
      settings,
      token: `${user.id}:${sessionRecord.id}`
    });
  });

  app.get("/api/auth/sessions", authenticateUser, (req, res) => {
    const user = (req as any).user;
    const currentSessionId = (req as any).sessionId;
    let sessions = dbService.getSessionsByUserId(user.id);
    
    // If sessions is missing or empty, try to create a pseudo session for display
    if (!sessions || sessions.length === 0) {
      const ua = req.headers['user-agent'] || '';
      const parser = new UAParser(ua);
      const result = parser.getResult();
      const fakeSession: UserSession = {
        id: `sess_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        deviceName: `${result.device.vendor || ''} ${result.device.model || result.os.name || 'Unknown Device'}`.trim(),
        browser: `${result.browser.name || 'Unknown Browser'} ${result.browser.version || ''}`.trim(),
        os: `${result.os.name || 'Unknown OS'} ${result.os.version || ''}`.trim(),
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        userAgent: ua,
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      dbService.createSession(fakeSession);
      sessions = [fakeSession];
      // Note: we can't update user token cleanly here, but we can at least show a session
      // To correctly map isCurrent, we force it.
      (req as any).sessionId = fakeSession.id;
    }

    const matchedSessionId = (req as any).sessionId;

    const mappedSessions = sessions.map(s => ({
      ...s,
      isCurrent: s.id === matchedSessionId
    }));
    
    // Fallback: If for some reason none is marked current, mark the most recently active one
    if (!mappedSessions.some(s => s.isCurrent) && mappedSessions.length > 0) {
      const sorted = [...mappedSessions].sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
      const latestId = sorted[0].id;
      mappedSessions.forEach(s => {
        if (s.id === latestId) s.isCurrent = true;
      });
    }

    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    const activeRecentSessions = mappedSessions.filter(s => s.isCurrent || new Date(s.lastActive || s.createdAt).getTime() >= sixHoursAgo);

    res.json(activeRecentSessions);
  });

  app.delete("/api/auth/sessions/:id", authenticateUser, (req, res) => {
    const sessionId = req.params.id;
    const user = (req as any).user;
    const sessions = dbService.getSessionsByUserId(user.id);
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      return res.status(404).json({ error: "Session profile not found or access restricted." });
    }

    dbService.deleteSession(sessionId);
    res.json({ success: true });
  });

  app.delete("/api/auth/sessions", authenticateUser, (req, res) => {
    const user = (req as any).user;
    const currentSessionId = (req as any).sessionId;
    dbService.deleteUserSessionsExcept(user.id, currentSessionId || "");
    res.json({ success: true });
  });

  app.post("/api/auth/forgot-password", (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }

    const user = dbService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "No registered Flour mill workspace found with this email." });
    }

    // Generate a 6-digit numeric reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    // Save to user object
    user.resetCode = resetCode;
    user.resetExpires = expiry;
    dbService.save("users");

    console.log(`🔑 PASSWORD RESET: Seed code is [${resetCode}] for user [${email}]`);
    res.json({
      success: true,
      message: "Security verification code generated.",
      debugCode: resetCode // Highly testable and works instantly inside the preview sandbox!
    });
  });

  app.post("/api/auth/reset-password", (req, res) => {
    const { email, resetCode, newPassword } = req.body;
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ error: "Email, reset code, and new password are required." });
    }

    const user = dbService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }

    if (!user.resetCode || user.resetCode !== resetCode) {
      return res.status(400).json({ error: "Invalid verification code." });
    }

    const expiryTime = user.resetExpires ? new Date(user.resetExpires).getTime() : 0;
    if (Date.now() > expiryTime) {
      return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
    }

    // Update password
    user.password = newPassword;
    delete user.resetCode;
    delete user.resetExpires;
    dbService.save("users");

    res.json({
      success: true,
      message: "Password updated successfully. You can now login with your new credentials."
    });
  });

  app.get("/api/auth/me", authenticateUser, (req, res) => {
    const user = (req as any).user;
    const shop = user.shopId ? dbService.getShopById(user.shopId) : null;
    const settings = user.shopId ? dbService.getShopSettings(user.shopId) : null;
    res.json({
      user,
      shop,
      settings
    });
  });

  // ==========================================
  // 2. SUPER PLATFORM ADMIN ENDPOINTS
  // ==========================================

  app.get("/api/admin/overview", authenticateUser, (req, res) => {
    const user = (req as any).user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Access denied. Platform Admin privileges required." });
    }

    const db = dbService.getRawDB();
    const activeShopsCount = db.shops.filter(s => s.status === "active").length;
    const totalSalesVolume = db.sales.reduce((sum, item) => sum + item.total, 0);

    // Dynamic calculated Monthly SaaS Revenue model
    // Basic $15 PKR conversion calculation
    const monthlySaaSRecurring = db.shops.reduce((sum, s) => {
      const rate = s.subscription === "premium" ? 5000 : s.subscription === "enterprise" ? 15000 : 0;
      return sum + (s.status === "active" ? rate : 0);
    }, 0);

    res.json({
      totalShops: db.shops.length,
      activeShops: activeShopsCount,
      totalUsers: db.users.length,
      platformRevenue: monthlySaaSRecurring,
      salesTransactionsVolume: totalSalesVolume,
      shops: db.shops,
      users: db.users
    });
  });

  app.post("/api/admin/toggle-shop", authenticateUser, (req, res) => {
    const user = (req as any).user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Access denied." });
    }

    const { shopId, status } = req.body;
    const shop = dbService.getShopById(shopId);
    if (!shop) {
      return res.status(404).json({ error: "Specified Grain shop not located." });
    }

    shop.status = status;
    dbService.updateRow("shops", shop);
    res.json({ success: true, shop });
  });

  app.post("/api/admin/db-reset", authenticateUser, (req, res) => {
    const user = (req as any).user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Access denied." });
    }
    dbService.resetToDefaults();
    res.json({ success: true, message: "Database re-seeded successfully." });
  });

  app.get("/api/admin/db-raw", authenticateUser, (req, res) => {
    const user = (req as any).user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Access denied." });
    }
    res.json(dbService.getRawDB());
  });

  app.post("/api/admin/change-password", authenticateUser, (req, res) => {
    const user = (req as any).user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Access denied." });
    }

    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ error: "User ID and new password are required." });
    }

    const targetUser = dbService.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    targetUser.password = newPassword;
    dbService.updateRow("users", targetUser);

    res.json({ success: true, message: "User password updated successfully." });
  });

  app.post("/api/admin/update-user", authenticateUser, (req, res) => {
    const user = (req as any).user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Access denied." });
    }

    const { userId, password, role, shopId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    const targetUser = dbService.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    if (password !== undefined) {
      targetUser.password = password;
    }
    if (role !== undefined) {
      targetUser.role = role;
    }
    if (shopId !== undefined) {
      targetUser.shopId = (shopId === "" || shopId === null || shopId === "null" || shopId === "Global Admin") ? null : shopId;
    }

    dbService.updateRow("users", targetUser);
    res.json({ success: true, message: "User profile updated successfully." });
  });

  app.post("/api/admin/create-shop", authenticateUser, (req, res) => {
    const user = (req as any).user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Access denied." });
    }

    const { name, phone, email, subscription } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Shop name is required." });
    }

    const shopId = "shp_" + Math.random().toString(36).substring(2, 11);
    const newShop = {
      id: shopId,
      name,
      status: "active" as const,
      subscription: (subscription || "trial") as any,
      ownerId: "",
      createdAt: new Date().toISOString(),
      phone: phone || "",
      email: email || ""
    };

    dbService.updateRow("shops", newShop);

    // Seed defaults settings for this shop
    const newSettings = {
      shopId: shopId,
      currency: "PKR",
      language: "en",
      lowStockAlertThreshold: 50,
      taxPercentage: 0
    };
    dbService.updateRow("settings", newSettings);

    res.json({ success: true, message: "Shop created successfully.", shop: newShop });
  });

  app.post("/api/admin/delete-shop", authenticateUser, (req, res) => {
    const user = (req as any).user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Access denied." });
    }

    const { shopId } = req.body;
    if (!shopId) {
      return res.status(400).json({ error: "Shop ID is required." });
    }

    const success = dbService.deleteRow("shops", shopId);
    if (!success) {
      return res.status(404).json({ error: "Shop not found." });
    }

    res.json({ success: true, message: "Shop deleted successfully." });
  });

  app.post("/api/admin/create-user", authenticateUser, (req, res) => {
    const user = (req as any).user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Access denied." });
    }

    const { name, email, phone, password, role, shopId } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Name, email, password and security role are required." });
    }

    const existingUser = dbService.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists." });
    }

    const userId = "usr_" + Math.random().toString(36).substring(2, 11);
    const newUser = {
      id: userId,
      name,
      email,
      phone: phone || "",
      role: role as any,
      shopId: (shopId === "null" || !shopId) ? null : shopId,
      createdAt: new Date().toISOString(),
      password
    };

    dbService.updateRow("users", newUser);

    // Link owner to the shop if appropriate
    if (newUser.role === "owner" && newUser.shopId) {
      const shop = dbService.getShopById(newUser.shopId);
      if (shop) {
        shop.ownerId = newUser.id;
        dbService.updateRow("shops", shop);
      }
    }

    res.json({ success: true, message: "User account created successfully.", user: newUser });
  });

  app.post("/api/admin/delete-user", authenticateUser, (req, res) => {
    const user = (req as any).user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Access denied." });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    if (userId === user.id) {
      return res.status(400).json({ error: "You cannot delete your own logged-in session." });
    }

    const success = dbService.deleteRow("users", userId);
    if (!success) {
      return res.status(404).json({ error: "User account not found." });
    }

    res.json({ success: true, message: "User account deleted successfully." });
  });

  // ==========================================
  // 3. TENANT SHOP OWNER DASHBOARD INSIGHTS
  // ==========================================

  // Consolidated sync endpoint to fetch all related shop data in one round-trip
  app.get("/api/tenant/sync", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const syncData = dbService.getSyncState(shopId);
      res.json(syncData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tenant/dashboard", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      
      const sales = dbService.getDataByShop("sales", shopId) as Sale[];
      const expenses = dbService.getDataByShop("expenses", shopId);
      const products = dbService.getDataByShop("products", shopId);
      const customers = dbService.getDataByShop("customers", shopId);
      const suppliers = dbService.getDataByShop("suppliers", shopId);
      const payments = dbService.getDataByShop("paymentLogs", shopId) as PaymentLog[];

      // Standard UTC to Pakistan Standard Time (PKT) converter (UTC+5)
      const getPKTDateString = (dateInput?: string | Date): string => {
        if (!dateInput) return "";
        try {
          const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
          if (isNaN(d.getTime())) return String(dateInput);
          
          return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Karachi',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(d);
        } catch (e) {
          return String(dateInput);
        }
      };

      const todayString = getPKTDateString(new Date());

      // 1. TODAY'S SALES & MARGINS
      const todaySalesList = sales.filter(s => getPKTDateString(s.createdAt) === todayString);
      const todaySales = todaySalesList.reduce((sum, s) => sum + s.total, 0);
      const todayCost = todaySalesList.reduce((sum, s) => sum + s.totalCost, 0);
      const todayProfit = todaySales - todayCost;

      // 2. CUMULATIVE CASH BALANCE CALCULATION (Historical)
      // Cash In: All cash received from sales + all cash payments from customers
      const allSalesCash = sales.reduce((sum, s) => s.paymentMethod === "Cash" ? sum + (s.amountPaid || 0) : sum, 0);
      const allCustomerPaymentsCash = payments.reduce((sum, p) => (p.partyType === "customer" && p.paymentMethod === "Cash") ? sum + p.amount : sum, 0);
      
      // Cash Out: All expenses + all cash payments to suppliers (Assume all expenses are cash)
      const allExpensesCash = expenses.reduce((sum, e) => sum + e.amount, 0);
      const allSupplierPaymentsCash = payments.reduce((sum, p) => (p.partyType === "supplier" && p.paymentMethod === "Cash") ? sum + p.amount : sum, 0);

      const startingCashFloat = 10000;
      const totalCashInHand = startingCashFloat + allSalesCash + allCustomerPaymentsCash - allExpensesCash - allSupplierPaymentsCash;

      // 3. OTHER METRICS
      const totalOutstandingCredits = customers.reduce((sum, c) => sum + c.creditBalance, 0);
      const totalExpensesAllTime = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalInventoryValuation = products.reduce((sum, p) => sum + (p.stockQuantity * p.costPrice), 0);
      const outstandingOwedToSuppliers = suppliers.reduce((sum, s) => sum + s.outstandingBalance, 0);

      // Charts generators - Past 7 Days Sales (Corrected logic)
      const salesChartData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i)); // Go from 6 days ago to today
        const dateStr = getPKTDateString(d);
        
        const daySales = sales.filter(s => getPKTDateString(s.createdAt) === dateStr);
        const revenue = daySales.reduce((sum, s) => sum + s.total, 0);
        const profit = daySales.reduce((sum, s) => sum + (s.total - s.totalCost), 0);
        const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
        
        return {
          date: dateStr,
          day: dayLabel,
          Sales: revenue,
          Profit: profit
        };
      });

      // Low Stock Products Alert Count
      const alertStockCount = products.filter(p => p.stockQuantity <= p.minStockAlert).length;

      res.json({
        metrics: {
          todaySales,
          cashInHand: totalCashInHand,
          creditSales: totalOutstandingCredits,
          totalExpenses: totalExpensesAllTime,
          dailyProfit: todayProfit,
          inventoryValue: totalInventoryValuation,
          pendingPayments: outstandingOwedToSuppliers
        },
        salesHistory: salesChartData,
        alertStockCount
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to load shop statistics metrics." });
    }
  });

  // ==========================================
  // 4. INVENTORY MANAGEMENT APIS
  // ==========================================

  app.get("/api/tenant/products", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const products = dbService.getDataByShop("products", shopId);
      res.json(products);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tenant/products", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const { id, name, sku, barcode, unit, costPrice, sellingPrice, stockQuantity, minStockAlert, category } = req.body;

      if (!name || !sku || !unit || costPrice === undefined || sellingPrice === undefined) {
        return res.status(400).json({ error: "Missing required fields for grain product classification." });
      }

      const pId = id || `prod_${Math.random().toString(36).substr(2, 9)}`;
      const isNew = !id;

      const updatedProduct = {
        id: pId,
        shopId,
        name,
        sku,
        barcode: barcode || "",
        unit,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        stockQuantity: Number(stockQuantity || 0),
        minStockAlert: Number(minStockAlert || 10),
        category: category || "Flour",
        createdAt: isNew ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString()
      };

      dbService.updateRow("products", updatedProduct);

      // Create an initial stocking audit log if brand new product is created with stock
      if (isNew && Number(stockQuantity) > 0) {
        dbService.updateRow("inventoryLogs", {
          id: `log_${Math.random().toString(36).substr(2, 9)}`,
          shopId,
          productId: pId,
          productName: name,
          type: "in",
          quantity: Number(stockQuantity),
          unit,
          note: "Stock level set during entry creation",
          createdBy: (req as any).user.id,
          createdAt: new Date().toISOString()
        });
      }

      res.json(updatedProduct);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/tenant/products/:id", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const productId = req.params.id;
      console.log(`[API] DELETE product request: ${productId} for shop: ${shopId}`);
      
      const product = dbService.getDataByShop("products", shopId).find(p => p.id === productId);
      
      if (!product) {
        console.warn(`[API] Product ${productId} not found in shop ${shopId} catalog.`);
        return res.status(404).json({ error: "Product not found or access denied." });
      }

      const deleted = dbService.deleteRow("products", productId);
      if (deleted) {
        console.log(`[API] Successfully deleted product ${productId}`);
        res.json({ success: true });
      } else {
        console.error(`[API] dbService.deleteRow returned false for product ${productId}`);
        res.status(500).json({ error: "Failed to delete from data store." });
      }
    } catch (e: any) {
      console.error("[API] DELETE product exception:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tenant/inventory/logs", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const logs = dbService.getDataByShop("inventoryLogs", shopId);
      // Sort in descending order (newest first)
      res.json(logs.reverse());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tenant/inventory/adjust", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const { productId, type, quantity, note } = req.body;

      if (!productId || !type || quantity === undefined) {
        return res.status(400).json({ error: "Complete adjustments params required." });
      }

      const result = dbService.adjustStock(
        shopId, 
        productId, 
        type, 
        Number(quantity), 
        note || "", 
        (req as any).user.id
      );

      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // 5. CUSTOMER LEDGER APIS
  // ==========================================

  app.get("/api/tenant/customers", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const customers = dbService.getDataByShop("customers", shopId);
      res.json(customers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tenant/customers", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const { id, name, phone, address, openingBalance } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ error: "Customer name and phone coordinates required." });
      }

      const cId = id || `cust_${Math.random().toString(36).substr(2, 9)}`;
      const isNew = !id;

      const customerObj = {
        id: cId,
        shopId,
        name,
        phone,
        address: address || "",
        openingBalance: Number(openingBalance || 0),
        creditBalance: isNew ? Number(openingBalance || 0) : undefined, // Keep as credit debt on opening
        createdAt: isNew ? new Date().toISOString() : undefined
      };

      dbService.updateRow("customers", customerObj);
      res.json(customerObj);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tenant/customers/:id/ledger", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const customerId = req.params.id;

      const customer = (dbService.getDataByShop("customers", shopId) as any[]).find(c => c.id === customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not registered." });
      }

      // Fetch sales and credit payments related to customer
      const sales = (dbService.getDataByShop("sales", shopId) as Sale[]).filter(s => s.customerId === customerId);
      const payments = (dbService.getDataByShop("paymentLogs", shopId) as PaymentLog[]).filter(p => p.partyId === customerId && p.partyType === "customer");

      // Merge into a cohesive ledger statement chronologically
      const ledgerEntries: any[] = [];

      // Add Opening Balance statement
      if (customer.openingBalance > 0) {
        ledgerEntries.push({
          id: "opening",
          type: "Opening Balance",
          reference: "Ledger Setup",
          debit: customer.openingBalance, // Credit debt we receive
          credit: 0,
          balance: customer.openingBalance,
          date: customer.createdAt,
          note: "Opening customer debit account registration balance"
        });
      }

      // Intersect sales
      sales.forEach(sale => {
        // Debit increases the owner credit to receive
        const saleTotal = sale.total;
        const paidAmount = sale.amountPaid;
        const outstandingAmount = saleTotal - paidAmount;

        ledgerEntries.push({
          id: sale.id,
          type: "Sale Invoice",
          reference: sale.invoiceNumber,
          debit: saleTotal, // invoice grand total
          credit: paidAmount, // paid amount during sale
          balance_effect: outstandingAmount,
          date: sale.createdAt,
          note: `Products purchased: ${sale.items.map(i => `${i.productName} (${i.quantity} ${i.unit})`).join(", ")}`
        });
      });

      // Intersect independent standard ledger cash entries
      payments.forEach(pay => {
        ledgerEntries.push({
          id: pay.id,
          type: "Cash Payment Received",
          reference: "Receipt",
          debit: 0,
          credit: pay.amount,
          balance_effect: -pay.amount,
          date: pay.createdAt,
          note: pay.note || `Paid via ${pay.paymentMethod}`
        });
      });

      // Sort chronological
      ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Running Balance compilation
      let currentBalance = customer.openingBalance;
      const computedLedger = ledgerEntries.map(entry => {
        if (entry.id !== "opening") {
          currentBalance = currentBalance + entry.debit - entry.credit;
        }
        return {
          ...entry,
          runningBalance: currentBalance
        };
      });

      res.json({
        customer,
        ledger: computedLedger.reverse() // Display newest actions on top
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tenant/customers/receive-payment", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const { customerId, amount, paymentMethod, note } = req.body;

      if (!customerId || !amount || !paymentMethod) {
        return res.status(400).json({ error: "Customer ID, valid numerical receipt amount, and method are requisite." });
      }

      const updatedCustomerObj = dbService.receiveCustomerPayment(customerId, Number(amount), paymentMethod, note, shopId);
      res.json(updatedCustomerObj);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/tenant/customers/:id", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const customerId = req.params.id;

      const customers = dbService.getDataByShop("customers", shopId);
      const customerExists = customers.some(c => c.id === customerId);
      if (!customerExists) {
        return res.status(404).json({ error: "Customer not registered in this shop registry." });
      }

      dbService.deleteRow("customers", customerId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // 6. SUPPLIER & EXPENSE MODULE APIS
  // ==========================================

  app.get("/api/tenant/suppliers", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      res.json(dbService.getDataByShop("suppliers", shopId));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tenant/suppliers", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const { id, name, phone, companyName, outstandingBalance } = req.body;

      if (!name || !phone || !companyName) {
        return res.status(400).json({ error: "Please enter supplier details." });
      }

      const supplierObj = {
        id: id || `supp_${Math.random().toString(36).substr(2, 9)}`,
        shopId,
        name,
        phone,
        companyName,
        outstandingBalance: Number(outstandingBalance || 0),
        createdAt: id ? undefined : new Date().toISOString()
      };

      dbService.updateRow("suppliers", supplierObj);
      res.json(supplierObj);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tenant/suppliers/pay", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const { supplierId, amount, paymentMethod, note } = req.body;

      if (!supplierId || !amount || !paymentMethod) {
        return res.status(400).json({ error: "Complete outstanding billing params are required." });
      }

      const updatedSupplier = dbService.paySupplier(supplierId, Number(amount), paymentMethod, note, shopId);
      res.json(updatedSupplier);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Price Quotes API
  app.get("/api/tenant/quotes", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const quotes = dbService.getDataByShop("priceQuotes", shopId);
      res.json(quotes);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tenant/quotes", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const { id, supplierId, supplierName, grainType, pricePerMaund, pricePerKg, quoteDate, note } = req.body;

      if (!supplierId || !grainType || !pricePerMaund || !quoteDate) {
        return res.status(400).json({ error: "Missing required parameters for grain price quote." });
      }

      const quoteObj = {
        id: id || `q_${Math.random().toString(36).substr(2, 9)}`,
        shopId,
        supplierId,
        supplierName,
        grainType,
        pricePerMaund: Number(pricePerMaund),
        pricePerKg: Number(pricePerKg || (pricePerMaund / 40).toFixed(2)),
        quoteDate,
        note: note || "",
        createdAt: id ? undefined : new Date().toISOString()
      };

      dbService.updateRow("priceQuotes", quoteObj);
      res.json(quoteObj);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/tenant/quotes/:id", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const deleted = dbService.deleteRow("priceQuotes", req.params.id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Price quote row not found." });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Expenses CRUD
  app.get("/api/tenant/expenses", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      res.json(dbService.getDataByShop("expenses", shopId).reverse());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tenant/expenses", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const { id, category, amount, description, date } = req.body;

      if (!category || !amount || !date) {
        return res.status(400).json({ error: "Category, amount and expense billing date required." });
      }

      const expObj = {
        id: id || `exp_${Math.random().toString(36).substr(2, 9)}`,
        shopId,
        category,
        amount: Number(amount),
        description: description || "",
        date,
        createdAt: id ? undefined : new Date().toISOString()
      };

      dbService.updateRow("expenses", expObj);
      res.json(expObj);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/tenant/expenses/:id", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const deleted = dbService.deleteRow("expenses", req.params.id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Expense row not found." });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // 7. SALES POINT OF SALE (POS) SYSTEM
  // ==========================================

  app.get("/api/tenant/sales", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      res.json(dbService.getDataByShop("sales", shopId).reverse());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tenant/sales", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const { customerId, customerName, items, discount, tax, subtotal, total, totalCost, paymentMethod, saleType, status, amountPaid } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ error: "Cannot print an empty invoice. POS basket is empty." });
      }

      const completedSale = dbService.createSale({
        shopId,
        customerId,
        customerName: customerName || "Walk-in Customer",
        items,
        discount: Number(discount || 0),
        tax: Number(tax || 0),
        subtotal: Number(subtotal),
        total: Number(total),
        totalCost: Number(totalCost || 0),
        paymentMethod,
        saleType,
        status: status || "paid",
        amountPaid: amountPaid !== undefined && amountPaid !== null ? Number(amountPaid) : Number(total)
      }, (req as any).user.id, shopId);

      res.json(completedSale);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // 8. NOTIFICATION & SETTINGS APIS
  // ==========================================

  app.get("/api/tenant/notifications", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const notifs = dbService.getDataByShop("notifications", shopId);
      res.json(notifs.reverse());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tenant/notifications/read", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const { notificationId } = req.body;

      const notifs = dbService.getDataByShop("notifications", shopId);
      if (notificationId) {
        const not = notifs.find(n => n.id === notificationId);
        if (not) {
          not.read = true;
          dbService.updateRow("notifications", not);
        }
      } else {
        // Mark all as read
        notifs.forEach(n => {
          n.read = true;
          dbService.updateRow("notifications", n);
        });
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/tenant/settings", authenticateUser, (req, res) => {
    try {
      const shopId = getShopContextId(req);
      const { currency, language, taxRate, invoicePrefix, allowedFlourPrices, theme } = req.body;

      const settings = dbService.getShopSettings(shopId);
      if (!settings) {
        return res.status(404).json({ error: "Settings segment missing." });
      }

      const updatedSettings = {
        ...settings,
        currency: currency || settings.currency,
        language: language || settings.language,
        taxRate: taxRate !== undefined ? Number(taxRate) : settings.taxRate,
        invoicePrefix: invoicePrefix || settings.invoicePrefix,
        allowedFlourPrices: allowedFlourPrices || settings.allowedFlourPrices,
        theme: theme || (settings as any).theme || "blue"
      };

      dbService.updateRow("settings", updatedSettings);
      res.json(updatedSettings);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // SERVER STATIC PATHS & VITE INTEGRATION
  // ==========================================

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production builds
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Chakki SaaS Server is online at http://localhost:${PORT}`);
  });
}

startServer();
