const fs = require('fs');
const path = require('path');
const ShopifyClient = require('./shopify-client');

const DB_PATH = path.join(__dirname, 'database.json');

// Default Vijayawada Event Seed
const defaultEvent = {
  id: 'HPD-VIJ-OCT2026',
  name: 'Half Price Days - Vijayawada Retail Expo',
  city: 'Vijayawada',
  venue: 'SVN Conventions, Poranki',
  startDate: '2026-10-08',
  endDate: '2026-10-11'
};

const defaultUsers = [
  { id: 'usr_1', name: 'Krishna (Super Admin)', email: 'admin@halfpe.com', role: 'super_admin' },
  { id: 'usr_2', name: 'Ravi Teja (Billing Counter)', email: 'billing@halfpe.com', role: 'billing_staff' },
  { id: 'usr_3', name: 'Ananya Rao (Finance & Accounts)', email: 'finance@halfpe.com', role: 'finance' },
  { id: 'usr_4', name: 'Suresh Kumar (Audit Viewer)', email: 'viewer@halfpe.com', role: 'viewer' }
];

class Store {
  constructor() {
    this.data = this.load();
    this.initRealVendors();
  }

  load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed.billRows) parsed.billRows = [];
        if (!parsed.returns) parsed.returns = [];
        if (!parsed.payouts) parsed.payouts = [];
        if (!parsed.auditLog) parsed.auditLog = [];
        if (!parsed.dayLocks) parsed.dayLocks = [];
        if (!parsed.users) parsed.users = defaultUsers;
        if (!parsed.events) parsed.events = [defaultEvent];
        return parsed;
      }
    } catch (err) {
      console.error('Failed to read db, initializing fresh store:', err);
    }
    const fresh = {
      events: [defaultEvent],
      users: defaultUsers,
      vendors: [],
      billRows: [],
      returns: [],
      payouts: [],
      dayLocks: [],
      auditLog: []
    };
    this.save(fresh);
    return fresh;
  }

  save(dataToSave) {
    const data = dataToSave || this.data;
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  /**
   * Initializes real Vijayawada event vendors from page.vijaywada-s-event.json
   */
  initRealVendors() {
    const masterVendors = ShopifyClient.loadVijayawadaVendorsMaster();
    if (!masterVendors || masterVendors.length === 0) return;

    // Check if store has old fake vendors (e.g. v_101) or is empty
    const hasOldVendors = !this.data.vendors || this.data.vendors.length === 0 || 
      this.data.vendors.some(v => v.id === 'v_101' || v.name === 'Sri Balaji Handlooms & Sarees');

    if (hasOldVendors || this.data.vendors.length < masterVendors.length) {
      console.log(`[Store] Initializing ${masterVendors.length} real Vijayawada event vendors...`);

      // Preserve existing commission settings if any
      const existingCommissionMap = {};
      (this.data.vendors || []).forEach(v => {
        if (v.commissionPct !== undefined) existingCommissionMap[v.id] = v.commissionPct;
      });

      this.data.vendors = masterVendors.map(v => ({
        id: `v_${v.vendor_code}`,
        eventId: 'HPD-VIJ-OCT2026',
        stallNo: v.stall_no.toLowerCase().includes('stall') ? v.stall_no : `Stall ${v.stall_no}`,
        name: v.vendor_name,
        code: v.vendor_code,
        category: v.category,
        webkulSellerId: `WK-${v.vendor_code}`,
        commissionPct: existingCommissionMap[`v_${v.vendor_code}`] ?? 15.0
      }));

      // Sort by stall number naturally
      this.data.vendors.sort((a, b) => {
        const numA = parseInt(a.stallNo.replace(/\D/g, '') || '999', 10);
        const numB = parseInt(b.stallNo.replace(/\D/g, '') || '999', 10);
        return numA - numB;
      });

      // Clear legacy dummy bills if only old seed rows were present
      if (hasOldVendors && this.data.billRows && this.data.billRows.some(r => r.vendorId === 'v_101')) {
        this.data.billRows = this.data.billRows.filter(r => r.vendorId !== 'v_101' && r.vendorId !== 'v_102' && r.vendorId !== 'v_103');
      }

      this.save();
    }
  }

  /**
   * Syncs Shopify bill rows and returns into store
   */
  syncShopifyData(billRows, returns, syncStats = {}) {
    // Preserve manual & edited rows
    const manualRows = (this.data.billRows || []).filter(r => r.source === 'Manual' || r.source === 'Edited');
    
    // Replace auto-synced Shopify rows
    this.data.billRows = [...manualRows, ...billRows];

    // Deduplicate by id just in case
    const seenIds = new Set();
    this.data.billRows = this.data.billRows.filter(r => {
      if (seenIds.has(r.id)) return false;
      seenIds.add(r.id);
      return true;
    });

    // Replace auto-synced Shopify returns while preserving manual returns
    const manualReturns = (this.data.returns || []).filter(r => !r.id.startsWith('ret_shopify_'));
    this.data.returns = [...manualReturns, ...returns];

    this.data.lastShopifySync = new Date().toISOString();
    this.data.lastSyncStats = syncStats;

    this.save();
    return {
      billRowsCount: this.data.billRows.length,
      returnsCount: this.data.returns.length,
      lastSync: this.data.lastShopifySync
    };
  }

  // Filter bills and returns by date range if specified
  filterByDateRange(items, dateField, startDate, endDate) {
    if (!startDate && !endDate) return items;
    return items.filter(item => {
      const itemDate = item[dateField];
      if (!itemDate) return true;
      const dateStr = itemDate.slice(0, 10); // YYYY-MM-DD
      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;
      return true;
    });
  }

  // Calculation helpers per Section 7 with date range filter support
  getVendorSummary(vendorId, options = {}) {
    const { startDate, endDate } = options;
    const vendor = this.data.vendors.find(v => v.id === vendorId);
    if (!vendor) return null;

    let vendorBills = this.data.billRows.filter(r => r.vendorId === vendorId);
    vendorBills = this.filterByDateRange(vendorBills, 'createdAt', startDate, endDate);

    const nonVoidBills = vendorBills.filter(r => !r.isVoid);
    const grossSales = nonVoidBills.reduce((acc, r) => acc + Number(r.billAmount || 0), 0);

    let vendorReturns = this.data.returns.filter(ret => ret.vendorId === vendorId);
    vendorReturns = this.filterByDateRange(vendorReturns, 'date', startDate, endDate);

    const totalReturns = vendorReturns.reduce((acc, ret) => acc + Number(ret.amount || 0), 0);
    const netSales = Math.round(Math.max(0, grossSales - totalReturns) * 100) / 100;
    const commissionPct = Number(vendor.commissionPct || 15.0);
    const commissionAmount = Math.round((netSales * (commissionPct / 100)) * 100) / 100;
    const settlementPayable = Math.round(Math.max(0, netSales - commissionAmount) * 100) / 100;

    let vendorPayouts = this.data.payouts.filter(p => p.vendorId === vendorId);
    vendorPayouts = this.filterByDateRange(vendorPayouts, 'date', startDate, endDate);

    const totalPaid = Math.round(vendorPayouts.reduce((acc, p) => acc + Number(p.amount || 0), 0) * 100) / 100;
    const balanceToPay = Math.round((settlementPayable - totalPaid) * 100) / 100;

    let status = 'Open';
    if (totalPaid >= settlementPayable && settlementPayable > 0) {
      status = 'Settled';
    } else if (totalPaid > 0) {
      status = 'Partly paid';
    }

    return {
      vendor,
      ordersCount: nonVoidBills.length,
      grossSales,
      returnsCount: vendorReturns.length,
      returnsAmount: totalReturns,
      netSales,
      commissionPct,
      commissionAmount,
      settlementPayable,
      alreadyPaid: totalPaid,
      balanceToPay,
      status
    };
  }

  getAllVendorsSummary(options = {}) {
    const list = this.data.vendors.map(v => this.getVendorSummary(v.id, options));
    
    // Overall Event Totals
    const eventTotals = list.reduce((acc, item) => {
      acc.totalOrders += item.ordersCount;
      acc.grossSales = Math.round((acc.grossSales + item.grossSales) * 100) / 100;
      acc.totalReturns = Math.round((acc.totalReturns + item.returnsAmount) * 100) / 100;
      acc.netSales = Math.round((acc.netSales + item.netSales) * 100) / 100;
      acc.totalCommission = Math.round((acc.totalCommission + item.commissionAmount) * 100) / 100;
      acc.settlementPayable = Math.round((acc.settlementPayable + item.settlementPayable) * 100) / 100;
      acc.alreadyPaid = Math.round((acc.alreadyPaid + item.alreadyPaid) * 100) / 100;
      acc.balanceToPay = Math.round((acc.balanceToPay + item.balanceToPay) * 100) / 100;
      return acc;
    }, {
      totalOrders: 0,
      grossSales: 0,
      totalReturns: 0,
      netSales: 0,
      totalCommission: 0,
      settlementPayable: 0,
      alreadyPaid: 0,
      balanceToPay: 0
    });

    return {
      vendors: list,
      eventTotals,
      lastShopifySync: this.data.lastShopifySync || null,
      lastSyncStats: this.data.lastSyncStats || null
    };
  }

  logAudit(user, action, entity, entityId, field, oldValue, newValue, reason) {
    const entry = {
      id: 'aud_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      user: user || 'Unknown Staff',
      action,
      entity,
      entityId,
      field,
      oldValue: String(oldValue ?? ''),
      newValue: String(newValue ?? ''),
      reason: reason || 'Not specified'
    };
    this.data.auditLog.unshift(entry);
    this.save();
    return entry;
  }
}

module.exports = new Store();
