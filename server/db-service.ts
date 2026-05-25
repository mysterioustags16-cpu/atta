import fs from "fs";
import path from "path";
import { 
  User, Shop, Product, InventoryLog, Customer, Supplier, Sale, Expense, PaymentLog, Notification, ShopSettings, getWeightInKg, UserSession, PriceQuote
} from "../src/types";

interface DBStructure {
  users: User[];
  shops: Shop[];
  products: Product[];
  inventoryLogs: InventoryLog[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  expenses: Expense[];
  paymentLogs: PaymentLog[];
  notifications: Notification[];
  settings: ShopSettings[];
  userSessions: UserSession[];
  priceQuotes: PriceQuote[];
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Default Data Set
const getInitialDB = (): DBStructure => {
  const adminId = "usr_admin_1";
  const ownerId = "usr_owner_1";
  const managerId = "usr_manager_1";
  const shopId = "shp_demo_1";

  const defaultUsers: User[] = [
    {
      id: adminId,
      name: "Super Admin",
      email: "ac.repair.in.dubai3@gmail.com",
      phone: "+92 300 0000000",
      role: "super_admin",
      shopId: null,
      createdAt: new Date().toISOString()
    },
    {
      id: ownerId,
      name: "Chaudhary Nabeel",
      email: "owner@chakki.com",
      phone: "+92 300 1234567",
      role: "owner",
      shopId: shopId,
      createdAt: new Date().toISOString()
    },
    {
      id: managerId,
      name: "Amjad Ali",
      email: "manager@chakki.com",
      phone: "+92 321 7654321",
      role: "manager",
      shopId: shopId,
      createdAt: new Date().toISOString()
    }
  ];

  const defaultShops: Shop[] = [
    {
      id: shopId,
      name: "Pak Grain Chakki",
      status: "active",
      subscription: "premium",
      ownerId: ownerId,
      createdAt: new Date().toISOString(),
      ntnGst: "GST-443210-9",
      address: "Chakki Stop, Main Baazar, Lahore",
      phone: "+92 300 1234567",
      email: "owner@chakki.com"
    }
  ];

  const defaultProducts: Product[] = [
    {
      id: "prod_1",
      shopId: shopId,
      name: "Premium Chakki Atta",
      sku: "FL-CK-01",
      barcode: "890001",
      unit: "KG",
      costPrice: 65,
      sellingPrice: 80,
      stockQuantity: 1250,
      minStockAlert: 150,
      category: "Flour",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "prod_2",
      shopId: shopId,
      name: "Fine Maida",
      sku: "FL-MD-02",
      unit: "KG",
      costPrice: 80,
      sellingPrice: 105,
      stockQuantity: 420,
      minStockAlert: 100,
      category: "Flour",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "prod_3",
      shopId: shopId,
      name: "Suji (Semolina)",
      sku: "FL-SJ-03",
      unit: "KG",
      costPrice: 85,
      sellingPrice: 110,
      stockQuantity: 180,
      minStockAlert: 50,
      category: "Flour",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "prod_4",
      shopId: shopId,
      name: "Bran (Wheat Chokar)",
      sku: "FD-CH-04",
      unit: "KG",
      costPrice: 40,
      sellingPrice: 55,
      stockQuantity: 80, // Trigger low stock alert!
      minStockAlert: 100,
      category: "Feed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "prod_5",
      shopId: shopId,
      name: "Organic Wheat Bags",
      sku: "GR-WT-05",
      unit: "Bag",
      costPrice: 2600,
      sellingPrice: 3100,
      stockQuantity: 35,
      minStockAlert: 10,
      category: "Grain",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const defaultInventoryLogs: InventoryLog[] = defaultProducts.map(p => ({
    id: `log_${p.id}`,
    shopId: shopId,
    productId: p.id,
    productName: p.name,
    type: "in",
    quantity: p.stockQuantity,
    unit: p.unit,
    note: "Initial base stocks",
    createdBy: "usr_owner_1",
    createdAt: new Date().toISOString()
  }));

  const defaultCustomers: Customer[] = [
    {
      id: "cust_1",
      shopId: shopId,
      name: "Zaman Khan Bhatti",
      phone: "+92 300 9876543",
      address: "Mughalpura Town, Lahore",
      openingBalance: 0,
      creditBalance: 3400, // Demands payment
      createdAt: new Date().toISOString()
    },
    {
      id: "cust_2",
      shopId: shopId,
      name: "Karamat Sweet Palace",
      phone: "+92 321 4455667",
      address: "Main Market, Lahore",
      openingBalance: 5000,
      creditBalance: 12500, // Bulk client
      createdAt: new Date().toISOString()
    },
    {
      id: "cust_3",
      shopId: shopId,
      name: "Bano Bakers",
      phone: "+92 311 2233445",
      address: "Link Road, Lahore",
      openingBalance: 0,
      creditBalance: 0,
      createdAt: new Date().toISOString()
    }
  ];

  const defaultSuppliers: Supplier[] = [
    {
      id: "supp_1",
      shopId: shopId,
      name: "Sharif Grain Dealers",
      phone: "+92 345 1122334",
      companyName: "Sharif & Sons Wheat Millers",
      outstandingBalance: 145000, // We owe them
      createdAt: new Date().toISOString()
    },
    {
      id: "supp_2",
      shopId: shopId,
      name: "Malik Packaging",
      phone: "+92 333 4455660",
      companyName: "Malik Sacks Ltd",
      outstandingBalance: 12000,
      createdAt: new Date().toISOString()
    }
  ];

  // Prepopulate yesterday & past days sales
  const defaultSales: Sale[] = [
    {
      id: "sal_11",
      shopId: shopId,
      invoiceNumber: "INV-1001",
      customerId: "cust_1",
      customerName: "Zaman Khan Bhatti",
      items: [
        {
          id: "item_1",
          productId: "prod_1",
          productName: "Premium Chakki Atta",
          quantity: 40,
          unit: "KG",
          price: 80,
          cost: 65,
          total: 3200
        },
        {
          id: "item_2",
          productId: "prod_4",
          productName: "Bran (Wheat Chokar)",
          quantity: 10,
          unit: "KG",
          price: 55,
          cost: 40,
          total: 550
        }
      ],
      discount: 200,
      tax: 0,
      subtotal: 3750,
      total: 3550,
      totalCost: 3000,
      paymentMethod: "Cash",
      saleType: "Credit",
      status: "partial",
      amountPaid: 150, // Remains 3400 (matches default customer credit balance)
      createdBy: "usr_owner_1",
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // 2 days ago
    },
    {
      id: "sal_12",
      shopId: shopId,
      invoiceNumber: "INV-1002",
      customerName: "Walk-in Customer",
      items: [
        {
          id: "item_3",
          productId: "prod_1",
          productName: "Premium Chakki Atta",
          quantity: 20,
          unit: "KG",
          price: 80,
          cost: 65,
          total: 1600
        }
      ],
      discount: 0,
      tax: 0,
      subtotal: 1600,
      total: 1600,
      totalCost: 1300,
      paymentMethod: "Cash",
      saleType: "Cash",
      status: "paid",
      amountPaid: 1600,
      createdBy: "usr_owner_1",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
    },
    {
      id: "sal_13",
      shopId: shopId,
      invoiceNumber: "INV-1003",
      customerId: "cust_2",
      customerName: "Karamat Sweet Palace",
      items: [
        {
          id: "item_4",
          productId: "prod_2",
          productName: "Fine Maida",
          quantity: 150,
          unit: "KG",
          price: 105,
          cost: 80,
          total: 15750
        }
      ],
      discount: 750,
      tax: 0,
      subtotal: 15750,
      total: 15000,
      totalCost: 12000,
      paymentMethod: "Bank",
      saleType: "Credit",
      status: "partial",
      amountPaid: 2500, // We record 2500 paid, 12500 outstanding credit (matches default credit balance)
      createdBy: "usr_owner_1",
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // Today
    }
  ];

  const defaultExpenses: Expense[] = [
    {
      id: "exp_1",
      shopId: shopId,
      category: "Electricity",
      amount: 4500,
      description: "Chakki Main Motor Bill for April",
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    },
    {
      id: "exp_2",
      shopId: shopId,
      category: "Labor",
      amount: 12000,
      description: "Weekly labor wages (helper boys)",
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    },
    {
      id: "exp_3",
      shopId: shopId,
      category: "Transport",
      amount: 3500,
      description: "Loading wheat bags from central grain store",
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    }
  ];

  const defaultPaymentLogs: PaymentLog[] = [
    {
      id: "payl_1",
      shopId: shopId,
      partyType: "customer",
      partyId: "cust_1",
      partyName: "Zaman Khan Bhatti",
      amount: 150,
      paymentMethod: "Cash",
      note: "Partial paid on INV-1001 sale",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    },
    {
      id: "payl_2",
      shopId: shopId,
      partyType: "supplier",
      partyId: "supp_1",
      partyName: "Sharif Grain Dealers",
      amount: 25000,
      paymentMethod: "Bank",
      note: "Advance payment on wheat supply contract",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    }
  ];

  const defaultNotifications: Notification[] = [
    {
      id: "not_1",
      shopId: shopId,
      type: "low_stock",
      message: "Bran (Wheat Chokar) stock is sitting at 80 KG, below your alert threshold of 100 KG.",
      read: false,
      createdAt: new Date().toISOString()
    },
    {
      id: "not_2",
      shopId: shopId,
      type: "credit_reminder",
      message: "Customer Karamat Sweet Palace outstanding credit balance has spiked to PKR 12,500.",
      read: false,
      createdAt: new Date().toISOString()
    }
  ];

  const defaultSettings: ShopSettings[] = [
    {
      shopId: shopId,
      currency: "PKR",
      language: "en",
      taxRate: 0,
      invoicePrefix: "INV",
      invoiceCounter: 1004,
      allowedFlourPrices: {
        "Premium Chakki Atta": 80,
        "Fine Maida": 105,
        "Suji (Semolina)": 110,
        "Bran (Wheat Chokar)": 55
      }
    }
  ];

  return {
    users: defaultUsers,
    shops: defaultShops,
    products: defaultProducts,
    inventoryLogs: defaultInventoryLogs,
    customers: defaultCustomers,
    suppliers: defaultSuppliers,
    sales: defaultSales,
    expenses: defaultExpenses,
    paymentLogs: defaultPaymentLogs,
    notifications: defaultNotifications,
    settings: defaultSettings,
    userSessions: [],
    priceQuotes: []
  };
};

// Database persistence class
class LowMockDB {
  public onSaveCallback?: (colName?: string) => void;
  private data: DBStructure = {
    users: [],
    shops: [],
    products: [],
    inventoryLogs: [],
    customers: [],
    suppliers: [],
    sales: [],
    expenses: [],
    paymentLogs: [],
    notifications: [],
    settings: [],
    userSessions: [],
    priceQuotes: []
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        this.data = { ...this.data, ...JSON.parse(fileContent) };
        
        // Safety double-check: if key users/shops is missing, reload defaults
        if (!this.data.users || this.data.users.length === 0) {
          throw new Error("Empty DB file");
        }
      } else {
        this.resetToDefaults();
      }
    } catch (e) {
      console.log("DB File Error or not found, generating initial records", e);
      this.resetToDefaults();
    }
  }

  public resetToDefaults() {
    this.data = getInitialDB();
    this.save();
  }

  public save(colName?: string) {
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), "utf-8");
      fs.renameSync(tempFile, DB_FILE);
      
      if (this.onSaveCallback) {
        try {
          this.onSaveCallback(colName);
        } catch (callbackErr) {
          console.error("Supabase sync callback error:", callbackErr);
        }
      }
    } catch (e) {
      console.error("Failed to write mock data file:", e);
    }
  }

  public setCollectionFromSupabase(key: string, data: any[]) {
    if (this.data[key as keyof DBStructure]) {
      (this.data as any)[key] = data;
    }
  }

  // Auth getters
  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getShopById(id: string): Shop | undefined {
    return this.data.shops.find(s => s.id === id);
  }

  public getAllShops(): Shop[] {
    return this.data.shops;
  }

  public getAllUsers(): User[] {
    return this.data.users;
  }

  public getShopSettings(shopId: string): ShopSettings {
    let settings = this.data.settings.find(s => s.shopId === shopId);
    if (!settings) {
      settings = {
        shopId: shopId,
        currency: "PKR",
        language: "en",
        taxRate: 0,
        invoicePrefix: "INV",
        invoiceCounter: 1001,
        allowedFlourPrices: {
          "Fine Atta": 85,
          "Chakki Atta": 80,
          "Maida": 105,
          "Bran (Chokar)": 50
        }
      };
      this.data.settings.push(settings);
      this.save("settings");
    }
    return settings;
  }

  // Writers & Custom operations
  public registerTenant(payload: {
    name: string;
    email: string;
    phone: string;
    password?: string;
    shopName: string;
    role: "owner";
  }): any {
    const shopId = `shp_${Math.random().toString(36).substr(2, 9)}`;
    const userId = `usr_${Math.random().toString(36).substr(2, 9)}`;

    // 1. Create shop
    const newShop: Shop = {
      id: shopId,
      name: payload.shopName,
      status: "active",
      subscription: "trial",
      ownerId: userId,
      createdAt: new Date().toISOString(),
      phone: payload.phone,
      email: payload.email
    };
    this.data.shops.push(newShop);

    // 2. Create User
    const newUser: User = {
      id: userId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      role: "owner",
      shopId: shopId,
      createdAt: new Date().toISOString(),
      password: payload.password
    };
    this.data.users.push(newUser);

    // 3. Create Settings
    const newSettings: ShopSettings = {
      shopId: shopId,
      currency: "PKR",
      language: "en",
      taxRate: 0,
      invoicePrefix: "INV",
      invoiceCounter: 1001,
      allowedFlourPrices: {
        "Fine Atta": 85,
        "Chakki Atta": 80,
        "Maida": 105,
        "Bran (Chokar)": 50
      }
    };
    this.data.settings.push(newSettings);

    // 4. Create default Products for flour mills
    const FlourProducts = [
      { name: "Chakki Atta", unit: "KG", cost: 65, price: 80, sku: "FL-01", stock: 100, min: 30 },
      { name: "Fine Flour (Maida)", unit: "KG", cost: 80, price: 105, sku: "FL-02", stock: 100, min: 20 },
      { name: "Bran (Chokar)", unit: "KG", cost: 35, price: 50, sku: "FL-03", stock: 100, min: 20 }
    ];

    FlourProducts.forEach((p, idx) => {
      const prodId = `prod_${shopId}_${idx}`;
      const product: Product = {
        id: prodId,
        shopId: shopId,
        name: p.name,
        sku: p.sku,
        unit: p.unit as any,
        costPrice: p.cost,
        sellingPrice: p.price,
        stockQuantity: p.stock,
        minStockAlert: p.min,
        category: "Flour",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.data.products.push(product);

      this.data.inventoryLogs.push({
        id: `log_${prodId}`,
        shopId: shopId,
        productId: prodId,
        productName: p.name,
        type: "in",
        quantity: p.stock,
        unit: p.unit,
        note: "Default Sign-up Base Stock",
        createdBy: userId,
        createdAt: new Date().toISOString()
      });
    });

    this.save();

    return {
      user: newUser,
      shop: newShop,
      settings: newSettings
    };
  }

  // Generic Getters by shop ID
  public getDataByShop<K extends keyof DBStructure>(key: K, shopId: string): DBStructure[K] {
    return (this.data[key] as any).filter((item: any) => item.shopId === shopId);
  }

  // Consolidated Sync Engine state fetch
  public getSyncState(shopId: string): any {
    const sales = this.getDataByShop("sales", shopId) as Sale[];
    const expenses = this.getDataByShop("expenses", shopId);
    const products = this.getDataByShop("products", shopId);
    const customers = this.getDataByShop("customers", shopId);
    const suppliers = this.getDataByShop("suppliers", shopId);
    const payments = this.data.paymentLogs.filter(p => p.shopId === shopId);
    const notifications = this.data.notifications.filter(n => n.shopId === shopId);
    const inventoryLogs = this.data.inventoryLogs.filter(log => log.shopId === shopId);
    const settings = this.getShopSettings(shopId);
    const priceQuotes = this.data.priceQuotes.filter(q => q.shopId === shopId);

    const getPKTDateString = (dateInput?: string | Date): string => {
      if (!dateInput) return "";
      try {
        const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
        if (isNaN(d.getTime())) return "";
        return new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Karachi',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(d);
      } catch (e) { return ""; }
    };

    const todayPKT = getPKTDateString(new Date());

    // 1. TODAY BREAKDOWN
    const todaySalesList = sales.filter(s => getPKTDateString(s.createdAt) === todayPKT);
    const todaySalesTotal = todaySalesList.reduce((sum, s) => sum + s.total, 0);
    const todayProfitTotal = todaySalesList.reduce((sum, s) => sum + (s.total - (s.totalCost || 0)), 0);

    // 2. CASH BALANCE
    const allSalesCash = sales.reduce((sum, s) => s.paymentMethod === "Cash" ? sum + (s.amountPaid || 0) : sum, 0);
    const allCustomerPaymentsCash = payments.reduce((sum, p) => (p.partyType === "customer" && p.paymentMethod === "Cash") ? sum + p.amount : sum, 0);
    const allExpensesCash = expenses.reduce((sum, e) => sum + e.amount, 0);
    const allSupplierPaymentsCash = payments.reduce((sum, p) => (p.partyType === "supplier" && p.paymentMethod === "Cash") ? sum + p.amount : sum, 0);
    const totalCashInHand = 10000 + allSalesCash + allCustomerPaymentsCash - allExpensesCash - allSupplierPaymentsCash;

    // 3. OTHER AGGREGATES
    const totalOutstandingCredits = customers.reduce((sum, c) => sum + c.creditBalance, 0);
    const totalOutstandingDebts = suppliers.reduce((sum, s) => sum + s.outstandingBalance, 0);
    const inventoryValueAtCost = products.reduce((sum, p) => sum + (p.stockQuantity * p.costPrice), 0);

    // 4. CHART DATA
    const salesChartData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = getPKTDateString(d);
      const daySales = sales.filter(s => getPKTDateString(s.createdAt) === dateStr);
      return {
        date: dateStr,
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        sales: daySales.reduce((sum, s) => sum + s.total, 0),
        Sales: daySales.reduce((sum, s) => sum + s.total, 0),
        profit: daySales.reduce((sum, s) => sum + (s.total - (s.totalCost || 0)), 0),
        Profit: daySales.reduce((sum, s) => sum + (s.total - (s.totalCost || 0)), 0)
      };
    });

    return {
      metrics: {
        todaySales: todaySalesTotal,
        dailyProfit: todayProfitTotal,
        cashInHand: totalCashInHand,
        creditSales: totalOutstandingCredits,
        inventoryValue: inventoryValueAtCost,
        pendingPayments: totalOutstandingDebts
      },
      salesHistory: salesChartData,
      products,
      customers,
      suppliers,
      expenses,
      sales: [...sales].reverse(),
      notifications: [...notifications].reverse(),
      inventoryLogs: [...inventoryLogs].reverse(),
      settings,
      priceQuotes: [...priceQuotes].reverse()
    };
  }

  // Create or Update
  public updateRow<K extends keyof DBStructure>(key: K, row: any): any {
    const list = this.data[key] as any[];
    const index = list.findIndex(r => r.id === row.id);
    if (index > -1) {
      list[index] = { ...list[index], ...row, updatedAt: new Date().toISOString() };
    } else {
      list.push(row);
    }
    this.save(key);
    return row;
  }

  public deleteRow<K extends keyof DBStructure>(key: K, id: string): boolean {
    const list = this.data[key] as any[];
    const index = list.findIndex(r => r.id === id);
    if (index > -1) {
      console.log(`[DB] Deleting row with ID: ${id} from collection: ${key}`);
      list.splice(index, 1);
      this.save(key);
      return true;
    }
    console.warn(`[DB] Could not find row with ID: ${id} in collection: ${key} for deletion.`);
    return false;
  }

  // Custom Operations (Atomically handle sales, stock deductions, credit accumulation)
  public createSale(saleData: Omit<Sale, "id" | "invoiceNumber" | "createdAt" | "createdBy">, userId: string, shopId: string): Sale {
    const settings = this.getShopSettings(shopId)!;
    const invoiceNum = `${settings.invoicePrefix}-${settings.invoiceCounter}`;
    
    // Increment invoice counter
    settings.invoiceCounter += 1;
    this.updateRow("settings", settings);

    const saleId = `sal_${Math.random().toString(36).substr(2, 9)}`;
    const completeSale: Sale = {
      ...saleData,
      id: saleId,
      shopId: shopId,
      invoiceNumber: invoiceNum,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };

    // Commit to list
    this.data.sales.push(completeSale);

    // 1. DEDUCT stock & CREATE LOG for each item
    completeSale.items.forEach(item => {
      const prod = this.data.products.find(p => p.id === item.productId && p.shopId === shopId);
      if (prod) {
        prod.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
        prod.updatedAt = new Date().toISOString();
        
        // Log in inventory history
        const logId = `log_${Math.random().toString(36).substr(2, 9)}`;
        const weightInKgPerUnit = getWeightInKg(item.unit);
        const totalWeightKg = Number((item.quantity * weightInKgPerUnit).toFixed(2));
        const invLog: InventoryLog = {
          id: logId,
          shopId: shopId,
          productId: item.productId,
          productName: item.productName,
          type: "out",
          quantity: item.quantity,
          unit: item.unit,
          note: `Auto-deducted on sale ${invoiceNum} (Total weight: ${totalWeightKg} KG)`,
          createdBy: userId,
          createdAt: new Date().toISOString()
        };
        this.data.inventoryLogs.push(invLog);

        // Low stock checker notification trigger
        if (prod.stockQuantity <= prod.minStockAlert) {
          const notLog: Notification = {
            id: `not_${Math.random().toString(36).substr(2, 9)}`,
            shopId: shopId,
            type: "low_stock",
            message: `${prod.name} has dropped to ${prod.stockQuantity} ${prod.unit}, triggering low stock alert.`,
            read: false,
            createdAt: new Date().toISOString()
          };
          this.data.notifications.push(notLog);
        }
      }
    });

    // 2. Adjust CREDIT balance & opening balance of customer if 'Credit' sale
    if (completeSale.saleType === "Credit" && completeSale.customerId) {
      const outstandingDebt = completeSale.total - completeSale.amountPaid;
      if (outstandingDebt > 0) {
        const customer = this.data.customers.find(c => c.id === completeSale.customerId && c.shopId === shopId);
        if (customer) {
          customer.creditBalance += outstandingDebt;
        }
      }
    }

    this.save("sales");
    this.save("products");
    this.save("settings");
    this.save("inventoryLogs");
    if (completeSale.saleType === "Credit" && completeSale.customerId) {
      this.save("customers");
    }
    return completeSale;
  }

  // Atomic inventory adjustment (handles both products and logs)
  public adjustStock(shopId: string, productId: string, type: "in" | "out" | "adjustment" | "wastage", quantity: number, note: string, userId: string): any {
    const products = this.getDataByShop("products", shopId);
    const prod = products.find(p => p.id === productId);
    if (!prod) throw new Error("Product not registered in this shop.");

    const qty = Number(quantity);
    if (type === "in" || type === "adjustment") {
      prod.stockQuantity += qty;
    } else {
      prod.stockQuantity = Math.max(0, prod.stockQuantity - qty);
    }
    prod.updatedAt = new Date().toISOString();

    // Create logRecord
    const weightInKgPerUnit = getWeightInKg(prod.unit);
    const totalWeightKg = Number((qty * weightInKgPerUnit).toFixed(2));
    const logId = `log_${Math.random().toString(36).substr(2, 9)}`;
    const logRecord: InventoryLog = {
      id: logId,
      shopId,
      productId,
      productName: prod.name,
      type,
      quantity: qty,
      unit: prod.unit,
      note: note || `Manual ${type} adjustment (${totalWeightKg} KG).`,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };

    this.data.inventoryLogs.push(logRecord);
    this.save("products");
    this.save("inventoryLogs");
    return { product: prod, log: logRecord };
  }

  // Session Management
  public createSession(session: UserSession): UserSession {
    if (!this.data.userSessions) {
      this.data.userSessions = [];
    }
    this.data.userSessions.push(session);
    this.save("userSessions");
    return session;
  }

  public getSessionsByUserId(userId: string): UserSession[] {
    if (!this.data.userSessions) {
      this.data.userSessions = [];
    }
    return this.data.userSessions.filter(s => s.userId === userId);
  }

  public deleteSession(sessionId: string): boolean {
    const index = this.data.userSessions.findIndex(s => s.id === sessionId);
    if (index > -1) {
      this.data.userSessions.splice(index, 1);
      this.save("userSessions");
      return true;
    }
    return false;
  }

  public updateSessionActivity(sessionId: string): void {
    const session = this.data.userSessions.find(s => s.id === sessionId);
    if (session) {
      session.lastActive = new Date().toISOString();
      // We don't necessarily need to save on every activity update for performance, 
      // but let's do it for consistency in this small app.
      this.save("userSessions");
    }
  }

  public deleteUserSessionsExcept(userId: string, exceptSessionId: string): void {
    this.data.userSessions = this.data.userSessions.filter(s => s.userId !== userId || s.id === exceptSessionId);
    this.save("userSessions");
  }

  // Handle manual customer payments towards ledger
  public receiveCustomerPayment(customerId: string, amount: number, method: "Cash" | "Bank" | "JazzCash" | "EasyPaisa", note: string, shopId: string): Customer {
    const customer = this.data.customers.find(c => c.id === customerId && c.shopId === shopId);
    if (!customer) throw new Error("Customer not found");

    customer.creditBalance = Math.max(0, customer.creditBalance - amount);
    
    // Add ledger payment item
    const paymentId = `payl_${Math.random().toString(36).substr(2, 9)}`;
    const payLog: PaymentLog = {
      id: paymentId,
      shopId: shopId,
      partyType: "customer",
      partyId: customerId,
      partyName: customer.name,
      amount: amount,
      paymentMethod: method,
      note: note || "Received account payment towards outstanding credit",
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    };
    this.data.paymentLogs.push(payLog);
    this.save();
    return customer;
  }

  // Handle supplier ledger billing payments
  public paySupplier(supplierId: string, amount: number, method: "Cash" | "Bank" | "JazzCash" | "EasyPaisa", note: string, shopId: string): Supplier {
    const supplier = this.data.suppliers.find(s => s.id === supplierId && s.shopId === shopId);
    if (!supplier) throw new Error("Supplier not found");

    supplier.outstandingBalance = Math.max(0, supplier.outstandingBalance - amount);

    // Add payment log
    const paymentId = `payl_${Math.random().toString(36).substr(2, 9)}`;
    const payLog: PaymentLog = {
      id: paymentId,
      shopId: shopId,
      partyType: "supplier",
      partyId: supplierId,
      partyName: supplier.name,
      amount: amount,
      paymentMethod: method,
      note: note || "Paid to supplier towards wheat supply bills",
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    };
    this.data.paymentLogs.push(payLog);
    this.save();
    return supplier;
  }

  // Return the raw entire structure (for platform admins)
  public getRawDB() {
    return this.data;
  }
}

export const dbService = new LowMockDB();
