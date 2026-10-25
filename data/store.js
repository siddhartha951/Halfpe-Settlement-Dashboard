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

  // -------------------------------------------------------------
  // Internal Orders Management (Krishna's New Staging OMS)
  // -------------------------------------------------------------
  recordInternalOrder(orderData, user = 'POS Billing Terminal') {
    const billNo = (orderData.billNo || orderData.bill_number || `VIJ-${Date.now().toString().slice(-5)}`).trim();
    const paymentId = (orderData.payment && (orderData.payment.paymentId || orderData.payment.razorpay_payment_id)) || '';

    // Idempotency: check if already exists by billNo or paymentId
    const existing = (this.data.internalOrders || []).find(o => 
      o.billNo === billNo || (paymentId && o.payment && o.payment.paymentId === paymentId)
    );
    if (existing) {
      console.log(`[Store] Duplicate internal order submission prevented for ${billNo}`);
      return { order: existing, isDuplicate: true };
    }

    // Resolve Vendor from root, stallGroups or items
    let vendor = null;
    const candidateVendorId = orderData.vendorId || (orderData.stallGroups?.[0]?.vendorId) || (orderData.items?.[0]?.vendorId);
    const candidateStallNo = orderData.stallNo || (orderData.stallGroups?.[0]?.stallNo) || (orderData.items?.[0]?.stallNo);
    const candidateVendorName = orderData.vendorName || (orderData.stallGroups?.[0]?.vendorName) || (orderData.items?.[0]?.vendorName);

    if (candidateVendorId) {
      vendor = this.data.vendors.find(v => v.id === candidateVendorId);
    }
    if (!vendor && candidateStallNo) {
      const cleanStall = String(candidateStallNo).replace(/\D/g, '');
      vendor = this.data.vendors.find(v => v.stallNo.replace(/\D/g, '') === cleanStall);
    }
    if (!vendor && candidateVendorName) {
      vendor = this.data.vendors.find(v => v.name.toLowerCase() === candidateVendorName.toLowerCase());
    }

    const vendorId = vendor ? vendor.id : (candidateVendorId || 'v_unknown');
    const vendorName = vendor ? vendor.name : (candidateVendorName || 'Unassigned Vendor');
    const stallNo = vendor ? vendor.stallNo : (candidateStallNo ? (String(candidateStallNo).toLowerCase().includes('stall') ? candidateStallNo : `Stall ${candidateStallNo}`) : 'Stall TBD');
    const commissionPct = vendor ? Number(vendor.commissionPct ?? 15) : 15;

    const grossAmount = Number(orderData.totals?.payable || orderData.totals?.subtotal || orderData.billAmount || 0);
    const commissionAmount = Math.round((grossAmount * (commissionPct / 100)) * 100) / 100;
    const totalPayable = Math.round(Math.max(0, grossAmount - commissionAmount) * 100) / 100;

    const newOrder = {
      id: 'ord_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      billNo,
      clientOrderRef: orderData.clientOrderRef || billNo,
      eventId: 'HPD-VIJ-OCT2026',
      customer: {
        name: (orderData.customer?.name || 'Walk-in Shopper').trim(),
        phone: (orderData.customer?.phone || '').trim(),
        email: (orderData.customer?.email || '').trim()
      },
      vendorId,
      vendorName,
      stallNo,
      commissionPct,
      items: Array.isArray(orderData.items) ? orderData.items : [],
      stallGroups: Array.isArray(orderData.stallGroups) ? orderData.stallGroups : [],
      totals: {
        grossAmount,
        commissionPct,
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
      status: orderData.status || 'PENDING_APPROVAL', // PENDING_APPROVAL, APPROVED, REJECTED
      shopifySyncStatus: 'NOT_PUSHED', // NOT_PUSHED, PUSHED, FAILED
      shopifyOrderId: null,
      shopifyOrderNumber: null,
      shopifyError: null,
      pushedAt: null,
      pushedBy: null,
      totalPayable,
      amountPaid: 0,
      outstandingBalance: totalPayable,
      payoutStatus: 'UNPAID', // UNPAID, PARTIALLY_PAID, FULLY_PAID
      payoutAllocations: [],
      source: orderData.source || 'Payment Page',
      createdAt: orderData.timestamp || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!this.data.internalOrders) this.data.internalOrders = [];
    this.data.internalOrders.unshift(newOrder);

    // Also sync to billRows so existing settlement totals and reports work consistently
    const billRow = {
      id: 'row_' + newOrder.id,
      eventId: 'HPD-VIJ-OCT2026',
      vendorId,
      billCopyNo: billNo,
      billAmount: grossAmount,
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
      internalOrderId: newOrder.id
    };
    this.data.billRows.unshift(billRow);

    this.logAudit(
      typeof user === 'string' ? user : (user.name || 'Staff'),
      'ORDER_RECORDED',
      'internal_orders',
      newOrder.id,
      'all',
      null,
      `Bill #${billNo} for ₹${grossAmount} (${stallNo} - ${vendorName})`,
      'Recorded internally before Shopify push'
    );

    this.save();
    return { order: newOrder, isDuplicate: false };
  }

  getInternalOrders(filters = {}) {
    let orders = [...(this.data.internalOrders || [])];

    if (filters.vendorId && filters.vendorId !== 'all') {
      orders = orders.filter(o => o.vendorId === filters.vendorId);
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
    const internalOrders = (this.data.internalOrders || []).filter(o => o.vendorId === vendorId && o.outstandingBalance > 0);
    
    internalOrders.forEach(o => {
      results.push({
        orderId: o.id,
        billNo: o.billNo,
        type: 'internal_order',
        date: o.createdAt,
        customerName: o.customer?.name || 'Walk-in',
        grossAmount: o.totals?.grossAmount || 0,
        totalPayable: o.totalPayable,
        amountPaid: o.amountPaid,
        outstandingBalance: o.outstandingBalance,
        payoutStatus: o.payoutStatus,
        shopifyOrderNumber: o.shopifyOrderNumber || '-'
      });
    });

    // Also look at billRows if vendor has bills not yet converted to internalOrders
    const handledBillNos = new Set((this.data.internalOrders || []).map(o => o.billNo));
    const vendorBills = (this.data.billRows || []).filter(r => r.vendorId === vendorId && !r.isVoid && !handledBillNos.has(r.billCopyNo));
    
    const vendor = this.data.vendors.find(v => v.id === vendorId);
    const commPct = vendor ? Number(vendor.commissionPct ?? 15) : 15;

    vendorBills.forEach(r => {
      const gross = Number(r.billAmount || 0);
      const payable = Math.round((gross * (1 - (commPct / 100))) * 100) / 100;
      const paid = Number(r.amountPaid || 0);
      const balance = Math.round(Math.max(0, payable - paid) * 100) / 100;
      if (balance > 0) {
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
        if (allocAmt > matchedInternal.outstandingBalance + 0.01) {
          throw new Error(`Allocation ₹${allocAmt} exceeds outstanding balance ₹${matchedInternal.outstandingBalance} for Bill #${matchedInternal.billNo}`);
        }
        matchedInternal.amountPaid = Math.round((matchedInternal.amountPaid + allocAmt) * 100) / 100;
        matchedInternal.outstandingBalance = Math.round(Math.max(0, matchedInternal.totalPayable - matchedInternal.amountPaid) * 100) / 100;
        matchedInternal.payoutStatus = (matchedInternal.outstandingBalance <= 0.01) ? 'FULLY_PAID' : 'PARTIALLY_PAID';
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
}

module.exports = new Store();
