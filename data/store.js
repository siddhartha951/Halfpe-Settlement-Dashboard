const fs = require('fs');
const path = require('path');
const ShopifyClient = require('./shopify-client');

const DB_PATH = path.join(__dirname, 'database.json');
const SEED_PATH = path.join(__dirname, 'database.seed.json');

// Default Vijayawada Event Seed
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
        if (parsed.vendors) {
          parsed.vendors.forEach(v => {
            if (v.active === undefined) v.active = true;
          });
        }
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
   * Initializes users, credentials, designations, and permissions
   */
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

    const nonVoidBills = vendorBills.filter(r => !r.isVoid && r.isApproved !== false);
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

  getAuditLogs(filters = {}) {
    let logs = this.data.auditLog || [];
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
    const rawBillNo = (orderData.billNo || orderData.bill_number || `VIJ-${Date.now().toString().slice(-5)}`).trim();
    const paymentId = (orderData.payment && (orderData.payment.paymentId || orderData.payment.razorpay_payment_id)) || '';
    const clientOrderRef = orderData.clientOrderRef ? String(orderData.clientOrderRef).trim() : '';

    // Idempotency: strictly check by paymentId or explicit clientOrderRef (Enhancement 10)
    // Never reject multiple orders for the same phone number or customer!
    let existing = null;
    if (paymentId) {
      existing = (this.data.internalOrders || []).find(o => o.payment && o.payment.paymentId === paymentId);
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
      : (Array.isArray(orderData.items) && orderData.items.length > 0 ? this._groupItemsByStall(orderData.items) : []);

    let vendorAllocations = [];
    let calculatedGross = 0;
    let calculatedCommission = 0;

    if (rawStallGroups.length > 0) {
      rawStallGroups.forEach((sg, idx) => {
        let v = null;
        if (sg.vendorId) v = this.data.vendors.find(item => item.id === sg.vendorId);
        if (!v && sg.stallNo) {
          const clean = String(sg.stallNo).replace(/\D/g, '');
          v = this.data.vendors.find(item => item.stallNo.replace(/\D/g, '') === clean);
        }
        if (!v && sg.vendorName) {
          v = this.data.vendors.find(item => item.name.toLowerCase() === sg.vendorName.toLowerCase());
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
      if (orderData.vendorId) v = this.data.vendors.find(item => item.id === orderData.vendorId);
      if (!v && orderData.stallNo) {
        const clean = String(orderData.stallNo).replace(/\D/g, '');
        v = this.data.vendors.find(item => item.stallNo.replace(/\D/g, '') === clean);
      }
      if (!v && orderData.vendorName) {
        v = this.data.vendors.find(item => item.name.toLowerCase() === orderData.vendorName.toLowerCase());
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
      id: 'ord_' + Date.now() + '_' + Math.floor(100 + Math.random() * 900),
      billNo: rawBillNo,
      clientOrderRef: clientOrderRef || rawBillNo,
      eventId: 'HPD-VIJ-OCT2026',
      customer: {
        name: (orderData.customer?.name || 'Walk-in Shopper').trim(),
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
      'Recorded internally before Shopify push'
    );

    this.save();
    return { order: newOrder, isDuplicate: false };
  }

  getInternalOrders(filters = {}) {
    let orders = [...(this.data.internalOrders || [])];

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

    // Also update linked billRow if present
    const linkedBill = (this.data.billRows || []).find(r => r.internalOrderId === order.id || r.billCopyNo === order.billNo);
    if (linkedBill) {
      linkedBill.vendorId = order.vendorId;
      linkedBill.customerName = order.customer.name;
      linkedBill.mobile = order.customer.phone;
    }

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

    // Also update linked billRow so it enters official settlement calculations
    const linkedBill = (this.data.billRows || []).find(r => r.internalOrderId === order.id || r.billCopyNo === order.billNo);
    if (linkedBill) {
      linkedBill.shopifyOrderId = order.shopifyOrderId;
      linkedBill.isApproved = true;
      linkedBill.status = 'Paid';
    }

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
  getUnpaidOrdersForVendor(vendorId) {
    if (!vendorId) return [];

    const results = [];
    const internalOrders = (this.data.internalOrders || []);
    
    internalOrders.forEach(o => {
      if (o.vendorId === vendorId) {
        if (o.outstandingBalance > 0.01) {
          results.push({
            orderId: o.id,
            billNo: o.billNo,
            type: 'internal_order',
            date: o.createdAt,
            customerName: o.customer?.name || 'Walk-in',
            grossAmount: o.totals?.grossAmount || 0,
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
          const allocPayable = alloc.netPayable || Math.round((alloc.amount * (1 - (alloc.commissionPct / 100))) * 100) / 100;
          const allocPaid = alloc.amountPaid || 0;
          const allocBal = Math.round(Math.max(0, allocPayable - allocPaid) * 100) / 100;
          if (allocBal > 0.01) {
            results.push({
              orderId: o.id,
              billNo: alloc.billBookNo || o.billNo,
              type: 'internal_order_allocation',
              date: o.createdAt,
              customerName: o.customer?.name || 'Walk-in',
              grossAmount: alloc.amount,
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

    // Also look at billRows ONLY if bills are not already tracked in internalOrders
    const allInternalIds = new Set((this.data.internalOrders || []).map(o => o.id));
    const allInternalBillNos = new Set((this.data.internalOrders || []).map(o => o.billNo));
    
    const vendorBills = (this.data.billRows || []).filter(r => 
      r.vendorId === vendorId && 
      !r.isVoid && 
      !allInternalIds.has(r.internalOrderId) && 
      !allInternalIds.has(r.id) &&
      !allInternalBillNos.has(r.billCopyNo)
    );
    
    const vendor = this.data.vendors.find(v => v.id === vendorId);
    const commPct = vendor ? Number(vendor.commissionPct ?? 15) : 15;

    vendorBills.forEach(r => {
      const gross = Number(r.billAmount || 0);
      const payable = Math.round((gross * (1 - (commPct / 100))) * 100) / 100;
      const paid = Number(r.amountPaid || 0);
      const balance = Math.round(Math.max(0, payable - paid) * 100) / 100;
      if (balance > 0.01) {
        results.push({
          orderId: r.id,
          billNo: r.billCopyNo || r.id,
          type: 'bill_row',
          date: r.createdAt,
          customerName: r.customerName || 'Walk-in',
          grossAmount: gross,
          totalPayable: payable,
          amountPaid: paid,
          outstandingBalance: balance,
          payoutStatus: paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
          shopifyOrderNumber: r.shopifyOrderId || '-'
        });
      }
    });

    // Prioritize orders with highest outstanding balance first
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
  getVendors(includeInactive = false) {
    if (!this.data.vendors) return [];
    if (includeInactive) return this.data.vendors;
    return this.data.vendors.filter(v => v.active !== false);
  }

  getVendorById(vendorId) {
    if (!this.data.vendors) return null;
    return this.data.vendors.find(v => v.id === vendorId) || null;
  }

  addVendor(vendorData, user = 'Super Admin') {
    const name = (vendorData.name || '').trim();
    if (!name) throw new Error('Vendor name is required.');

    const stallNo = (vendorData.stallNo || 'Stall TBD').trim();
    const code = (vendorData.code || name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()).trim();
    const id = `v_${code}_${Date.now().toString().slice(-4)}`;

    const newVendor = {
      id,
      eventId: 'HPD-VIJ-OCT2026',
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
      'Vendor added to directory'
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
    if (updates.category) vendor.category = updates.category.trim();
    if (updates.commissionPct !== undefined) vendor.commissionPct = Number(updates.commissionPct);
    if (updates.phone !== undefined) vendor.phone = updates.phone.trim();
    if (updates.upiId !== undefined) vendor.upiId = updates.upiId.trim();
    if (updates.bankDetails !== undefined) vendor.bankDetails = updates.bankDetails.trim();
    vendor.updatedAt = new Date().toISOString();

    this.logAudit(
      typeof user === 'string' ? user : (user.name || 'Super Admin'),
      'VENDOR_UPDATED',
      'vendors',
      vendor.id,
      'details',
      `${oldName} (${oldStall})`,
      `${vendor.name} (${vendor.stallNo})`,
      'Vendor master details updated'
    );

    this.save();
    return vendor;
  }

  toggleVendorStatus(vendorId, active, user = 'Super Admin') {
    const vendor = this.data.vendors.find(v => v.id === vendorId);
    if (!vendor) throw new Error('Vendor not found.');

    vendor.active = !!active;
    vendor.updatedAt = new Date().toISOString();

    this.logAudit(
      typeof user === 'string' ? user : (user.name || 'Super Admin'),
      active ? 'VENDOR_ACTIVATED' : 'VENDOR_DEACTIVATED',
      'vendors',
      vendor.id,
      'active',
      String(!active),
      String(active),
      active ? 'Vendor activated in registry' : 'Vendor soft-deactivated/archived to preserve settlement history'
    );

    this.save();
    return vendor;
  }

  // -------------------------------------------------------------
  // User Management & RBAC Scopes (Krishna's Super Admin Master)
  // -------------------------------------------------------------
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
storeInstance.ALL_SCOPES = ALL_SCOPES;
module.exports = storeInstance;
