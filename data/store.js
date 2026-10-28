const fs = require('fs');
const path = require('path');
const ShopifyClient = require('./shopify-client');

const DB_PATH = path.join(__dirname, 'database.json');
const SEED_PATH = path.join(__dirname, 'database.seed.json');

// Default Vijayawada Event Seed
const defaultCities = [
  { id: 'VIJ', code: 'VIJ', name: 'Vijayawada Expo', venue: 'SVN Conventions, Poranki', dates: '8–11 Oct 2026', defaultCommissionPct: 15, isActive: true },
  { id: 'HYD', code: 'HYD', name: 'Hyderabad Expo', venue: 'Hitex Exhibition Centre, Madhapur', dates: '15–18 Oct 2026', defaultCommissionPct: 15, isActive: true },
  { id: 'VSP', code: 'VSP', name: 'Visakhapatnam Expo', venue: 'AU Convention Center', dates: '22–25 Oct 2026', defaultCommissionPct: 15, isActive: true },
  { id: 'BLR', code: 'BLR', name: 'Bengaluru Expo', venue: 'Tripuravasini Palace Grounds', dates: '29 Oct–1 Nov 2026', defaultCommissionPct: 15, isActive: true }
];

const defaultEvent = {
  id: 'HPD-VIJ-OCT2026',
  name: 'Half Price Days - Vijayawada Retail Expo',
  city: 'Vijayawada',
  venue: 'SVN Conventions, Poranki',
  startDate: '2026-10-08',
  endDate: '2026-10-11'
};

const ALL_SCOPES = [
  { id: 'overall_settlement', label: '📊 Overall Settlement', desc: 'View consolidated event sales, fee, net payable & daily locks' },
  { id: 'vendor_wise', label: '🏢 Vendor-wise Dashboard', desc: 'View vendor stall ledger, returns, bills, and performance' },
  { id: 'orders_management', label: '📦 Orders Management', desc: 'Inspect staged POS bills awaiting processing' },
  { id: 'orders_approval', label: '⚡ Push to Shopify Approval', desc: 'Manually or bulk approve orders into official Shopify store' },
  { id: 'vendor_management', label: '🏬 Vendor Management', desc: 'Register new vendors, assign/change stalls, or deactivate' },
  { id: 'payout_management', label: '💸 Payout Disbursements', desc: 'Disburse order-linked settlements with partial balance tracking' },
  { id: 'audit_log', label: '📜 System Audit Trail', desc: 'Inspect immutable logs of order edits, approvals, and payouts' },
  { id: 'user_management', label: '👥 Team & Access Control', desc: 'Create user IDs, set passwords, assign designations & scopes' },
  { id: 'export_reports', label: '📥 Export Reports', desc: 'Download CSV / Excel settlement data & exception logs' },
  { id: 'simulate_orders', label: '🧪 POS Simulation Testing', desc: 'Simulate new POS counter bills for testing' }
];

const defaultUsers = [
  {
    id: 'usr_1',
    name: 'Krishna (Super Admin)',
    email: 'admin@halfpe.com',
    password: 'admin@2026',
    designation: 'Founder & Super Admin',
    role: 'super_admin',
    scopes: ALL_SCOPES.map(s => s.id),
    active: true
  },
  {
    id: 'usr_2',
    name: 'Ravi Teja (Billing Counter)',
    email: 'billing@halfpe.com',
    password: 'billing@2026',
    designation: 'Billing Counter Operator',
    role: 'billing_staff',
    scopes: ['orders_management', 'simulate_orders'],
    active: true
  },
  {
    id: 'usr_3',
    name: 'Ananya Rao (Finance & Accounts)',
    email: 'finance@halfpe.com',
    password: 'finance@2026',
    designation: 'Head of Finance & Reconciliation',
    role: 'finance',
    scopes: ['overall_settlement', 'vendor_wise', 'payout_management', 'audit_log', 'export_reports'],
    active: true
  },
  {
    id: 'usr_4',
    name: 'Suresh Kumar (Audit Viewer)',
    email: 'viewer@halfpe.com',
    password: 'viewer@2026',
    designation: 'External Financial Auditor',
    role: 'viewer',
    scopes: ['overall_settlement', 'vendor_wise', 'audit_log', 'export_reports'],
    active: true
  },
  {
    id: 'usr_5',
    name: 'Profit Shoe Co (Vendor User)',
    email: 'vendor@halfpe.com',
    password: 'vendor@2026',
    designation: 'Vendor Representative (Stall 01)',
    role: 'vendor',
    vendorId: 'v_PSC',
    scopes: ['vendor_wise'],
    active: true
  }
];

function formatBillCopy(raw) {
  if (!raw) return '';
  if (Array.isArray(raw)) {
    return raw.map(formatBillCopy).filter(Boolean).join(', ');
  }
  const str = String(raw).trim();
  const digits = str.replace(/^[^0-9]+/, '');
  return digits || str;
}

function normalizeCityCode(raw) {
  if (!raw) return 'VIJ';
  const s = String(raw).trim().toUpperCase();
  if (s === 'VIJAYAWADA' || s === 'VIJ') return 'VIJ';
  if (s === 'HYDERABAD' || s === 'HYD') return 'HYD';
  if (s === 'VISAKHAPATNAM' || s === 'VIZAG' || s === 'VSP') return 'VSP';
  if (s === 'BENGALURU' || s === 'BANGALORE' || s === 'BLR') return 'BLR';
  return s;
}

class Store {
  constructor() {
    this.data = this.load();
    this.initRealVendors();
    this.initUsers();
  }

  load() {
    try {
      const targetPath = fs.existsSync(DB_PATH) ? DB_PATH : (fs.existsSync(SEED_PATH) ? SEED_PATH : null);
      if (targetPath) {
        const raw = fs.readFileSync(targetPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed.billRows) parsed.billRows = [];
        if (!parsed.returns) parsed.returns = [];
        if (!parsed.payouts) parsed.payouts = [];
        if (!parsed.auditLog) parsed.auditLog = [];
        if (!parsed.dayLocks) parsed.dayLocks = [];
        if (!parsed.users) parsed.users = defaultUsers;
        if (!parsed.events) parsed.events = [defaultEvent];
        if (!parsed.internalOrders) parsed.internalOrders = [];
        if (!parsed.cities || parsed.cities.length === 0) parsed.cities = defaultCities;
        
        // BUG-19 backfill cityId on all entities
        (parsed.vendors || []).forEach(v => {
          if (!v.cityId) v.cityId = 'VIJ';
          if (v.active === undefined) v.active = true;
        });
        (parsed.billRows || []).forEach(b => { if (!b.cityId) b.cityId = 'VIJ'; });
        (parsed.internalOrders || []).forEach(o => { if (!o.cityId) o.cityId = 'VIJ'; });
        (parsed.returns || []).forEach(r => { if (!r.cityId) r.cityId = 'VIJ'; });
        (parsed.payouts || []).forEach(p => { if (!p.cityId) p.cityId = 'VIJ'; });
        (parsed.auditLog || []).forEach(a => { if (!a.cityId) a.cityId = 'VIJ'; });

        return parsed;
      }
    } catch (err) {
      console.error('Failed to read db, initializing fresh store:', err);
    }
    const fresh = {
      cities: defaultCities,
      events: [defaultEvent],
      users: defaultUsers,
      vendors: [],
      billRows: [],
      internalOrders: [],
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

    if (!this.data.vendors) this.data.vendors = [];
    const vijVendors = this.data.vendors.filter(v => (v.cityId || 'VIJ').toUpperCase() === 'VIJ');

    // BUG-25: Only seed Vijayawada vendors if none exist for Vijayawada. NEVER wipe existing or other cities!
    if (vijVendors.length === 0) {
      console.log(`[Store] Seeding ${masterVendors.length} Vijayawada vendors with cityId: VIJ...`);
      const newVij = masterVendors.map(v => ({
        id: `v_${v.vendor_code}`,
        cityId: 'VIJ',
        eventId: 'HPD-VIJ-OCT2026',
        stallNo: v.stall_no.toLowerCase().includes('stall') ? v.stall_no : `Stall ${v.stall_no}`,
        name: v.vendor_name,
        code: v.vendor_code,
        category: v.category,
        webkulSellerId: `WK-${v.vendor_code}`,
        commissionPct: 15.0,
        active: true
      }));
      this.data.vendors.push(...newVij);
      this.save();
    }
  }

  initUsers() {
    if (!this.data.users || this.data.users.length === 0) {
      this.data.users = defaultUsers;
    }

    const seedMap = {};
    defaultUsers.forEach(u => { seedMap[u.email.toLowerCase()] = u; });

    // Ensure all users have password, designation, scopes, and active flag
    this.data.users.forEach(u => {
      const seed = seedMap[u.email.toLowerCase()];
      if (seed) {
        if (!u.password) u.password = seed.password;
        if (!u.designation) u.designation = seed.designation;
        if (!u.scopes || u.scopes.length === 0) u.scopes = seed.scopes;
        if (seed.vendorId && !u.vendorId) u.vendorId = seed.vendorId;
      }
      if (u.active === undefined) u.active = true;
      if (!u.designation) u.designation = u.role === 'super_admin' ? 'Super Admin' : (u.role === 'vendor' ? 'Vendor Representative' : 'Staff');
      if (!u.scopes || u.scopes.length === 0) {
        u.scopes = u.role === 'super_admin' ? ALL_SCOPES.map(s => s.id) : ['overall_settlement', 'vendor_wise'];
      }
    });

    // Make sure vendor@halfpe.com exists
    if (!this.data.users.some(u => u.email.toLowerCase() === 'vendor@halfpe.com')) {
      const vendorUser = defaultUsers.find(u => u.email === 'vendor@halfpe.com');
      if (vendorUser) this.data.users.push(vendorUser);
    }
  }

  /**
   * Syncs Shopify bill rows and returns into store with zero-loss guarantee for internal orders.
   */
  syncShopifyData(billRows, returns, syncStats = {}) {
    // 1. Strictly preserve all manual, edited, internal counter orders, and webhook rows
    const preservedRows = (this.data.billRows || []).filter(r => 
      r.source === 'Manual' || 
      r.source === 'Edited' || 
      r.source === 'Internal Order Flow' ||
      r.source === 'Shopify Webhook'
    );

    // 2. Track all Shopify Order IDs and Bill Numbers already recorded internally or pushed
    const existingShopifyIds = new Set(
      preservedRows
        .filter(r => r.shopifyOrderId)
        .map(r => String(r.shopifyOrderId))
    );
    const existingBillNos = new Set(
      preservedRows
        .filter(r => r.billCopyNo)
        .map(r => String(r.billCopyNo).trim().toUpperCase())
    );

    // 3. Filter incoming Shopify rows: only add if not already captured as an internal order
    const incomingUniqueShopifyRows = [];
    for (const row of billRows) {
      const sId = row.shopifyOrderId ? String(row.shopifyOrderId) : null;
      const bNo = row.billCopyNo ? String(row.billCopyNo).trim().toUpperCase() : null;

      // If an existing internal order has this shopifyOrderId, update its status without duplicating
      if (sId && existingShopifyIds.has(sId)) {
        const match = preservedRows.find(pr => String(pr.shopifyOrderId) === sId);
        if (match && row.status) {
          match.status = row.status;
          if (row.isVoid !== undefined) match.isVoid = row.isVoid;
        }
        continue;
      }

      // If an existing internal bill has the exact same Bill Copy Number, link the shopifyOrderId
      if (bNo && existingBillNos.has(bNo)) {
        const match = preservedRows.find(pr => String(pr.billCopyNo).trim().toUpperCase() === bNo);
        if (match) {
          if (sId && !match.shopifyOrderId) match.shopifyOrderId = sId;
          match.isApproved = true;
          match.status = 'Paid';
        }
        continue;
      }

      incomingUniqueShopifyRows.push(row);
    }

    // 4. Combine preserved rows with brand new external Shopify orders
    this.data.billRows = [...preservedRows, ...incomingUniqueShopifyRows];

    // Deduplicate strictly by ID
    const seenIds = new Set();
    this.data.billRows = this.data.billRows.filter(r => {
      if (!r || !r.id) return false;
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
    const { startDate, endDate, cityId } = options;
    const vendor = this.data.vendors.find(v => v.id === vendorId);
    if (!vendor) return null;

    const targetCityId = normalizeCityCode(cityId || vendor.cityId || 'VIJ');

    let vendorBills = this.data.billRows.filter(r => r.vendorId === vendorId && (r.cityId || 'VIJ').toUpperCase() === targetCityId);
    vendorBills = this.filterByDateRange(vendorBills, 'createdAt', startDate, endDate);

    const nonVoidBills = vendorBills.filter(r => !r.isVoid && r.isApproved !== false);
    const grossSales = nonVoidBills.reduce((acc, r) => acc + Number(r.billAmount || 0), 0);

    let vendorReturns = this.data.returns.filter(ret => ret.vendorId === vendorId && (ret.cityId || 'VIJ').toUpperCase() === targetCityId);
    vendorReturns = this.filterByDateRange(vendorReturns, 'date', startDate, endDate);

    const totalReturns = vendorReturns.reduce((acc, ret) => acc + Number(ret.amount || 0), 0);
    const netSales = Math.round(Math.max(0, grossSales - totalReturns) * 100) / 100;
    const commissionPct = Number(vendor.commissionPct || 15.0);
    const commissionAmount = Math.round((netSales * (commissionPct / 100)) * 100) / 100;
    const settlementPayable = Math.round(Math.max(0, netSales - commissionAmount) * 100) / 100;

    let vendorPayouts = this.data.payouts.filter(p => p.vendorId === vendorId && (p.cityId || 'VIJ').toUpperCase() === targetCityId);
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
    const targetCityId = normalizeCityCode(options.cityId || 'VIJ');
    const cityVendors = (this.data.vendors || []).filter(v => (v.cityId || 'VIJ').toUpperCase() === targetCityId);

    // BUG-17: Selecting a new city starts with fresh zero values
    if (cityVendors.length === 0) {
      return {
        vendors: [],
        eventTotals: {
          totalOrders: 0,
          grossSales: 0,
          totalReturns: 0,
          netSales: 0,
          totalCommission: 0,
          settlementPayable: 0,
          alreadyPaid: 0,
          balanceToPay: 0
        },
        lastShopifySync: this.data.lastShopifySync || null,
        lastSyncStats: this.data.lastSyncStats || null
      };
    }

    const list = cityVendors.map(v => this.getVendorSummary(v.id, { ...options, cityId: targetCityId }));
    
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

  logAudit(user, action, entity, entityId, field, oldValue, newValue, reason, cityId = 'VIJ') {
    const entry = {
      id: 'aud_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      cityId: String(cityId || 'VIJ').toUpperCase(),
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
    if (!this.data.auditLog) this.data.auditLog = [];
    this.data.auditLog.unshift(entry);
    this.save();
    return entry;
  }

  getAuditLogs(filters = {}) {
    let logs = this.data.auditLog || [];
    const targetCityId = normalizeCityCode(filters.cityId || 'VIJ');
    logs = logs.filter(l => (l.cityId || 'VIJ').toUpperCase() === targetCityId);
    if (filters.action) logs = logs.filter(l => l.action === filters.action);
    if (filters.entity) logs = logs.filter(l => l.entity === filters.entity);
    if (filters.limit) logs = logs.slice(0, filters.limit);
    return logs;
  }


  _groupItemsByStall(items) {
    if (!Array.isArray(items)) return [];
    const groups = {};
    items.forEach(it => {
      const key = it.stallNo || it.vendorId || 'Stall TBD';
      if (!groups[key]) {
        groups[key] = {
          stallNo: it.stallNo || 'Stall TBD',
          vendorId: it.vendorId || null,
          vendorName: it.vendorName || null,
          billBookNo: it.billBookNo || it.billCopyNo || null,
          subtotal: 0,
          items: []
        };
      }
      const lineTotal = Number(it.price || 0) * Number(it.quantity || 1);
      groups[key].subtotal += lineTotal;
      groups[key].items.push(it);
    });
    return Object.values(groups);
  }

  // -------------------------------------------------------------
  // Internal Orders Management (Krishna's New Staging OMS)
  // -------------------------------------------------------------
  recordInternalOrder(orderData, user = 'POS Billing Terminal') {
    const targetCityId = normalizeCityCode(orderData.cityId || orderData.city || 'VIJ');
    const rawBillNo = formatBillCopy(orderData.billNo || orderData.bill_number || `${targetCityId}-${Date.now().toString().slice(-5)}`);
    const paymentId = (orderData.payment && (orderData.payment.paymentId || orderData.payment.razorpay_payment_id)) || '';
    const clientOrderRef = orderData.clientOrderRef ? String(orderData.clientOrderRef).trim() : '';

    // Idempotency: strictly check by paymentId or explicit clientOrderRef (Enhancement 10)
    // Never reject multiple orders for the same phone number or customer!
    let existing = null;
    if (paymentId) {
      existing = (this.data.internalOrders || []).find(o => (o.cityId || "VIJ").toUpperCase() === targetCityId && o.payment && o.payment.paymentId === paymentId);
    }
    if (!existing && clientOrderRef && clientOrderRef !== rawBillNo) {
      existing = (this.data.internalOrders || []).find(o => o.clientOrderRef === clientOrderRef);
    }

    if (existing) {
      console.log(`[Store] Duplicate payment/clientRef prevented for Payment ID: ${paymentId || clientOrderRef}`);
      return { order: existing, isDuplicate: true };
    }

    // Process Stall Groups / Multi-Stall Distribution (Enhancement 9 & 10)
    const rawStallGroups = Array.isArray(orderData.stallGroups) && orderData.stallGroups.length > 0 
      ? orderData.stallGroups 
      : (Array.isArray(orderData.vendorAllocations) && orderData.vendorAllocations.length > 0
          ? orderData.vendorAllocations
          : (Array.isArray(orderData.items) && orderData.items.length > 0 ? this._groupItemsByStall(orderData.items) : []));

    let vendorAllocations = [];
    let calculatedGross = 0;
    let calculatedCommission = 0;

    const cityVendors = (this.data.vendors || []).filter(item => normalizeCityCode(item.cityId) === targetCityId);

    if (rawStallGroups.length > 0) {
      rawStallGroups.forEach((sg, idx) => {
        let v = null;
        if (sg.vendorId) v = cityVendors.find(item => item.id === sg.vendorId);
        if (!v && sg.stallNo) {
          const clean = String(sg.stallNo).replace(/\D/g, '');
          v = cityVendors.find(item => item.stallNo.replace(/\D/g, '') === clean);
        }
        if (!v && sg.vendorName) {
          v = cityVendors.find(item => item.name.toLowerCase() === sg.vendorName.toLowerCase());
        }

        const vId = v ? v.id : (sg.vendorId || `v_stall_${sg.stallNo || idx}`);
        const vName = v ? v.name : (sg.vendorName || `Vendor ${sg.stallNo || idx}`);
        const stallNo = v ? v.stallNo : (sg.stallNo ? (String(sg.stallNo).toLowerCase().includes('stall') ? sg.stallNo : `Stall ${sg.stallNo}`) : 'Stall TBD');
        const commPct = v ? Number(v.commissionPct ?? 15) : 15;
        const subtotal = Number(sg.subtotal || sg.amount || sg.price || 0);
        const commAmt = Math.round((subtotal * (commPct / 100)) * 100) / 100;
        const netPayable = Math.round(Math.max(0, subtotal - commAmt) * 100) / 100;
        const stallBillBookNo = (sg.billBookNo || sg.billCopyNo || rawBillNo).trim();

        calculatedGross += subtotal;
        calculatedCommission += commAmt;

        vendorAllocations.push({
          vendorId: vId,
          vendorName: vName,
          stallNo,
          billBookNo: stallBillBookNo,
          amount: subtotal,
          commissionPct: commPct,
          commissionAmount: commAmt,
          netPayable,
          items: Array.isArray(sg.items) ? sg.items : []
        });
      });
    }

    // Fallback for single-stall direct order if stallGroups was empty
    if (vendorAllocations.length === 0) {
      let v = null;
      if (orderData.vendorId) v = cityVendors.find(item => item.id === orderData.vendorId);
      if (!v && orderData.stallNo) {
        const clean = String(orderData.stallNo).replace(/\D/g, '');
        v = cityVendors.find(item => item.stallNo.replace(/\D/g, '') === clean);
      }
      if (!v && orderData.vendorName) {
        v = cityVendors.find(item => item.name.toLowerCase() === orderData.vendorName.toLowerCase());
      }
      const vId = v ? v.id : (orderData.vendorId || 'v_unknown');
      const vName = v ? v.name : (orderData.vendorName || 'Unassigned Vendor');
      const stallNo = v ? v.stallNo : (orderData.stallNo ? (String(orderData.stallNo).toLowerCase().includes('stall') ? orderData.stallNo : `Stall ${orderData.stallNo}`) : 'Stall TBD');
      const commPct = v ? Number(v.commissionPct ?? 15) : 15;
      const subtotal = Number(orderData.totals?.payable || orderData.totals?.subtotal || orderData.billAmount || 0);
      const commAmt = Math.round((subtotal * (commPct / 100)) * 100) / 100;
      const netPayable = Math.round(Math.max(0, subtotal - commAmt) * 100) / 100;

      calculatedGross = subtotal;
      calculatedCommission = commAmt;

      vendorAllocations.push({
        vendorId: vId,
        vendorName: vName,
        stallNo,
        billBookNo: rawBillNo,
        amount: subtotal,
        commissionPct: commPct,
        commissionAmount: commAmt,
        netPayable,
        items: Array.isArray(orderData.items) ? orderData.items : []
      });
    }

    const grossAmount = calculatedGross || Number(orderData.totals?.payable || orderData.totals?.subtotal || 0);
    const commissionAmount = calculatedCommission;
    const totalPayable = Math.round(Math.max(0, grossAmount - commissionAmount) * 100) / 100;

    const isMultiVendor = vendorAllocations.length > 1;
    const primaryVendor = vendorAllocations[0];

    const newOrder = {
      id: orderData.id || ('ord_' + Date.now() + '_' + Math.floor(100 + Math.random() * 900)),
      billNo: rawBillNo,
      clientOrderRef: clientOrderRef || rawBillNo,
      eventId: 'HPD-' + targetCityId + '-OCT2026',
      cityId: targetCityId,
      customer: {
        name: (orderData.customer?.name || '').trim(),
        phone: (orderData.customer?.phone || '').trim(),
        email: (orderData.customer?.email || '').trim()
      },
      vendorId: isMultiVendor ? 'MULTI' : primaryVendor.vendorId,
      vendorName: isMultiVendor ? `Multi-Vendor (${vendorAllocations.length} Stalls)` : primaryVendor.vendorName,
      stallNo: isMultiVendor ? vendorAllocations.map(a => a.stallNo).join(', ') : primaryVendor.stallNo,
      commissionPct: isMultiVendor ? Math.round((commissionAmount / (grossAmount || 1)) * 100) : primaryVendor.commissionPct,
      items: Array.isArray(orderData.items) ? orderData.items : [],
      stallGroups: rawStallGroups,
      vendorAllocations,
      totals: {
        grossAmount,
        commissionPct: isMultiVendor ? Math.round((commissionAmount / (grossAmount || 1)) * 100) : primaryVendor.commissionPct,
        commissionAmount,
        totalPayable
      },
      payment: {
        method: orderData.payment?.method || 'Razorpay',
        paymentId: paymentId || ('PAY_' + Date.now()),
        status: orderData.payment?.status || 'PAID',
        verifiedVia: orderData.payment?.verifiedVia || 'Razorpay Gateway / POS',
        timestamp: orderData.timestamp || new Date().toISOString()
      },
      status: orderData.status || 'PENDING_APPROVAL',
      shopifySyncStatus: 'NOT_PUSHED',
      shopifyOrderId: null,
      shopifyOrderNumber: null,
      shopifyError: null,
      pushedAt: null,
      pushedBy: null,
      totalPayable,
      amountPaid: 0,
      outstandingBalance: totalPayable,
      payoutStatus: 'UNPAID',
      payoutAllocations: [],
      source: orderData.source || 'Payment Page',
      createdAt: orderData.timestamp || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!this.data.internalOrders) this.data.internalOrders = [];
    this.data.internalOrders.unshift(newOrder);

    // Sync to billRows: create a billRow per vendor allocation so each vendor gets their exact stall amount and bill book number!
    vendorAllocations.forEach((alloc, i) => {
      const rowId = `row_${newOrder.id}_${i + 1}`;
      const billRow = {
        id: rowId,
        cityId: targetCityId,
        eventId: 'HPD-VIJ-OCT2026',
        vendorId: alloc.vendorId,
        billCopyNo: alloc.billBookNo || rawBillNo,
        billAmount: alloc.amount,
        paymentMode: newOrder.payment.method,
        paymentOrderRef: newOrder.payment.paymentId,
        shopifyOrderId: null,
        customerName: newOrder.customer.name,
        mobile: newOrder.customer.phone,
        source: 'Internal Order Flow',
        status: newOrder.status === 'APPROVED' ? 'Paid' : 'Pending Approval',
        isApproved: newOrder.status === 'APPROVED',
        isVoid: false,
        voidReason: null,
        mismatchFlag: false,
        createdAt: newOrder.createdAt,
        internalOrderId: newOrder.id,
        stallNo: alloc.stallNo
      };
      this.data.billRows.unshift(billRow);
    });

    this.logAudit(
      typeof user === 'string' ? user : (user.name || 'Staff'),
      'ORDER_RECORDED',
      'internal_orders',
      newOrder.id,
      'all',
      null,
      `Bill #${rawBillNo} for ₹${grossAmount} (${newOrder.stallNo})`,
      'Recorded internally before Shopify push',
      targetCityId
    );

    this.save();
    return { order: newOrder, isDuplicate: false };
  }

  getInternalOrders(filters = {}) {
    let orders = [...(this.data.internalOrders || [])];
    const targetCityId = normalizeCityCode(filters.cityId || 'VIJ');
    orders = orders.filter(o => (o.cityId || 'VIJ').toUpperCase() === targetCityId);

    if (filters.vendorId && filters.vendorId !== 'all') {
      orders = orders.filter(o => 
        o.vendorId === filters.vendorId || 
        (Array.isArray(o.vendorAllocations) && o.vendorAllocations.some(a => a.vendorId === filters.vendorId))
      );
    }
    if (filters.status && filters.status !== 'all') {
      orders = orders.filter(o => o.status === filters.status);
    }
    if (filters.shopifySyncStatus && filters.shopifySyncStatus !== 'all') {
      orders = orders.filter(o => o.shopifySyncStatus === filters.shopifySyncStatus);
    }
    if (filters.payoutStatus && filters.payoutStatus !== 'all') {
      orders = orders.filter(o => o.payoutStatus === filters.payoutStatus);
    }
    if (filters.startDate || filters.endDate) {
      orders = this.filterByDateRange(orders, 'createdAt', filters.startDate, filters.endDate);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      orders = orders.filter(o => 
        (o.billNo && o.billNo.toLowerCase().includes(q)) ||
        (o.customer?.name && o.customer.name.toLowerCase().includes(q)) ||
        (o.customer?.phone && o.customer.phone.includes(q)) ||
        (o.vendorName && o.vendorName.toLowerCase().includes(q)) ||
        (o.stallNo && o.stallNo.toLowerCase().includes(q)) ||
        (o.shopifyOrderNumber && String(o.shopifyOrderNumber).includes(q))
      );
    }
    return orders;
  }

  getInternalOrderById(id) {
    return (this.data.internalOrders || []).find(o => o.id === id || o.billNo === id);
  }

  updateInternalOrder(id, updates = {}, user = 'Super Admin') {
    const order = this.getInternalOrderById(id);
    if (!order) return null;

    // Optimistic Concurrency Control (Enhancement 8)
    if (updates.expectedUpdatedAt && order.updatedAt && updates.expectedUpdatedAt !== order.updatedAt) {
      const err = new Error('Conflict: Record was modified by another user. Please refresh and review latest changes.');
      err.status = 409;
      throw err;
    }

    const oldSnapshot = JSON.stringify(order);

    if (updates.stallNo !== undefined) order.stallNo = updates.stallNo;
    if (updates.vendorId !== undefined) {
      order.vendorId = updates.vendorId;
      const v = this.data.vendors.find(vend => vend.id === updates.vendorId);
      if (v) {
        order.vendorName = v.name;
        order.stallNo = v.stallNo;
        order.commissionPct = v.commissionPct ?? 15;
        // Recalculate payable
        const gross = order.totals.grossAmount;
        order.totals.commissionPct = order.commissionPct;
        order.totals.commissionAmount = Math.round((gross * (order.commissionPct / 100)) * 100) / 100;
        order.totals.totalPayable = Math.round((gross - order.totals.commissionAmount) * 100) / 100;
        order.totalPayable = order.totals.totalPayable;
        order.outstandingBalance = Math.max(0, order.totalPayable - order.amountPaid);
      }
    }
    if (updates.customer) {
      order.customer = { ...order.customer, ...updates.customer };
    }
    if (updates.items && Array.isArray(updates.items)) {
      order.items = updates.items;
    }
    if (updates.status !== undefined) {
      order.status = updates.status;
    }

    order.updatedAt = new Date().toISOString();

    // Also update all linked billRows (including multi-vendor stall splits) if present
    const linkedBills = (this.data.billRows || []).filter(r => 
      r.internalOrderId === order.id || 
      (order.billNo && r.billCopyNo && (r.billCopyNo === order.billNo || r.billCopyNo.startsWith(order.billNo + '-S')))
    );
    linkedBills.forEach(linkedBill => {
      if (order.customer) {
        linkedBill.customerName = order.customer.name;
        linkedBill.mobile = order.customer.phone;
      }
      if (!order.vendorAllocations || order.vendorAllocations.length <= 1) {
        if (order.vendorId && order.vendorId !== 'MULTI') {
          linkedBill.vendorId = order.vendorId;
        }
      }
    });

    this.logAudit(
      typeof user === 'string' ? user : (user.name || 'Super Admin'),
      'ORDER_EDITED',
      'internal_orders',
      order.id,
      'multiple',
      oldSnapshot.slice(0, 80),
      JSON.stringify(updates),
      'Super Admin corrected order details before Shopify push'
    );

    this.save();
    return order;
  }

  markOrderPushed(id, { shopifyOrderId, shopifyOrderNumber, pushedBy, syncResult }) {
    const order = this.getInternalOrderById(id);
    if (!order) return null;

    order.status = 'APPROVED';
    order.shopifySyncStatus = 'PUSHED';
    order.shopifyOrderId = String(shopifyOrderId);
    order.shopifyOrderNumber = shopifyOrderNumber;
    order.pushedAt = new Date().toISOString();
    order.pushedBy = typeof pushedBy === 'string' ? pushedBy : (pushedBy?.name || 'Super Admin');
    order.shopifyError = null;
    order.updatedAt = new Date().toISOString();

    // Also update ALL linked billRows (including multi-vendor stall splits) so they enter official settlement calculations
    const linkedBills = (this.data.billRows || []).filter(r => 
      r.internalOrderId === order.id || 
      (order.billNo && r.billCopyNo && (r.billCopyNo === order.billNo || r.billCopyNo.startsWith(order.billNo + '-S')))
    );
    linkedBills.forEach(linkedBill => {
      linkedBill.shopifyOrderId = order.shopifyOrderId;
      linkedBill.isApproved = true;
      linkedBill.status = 'Paid';
    });

    this.logAudit(
      order.pushedBy,
      'PUSH_TO_SHOPIFY_SUCCESS',
      'internal_orders',
      order.id,
      'shopifyOrderId',
      null,
      `${shopifyOrderNumber} (ID: ${shopifyOrderId})`,
      'Successfully pushed approved internal order to Shopify'
    );

    this.save();
    return order;
  }

  markOrderPushFailed(id, { error, pushedBy }) {
    const order = this.getInternalOrderById(id);
    if (!order) return null;

    order.shopifySyncStatus = 'FAILED';
    order.shopifyError = error || 'Shopify creation rejected';
    order.updatedAt = new Date().toISOString();

    this.logAudit(
      typeof pushedBy === 'string' ? pushedBy : (pushedBy?.name || 'Super Admin'),
      'PUSH_TO_SHOPIFY_FAILED',
      'internal_orders',
      order.id,
      'shopifySyncStatus',
      'NOT_PUSHED',
      'FAILED',
      `Shopify push failed: ${error}`
    );

    this.save();
    return order;
  }

  rejectInternalOrder(id, reason = 'Rejected by Super Admin', user = 'Super Admin') {
    const order = this.getInternalOrderById(id);
    if (!order) return null;

    order.status = 'REJECTED';
    order.rejectionReason = reason;
    order.rejectedBy = typeof user === 'string' ? user : (user?.name || 'Super Admin');
    order.rejectedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();

    const linkedBill = (this.data.billRows || []).find(r => r.internalOrderId === order.id || r.billCopyNo === order.billNo);
    if (linkedBill) {
      linkedBill.isVoid = true;
      linkedBill.isApproved = false;
      linkedBill.voidReason = reason;
      linkedBill.status = 'Rejected';
    }

    this.logAudit(
      order.rejectedBy,
      'ORDER_REJECTED',
      'internal_orders',
      order.id,
      'status',
      'PENDING_APPROVAL',
      'REJECTED',
      reason
    );

    this.save();
    return order;
  }

  // -------------------------------------------------------------
  // Order-Linked Payouts & Partial Settlements (Krishna's Requirement)
  // -------------------------------------------------------------
  getUnpaidOrdersForVendor(vendorId, options = {}) {
    if (!vendorId) return [];

    const vendor = this.data.vendors.find(v => v.id === vendorId);
    const targetCityId = ((options && options.cityId) || (vendor && vendor.cityId) || 'VIJ').toUpperCase();
    const commPct = vendor ? Number(vendor.commissionPct ?? 15) : 15;

    const results = [];
    const internalOrders = (this.data.internalOrders || []).filter(o => (o.cityId || 'VIJ').toUpperCase() === targetCityId);
    
    internalOrders.forEach(o => {
      const cleanBill = formatBillCopy(o.billNo);
      if (o.vendorId === vendorId) {
        if (o.outstandingBalance > 0.01) {
          const gross = Number(o.totals?.grossAmount || o.totals?.payable || 0);
          const commAmt = Math.round((gross * (commPct / 100)) * 100) / 100;
          results.push({
            orderId: o.id,
            allocationId: o.id,
            billNo: cleanBill,
            billCopyDisplay: cleanBill,
            systemRef: o.clientOrderRef || o.billNo,
            type: 'internal_order',
            date: o.createdAt,
            createdAt: o.createdAt,
            customerName: o.customer?.name || 'Walk-in',
            grossAmount: gross,
            commissionPct: commPct,
            commissionAmount: commAmt,
            totalPayable: o.totalPayable,
            amountPaid: o.amountPaid || 0,
            outstandingBalance: o.outstandingBalance,
            payoutStatus: o.payoutStatus || 'UNPAID',
            shopifyOrderNumber: o.shopifyOrderNumber || '-'
          });
        }
      } else if (Array.isArray(o.vendorAllocations)) {
        const alloc = o.vendorAllocations.find(a => a.vendorId === vendorId);
        if (alloc) {
          const allocGross = Number(alloc.amount || 0);
          const allocComm = Math.round((allocGross * ((alloc.commissionPct || commPct) / 100)) * 100) / 100;
          const allocPayable = alloc.netPayable || Math.round(Math.max(0, allocGross - allocComm) * 100) / 100;
          const allocPaid = alloc.amountPaid || 0;
          const allocBal = Math.round(Math.max(0, allocPayable - allocPaid) * 100) / 100;
          if (allocBal > 0.01) {
            const allocCleanBill = formatBillCopy(alloc.billBookNo || o.billNo);
            results.push({
              orderId: o.id,
              allocationId: `${o.id}_alloc_${alloc.vendorId}`,
              billNo: allocCleanBill,
              billCopyDisplay: allocCleanBill,
              systemRef: alloc.billBookNo || o.clientOrderRef || o.billNo,
              type: 'internal_order_allocation',
              date: o.createdAt,
              createdAt: o.createdAt,
              customerName: o.customer?.name || 'Walk-in',
              grossAmount: allocGross,
              commissionPct: alloc.commissionPct || commPct,
              commissionAmount: allocComm,
              totalPayable: allocPayable,
              amountPaid: allocPaid,
              outstandingBalance: allocBal,
              payoutStatus: allocPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
              shopifyOrderNumber: o.shopifyOrderNumber || '-'
            });
          }
        }
      }
    });

    const allInternalIds = new Set(internalOrders.map(o => o.id));
    const allInternalBillNos = new Set(internalOrders.map(o => o.billNo));
    
    const vendorBills = (this.data.billRows || []).filter(r => 
      (r.cityId || 'VIJ').toUpperCase() === targetCityId &&
      r.vendorId === vendorId && 
      !r.isVoid && 
      !allInternalIds.has(r.internalOrderId) && 
      !allInternalIds.has(r.id) &&
      !allInternalBillNos.has(r.billCopyNo)
    );

    vendorBills.forEach(r => {
      const gross = Number(r.billAmount || 0);
      const commAmt = Math.round((gross * (commPct / 100)) * 100) / 100;
      const payable = Math.round(Math.max(0, gross - commAmt) * 100) / 100;
      const paid = Number(r.amountPaid || 0);
      const balance = Math.round(Math.max(0, payable - paid) * 100) / 100;
      if (balance > 0.01) {
        const cleanBill = formatBillCopy(r.billCopyNo || r.id);
        results.push({
          orderId: r.id,
          allocationId: r.id,
          billNo: cleanBill,
          billCopyDisplay: cleanBill,
          systemRef: r.billCopyNo || r.id,
          type: 'bill_row',
          date: r.createdAt,
          createdAt: r.createdAt,
          customerName: r.customerName || 'Walk-in',
          grossAmount: gross,
          commissionPct: commPct,
          commissionAmount: commAmt,
          totalPayable: payable,
          amountPaid: paid,
          outstandingBalance: balance,
          payoutStatus: paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
          shopifyOrderNumber: r.shopifyOrderId || '-'
        });
      }
    });

    results.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
    return results;
  }

  recordOrderPayout({ vendorId, allocations, orderAllocations, amount, paymentMode, referenceUtr, referenceNumber, notes, note, adminUser, date }) {
    const vendor = this.data.vendors.find(v => v.id === vendorId);
    if (!vendor) throw new Error('Vendor not found.');

    const rawAlloc = allocations || orderAllocations || [];
    const normalizedAllocations = rawAlloc.map(a => ({
      ...a,
      amount: Number(a.amount !== undefined ? a.amount : (a.allocatedAmount ?? 0))
    }));

    const totalAllocated = normalizedAllocations.reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const totalAmount = Number(amount || totalAllocated);

    if (totalAmount <= 0) {
      throw new Error('Payout amount must be greater than zero.');
    }

    if (Math.abs(totalAllocated - totalAmount) > 0.01) {
      throw new Error(`Allocated sum (₹${totalAllocated}) must equal payout amount (₹${totalAmount}).`);
    }

    const targetCityId = (vendor.cityId || 'VIJ').toUpperCase();
    const payoutId = 'pay_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const payoutDate = date || new Date().toISOString();
    const adminName = typeof adminUser === 'string' ? adminUser : (adminUser?.name || 'Super Admin');

    // Process each allocation
    const processedAllocations = [];
    for (const alloc of normalizedAllocations) {
      const allocAmt = Number(alloc.amount);
      if (allocAmt <= 0) continue;

      let matchedInternal = (this.data.internalOrders || []).find(o => o.id === alloc.orderId || o.billNo === alloc.billNo);
      if (matchedInternal) {
        // If order has vendorAllocations, update the specific vendor allocation
        if (Array.isArray(matchedInternal.vendorAllocations)) {
          const allocMatch = matchedInternal.vendorAllocations.find(a => a.vendorId === vendorId);
          if (allocMatch) {
            const allocPayable = allocMatch.netPayable || Math.round((allocMatch.amount * (1 - (allocMatch.commissionPct / 100))) * 100) / 100;
            const currentPaid = allocMatch.amountPaid || 0;
            const allocBal = Math.round(Math.max(0, allocPayable - currentPaid) * 100) / 100;
            if (allocAmt > allocBal + 0.01) {
              throw new Error(`Allocation ₹${allocAmt} exceeds outstanding balance ₹${allocBal} for Bill #${matchedInternal.billNo}`);
            }
            allocMatch.amountPaid = Math.round((currentPaid + allocAmt) * 100) / 100;
            allocMatch.outstandingBalance = Math.round(Math.max(0, allocPayable - allocMatch.amountPaid) * 100) / 100;
            allocMatch.payoutStatus = allocMatch.outstandingBalance <= 0.01 ? 'FULLY_PAID' : 'PARTIALLY_PAID';
          }
        }

        if (matchedInternal.vendorId === vendorId) {
          if (allocAmt > matchedInternal.outstandingBalance + 0.01) {
            throw new Error(`Allocation ₹${allocAmt} exceeds outstanding balance ₹${matchedInternal.outstandingBalance} for Bill #${matchedInternal.billNo}`);
          }
          matchedInternal.amountPaid = Math.round((matchedInternal.amountPaid + allocAmt) * 100) / 100;
          matchedInternal.outstandingBalance = Math.round(Math.max(0, matchedInternal.totalPayable - matchedInternal.amountPaid) * 100) / 100;
          matchedInternal.payoutStatus = (matchedInternal.outstandingBalance <= 0.01) ? 'FULLY_PAID' : 'PARTIALLY_PAID';
        }

        if (!matchedInternal.payoutAllocations) matchedInternal.payoutAllocations = [];
        matchedInternal.payoutAllocations.push({
          payoutId,
          amount: allocAmt,
          date: payoutDate,
          reference: referenceUtr || '',
          recordedBy: adminName
        });
        processedAllocations.push({
          orderId: matchedInternal.id,
          billNo: matchedInternal.billNo,
          amount: allocAmt,
          remainingBalance: matchedInternal.outstandingBalance,
          payoutStatus: matchedInternal.payoutStatus
        });
      } else {
        // Fallback for historical billRows
        let matchedBill = (this.data.billRows || []).find(r => r.id === alloc.orderId || r.billCopyNo === alloc.billNo);
        if (matchedBill) {
          const commPct = Number(vendor.commissionPct ?? 15);
          const payable = Math.round((Number(matchedBill.billAmount || 0) * (1 - (commPct / 100))) * 100) / 100;
          const currentPaid = Number(matchedBill.amountPaid || 0);
          const balance = Math.round(Math.max(0, payable - currentPaid) * 100) / 100;
          if (allocAmt > balance + 0.01) {
            throw new Error(`Allocation ₹${allocAmt} exceeds outstanding balance ₹${balance} for Bill #${matchedBill.billCopyNo}`);
          }
          matchedBill.amountPaid = Math.round((currentPaid + allocAmt) * 100) / 100;
          matchedBill.outstandingBalance = Math.round(Math.max(0, payable - matchedBill.amountPaid) * 100) / 100;
          matchedBill.payoutStatus = (matchedBill.outstandingBalance <= 0.01) ? 'FULLY_PAID' : 'PARTIALLY_PAID';
          processedAllocations.push({
            orderId: matchedBill.id,
            billNo: matchedBill.billCopyNo,
            amount: allocAmt,
            remainingBalance: matchedBill.outstandingBalance,
            payoutStatus: matchedBill.payoutStatus
          });
        } else {
          throw new Error(`Order #${alloc.orderId || alloc.billNo} not found for allocation.`);
        }
      }
    }

    const payoutRecord = {
      id: payoutId,
      vendorId,
      vendorName: vendor.name,
      stallNo: vendor.stallNo,
      amount: totalAmount,
      mode: paymentMode || 'NEFT',
      reference: referenceUtr || `PAY-${Date.now()}`,
      notes: notes || '',
      allocations: processedAllocations,
      date: payoutDate,
      paidBy: adminName,
      createdAt: new Date().toISOString()
    };

    if (!this.data.payouts) this.data.payouts = [];
    this.data.payouts.unshift(payoutRecord);

    this.logAudit(
      adminName,
      'ORDER_PAYOUT_RECORDED',
      'payouts',
      payoutId,
      'allocations',
      null,
      `₹${totalAmount} allocated across ${processedAllocations.length} order(s) for ${vendor.name}`,
      notes || 'Order-linked payout settlement'
    );

    this.save();
    return payoutRecord;
  }

  // -------------------------------------------------------------
  // Vendor Master Management (CRUD with Soft Deactivation)
  // -------------------------------------------------------------
  getVendors(options = false) {
    if (!this.data.vendors) return [];
    let includeInactive = false;
    let targetCityId = 'VIJ';

    if (typeof options === 'boolean') {
      includeInactive = options;
    } else if (typeof options === 'object' && options !== null) {
      includeInactive = Boolean(options.includeInactive);
      if (options.cityId) targetCityId = normalizeCityCode(options.cityId);
    }

    let list = this.data.vendors.filter(v => (v.cityId || 'VIJ').toUpperCase() === targetCityId);
    if (!includeInactive) list = list.filter(v => v.active !== false);
    return list;
  }

  getVendorById(vendorId) {
    if (!this.data.vendors) return null;
    return this.data.vendors.find(v => v.id === vendorId) || null;
  }

  addVendor(vendorData, user = 'Super Admin') {
    const name = (vendorData.name || '').trim();
    if (!name) throw new Error('Vendor name is required.');

    const targetCityId = normalizeCityCode(vendorData.cityId);
    const stallNo = (vendorData.stallNo || 'Stall TBD').trim();
    const code = (vendorData.code || name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()).trim();
    const id = vendorData.id || `v_${code}_${Date.now().toString().slice(-4)}`;

    const newVendor = {
      id,
      cityId: targetCityId,
      eventId: 'HPD-' + targetCityId + '-OCT2026',
      stallNo: stallNo.toLowerCase().includes('stall') ? stallNo : `Stall ${stallNo}`,
      name,
      code,
      category: vendorData.category || 'Retail',
      webkulSellerId: `WK-${code}`,
      commissionPct: Number(vendorData.commissionPct ?? 15.0),
      phone: vendorData.phone || '',
      upiId: vendorData.upiId || '',
      bankDetails: vendorData.bankDetails || '',
      active: true,
      createdAt: new Date().toISOString()
    };

    if (!this.data.vendors) this.data.vendors = [];
    this.data.vendors.push(newVendor);

    this.logAudit(
      typeof user === 'string' ? user : (user.name || 'Super Admin'),
      'VENDOR_CREATED',
      'vendors',
      newVendor.id,
      'all',
      null,
      `${newVendor.name} (${newVendor.stallNo})`,
      'Vendor added to directory',
      targetCityId
    );

    this.save();
    return newVendor;
  }

  updateVendor(vendorId, updates = {}, user = 'Super Admin') {
    const vendor = this.data.vendors.find(v => v.id === vendorId);
    if (!vendor) throw new Error('Vendor not found.');

    const oldName = vendor.name;
    const oldStall = vendor.stallNo;

    if (updates.name) vendor.name = updates.name.trim();
    if (updates.stallNo) {
      const s = updates.stallNo.trim();
      vendor.stallNo = s.toLowerCase().includes('stall') ? s : `Stall ${s}`;
    }
    if (updates.code) vendor.code = updates.code.trim().toUpperCase();
    if (updates.category) vendor.category = updates.category.trim();
    if (updates.phone !== undefined) vendor.phone = updates.phone.trim();
    if (updates.upiId !== undefined) vendor.upiId = updates.upiId.trim();
    if (updates.bankDetails !== undefined) vendor.bankDetails = updates.bankDetails.trim();
    if (updates.cityId) vendor.cityId = updates.cityId.trim().toUpperCase();

    this.logAudit(
      typeof user === 'string' ? user : (user.name || 'Super Admin'),
      'VENDOR_UPDATED',
      'vendors',
      vendor.id,
      'profile',
      `${oldName} (${oldStall})`,
      `${vendor.name} (${vendor.stallNo})`,
      'Updated vendor details',
      vendor.cityId
    );

    this.save();
    return vendor;
  }

  toggleVendorStatus(vendorId, active, user = 'Super Admin') {
    const vendor = this.data.vendors.find(v => v.id === vendorId);
    if (!vendor) throw new Error('Vendor not found.');

    const oldStatus = vendor.active !== false ? 'Active' : 'Deactivated';
    vendor.active = Boolean(active);
    const newStatus = vendor.active ? 'Active' : 'Deactivated';

    this.logAudit(
      typeof user === 'string' ? user : (user.name || 'Super Admin'),
      'VENDOR_STATUS_CHANGE',
      'vendors',
      vendor.id,
      'active',
      oldStatus,
      newStatus,
      `Vendor ${newStatus.toLowerCase()} by admin`,
      vendor.cityId
    );

    this.save();
    return vendor;
  }

  bulkUpdateVendors(vendorIds, action, value, user = 'Super Admin') {
    if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
      throw new Error('At least one vendor must be selected.');
    }

    let updatedCount = 0;
    vendorIds.forEach(vId => {
      const v = this.data.vendors.find(item => item.id === vId);
      if (v) {
        if (action === 'activate') {
          v.active = true;
          updatedCount++;
        } else if (action === 'deactivate') {
          v.active = false;
          updatedCount++;
        } else if (action === 'commission') {
          const num = parseFloat(value);
          if (!isNaN(num) && num >= 0 && num <= 100) {
            v.commissionPct = num;
            updatedCount++;
          }
        }
      }
    });

    this.logAudit(
      typeof user === 'string' ? user : (user.name || 'Super Admin'),
      'VENDORS_BULK_UPDATE',
      'vendors',
      'bulk',
      action,
      '',
      `${updatedCount} vendors updated (${action})`,
      `Bulk action: ${action}`
    );

    this.save();
    return { updatedCount };
  }

  bulkImportVendors(vendorsList, user = 'Super Admin', cityId = 'VIJ') {
    if (!Array.isArray(vendorsList) || vendorsList.length === 0) {
      throw new Error('No valid vendors found to import.');
    }

    const targetCityId = (cityId || 'VIJ').toUpperCase();
    const createdList = [];
    vendorsList.forEach((row, i) => {
      const name = (row.name || row.vendorName || '').trim();
      if (!name) return;

      const stallNoRaw = (row.stallNo || row.stall || `Stall ${i + 1}`).toString().trim();
      const stallNo = stallNoRaw.toLowerCase().includes('stall') ? stallNoRaw : `Stall ${stallNoRaw}`;
      const code = (row.code || name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()).trim();
      const id = `v_${code}_${Date.now().toString().slice(-4)}_${i}`;

      const vendor = {
        id,
        cityId: targetCityId,
        eventId: 'HPD-' + targetCityId + '-OCT2026',
        stallNo,
        name,
        code,
        category: row.category || 'Retail',
        webkulSellerId: `WK-${code}`,
        commissionPct: Number(row.commissionPct ?? 15.0),
        phone: row.phone || '',
        upiId: row.upiId || '',
        bankDetails: row.bankDetails || '',
        active: true,
        createdAt: new Date().toISOString()
      };

      this.data.vendors.push(vendor);
      createdList.push(vendor);
    });

    this.logAudit(
      typeof user === 'string' ? user : (user.name || 'Super Admin'),
      'VENDORS_BULK_IMPORT',
      'vendors',
      'bulk_import',
      'all',
      null,
      `Imported ${createdList.length} vendors for ${targetCityId}`,
      'Excel/CSV bulk import',
      targetCityId
    );

    this.save();
    return createdList;
  }

  // City Management Methods
  getCities() {
    return this.data.cities || defaultCities;
  }

  getCityById(id) {
    if (!id) return null;
    const clean = id.toUpperCase();
    return (this.data.cities || defaultCities).find(c => c.id.toUpperCase() === clean || c.code.toUpperCase() === clean) || null;
  }

  addCity(cityData, user = 'Super Admin') {
    const name = (cityData.name || '').trim();
    if (!name) throw new Error('City name is required.');
    const code = (cityData.id || cityData.code || name.slice(0, 3)).trim().toUpperCase();
    if ((this.data.cities || []).some(c => c.id === code || c.code === code)) {
      throw new Error(`City with code "${code}" already exists.`);
    }
    const newCity = {
      id: code,
      code,
      name,
      eventName: cityData.eventName || `Half Price Days ${name} Expo`,
      venue: cityData.venue || `${name} Exhibition Centre`,
      dates: cityData.dates || 'Upcoming',
      defaultCommissionPct: Number(cityData.defaultCommissionPct ?? 15.0),
      isActive: true,
      createdAt: new Date().toISOString()
    };
    if (!this.data.cities) this.data.cities = [...defaultCities];
    this.data.cities.push(newCity);
    this.logAudit(
      typeof user === 'string' ? user : (user.name || 'Super Admin'),
      'CITY_ADDED',
      'cities',
      newCity.id,
      'all',
      null,
      `${newCity.name} (${newCity.code})`,
      'New city added to HalfPe Event Network',
      newCity.id
    );
    this.save();
    return newCity;
  }

  getUsers() {
    return this.data.users || [];
  }

  getUserById(id) {
    return (this.data.users || []).find(u => u.id === id);
  }

  getUserByEmail(email) {
    if (!email) return null;
    return (this.data.users || []).find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  addUser(userData, adminUser = 'Super Admin') {
    const email = (userData.email || '').trim().toLowerCase();
    if (!email) throw new Error('Email is required.');
    if (this.getUserByEmail(email)) {
      throw new Error(`User with email "${email}" already exists.`);
    }
    const name = (userData.name || '').trim();
    if (!name) throw new Error('Name is required.');
    const password = (userData.password || '').trim();
    if (!password) throw new Error('Password is required.');

    const designation = (userData.designation || 'Staff Member').trim();
    const role = userData.role || 'custom';
    const scopes = Array.isArray(userData.scopes) && userData.scopes.length > 0
      ? userData.scopes
      : (role === 'super_admin' ? ALL_SCOPES.map(s => s.id) : ['overall_settlement', 'vendor_wise']);
    
    const newUser = {
      id: 'usr_' + Date.now().toString().slice(-6),
      name,
      email,
      password,
      designation,
      role,
      vendorId: userData.vendorId || null,
      scopes,
      active: true,
      createdBy: typeof adminUser === 'string' ? adminUser : (adminUser?.name || 'Super Admin'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!this.data.users) this.data.users = [];
    this.data.users.push(newUser);

    this.logAudit(
      typeof adminUser === 'string' ? adminUser : (adminUser?.name || 'Super Admin'),
      'USER_CREATED',
      'users',
      newUser.id,
      'credentials',
      null,
      `${newUser.name} (${newUser.email}) - ${newUser.designation} [${newUser.role}]`,
      `Created user account with ${scopes.length} access scopes`
    );

    this.save();
    return newUser;
  }

  updateUser(id, updates = {}, adminUser = 'Super Admin') {
    const user = this.getUserById(id);
    if (!user) throw new Error('User not found.');

    const oldSnapshot = `${user.name} (${user.email}) - ${user.designation} [${user.role}]`;

    if (updates.name) user.name = updates.name.trim();
    if (updates.email) {
      const newEmail = updates.email.trim().toLowerCase();
      const existing = this.getUserByEmail(newEmail);
      if (existing && existing.id !== user.id) {
        throw new Error(`Email "${newEmail}" is already in use by another user.`);
      }
      user.email = newEmail;
    }
    if (updates.password && updates.password.trim()) {
      user.password = updates.password.trim();
    }
    if (updates.designation !== undefined) {
      user.designation = updates.designation.trim();
    }
    if (updates.role !== undefined) {
      user.role = updates.role;
    }
    if (updates.vendorId !== undefined) {
      user.vendorId = updates.vendorId || null;
    }
    if (Array.isArray(updates.scopes)) {
      user.scopes = updates.scopes;
    }
    if (updates.active !== undefined) {
      user.active = !!updates.active;
    }
    user.updatedAt = new Date().toISOString();

    this.logAudit(
      typeof adminUser === 'string' ? adminUser : (adminUser?.name || 'Super Admin'),
      'USER_UPDATED',
      'users',
      user.id,
      'details',
      oldSnapshot,
      `${user.name} (${user.email}) - ${user.designation} [${user.role}]`,
      updates.password ? 'User details and password updated' : 'User profile & scopes updated'
    );

    this.save();
    return user;
  }

  toggleUserStatus(id, active, adminUser = 'Super Admin') {
    const user = this.getUserById(id);
    if (!user) throw new Error('User not found.');
    if (user.role === 'super_admin') {
      throw new Error('Super Admin account cannot be deactivated.');
    }

    user.active = !!active;
    user.updatedAt = new Date().toISOString();

    this.logAudit(
      typeof adminUser === 'string' ? adminUser : (adminUser?.name || 'Super Admin'),
      active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      'users',
      user.id,
      'active',
      String(!active),
      String(active),
      active ? 'User access restored' : 'User access suspended'
    );

    this.save();
    return user;
  }
}

const storeInstance = new Store();
Store.prototype.formatBillCopy = formatBillCopy;
storeInstance.formatBillCopy = formatBillCopy;
storeInstance.ALL_SCOPES = ALL_SCOPES;
module.exports = storeInstance;
module.exports.formatBillCopy = formatBillCopy;
