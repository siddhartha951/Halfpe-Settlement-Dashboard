require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const store = require('./data/store');
const ShopifyClient = require('./data/shopify-client');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// Shopify Integration Client & Sync Engine
// -------------------------------------------------------------
const shopifyClient = new ShopifyClient({
  storeUrl: process.env.SHOPIFY_STORE_URL,
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  apiVersion: process.env.SHOPIFY_API_VERSION
});

let isSyncing = false;
async function performShopifySync(options = {}) {
  if (!shopifyClient.isConfigured()) {
    return { success: false, error: 'Shopify API not configured in .env' };
  }
  if (isSyncing) {
    return { success: false, error: 'Sync already in progress' };
  }
  isSyncing = true;
  try {
    const createdAtMin = options.createdAtMin || '2026-10-06T00:00:00+05:30';
    const createdAtMax = options.createdAtMax || undefined;
    const tag = options.tag !== undefined ? options.tag : 'VIJ-Event';

    console.log(`[Shopify Sync] Starting fetch (tag: ${tag || 'ALL'}, min: ${createdAtMin}, max: ${createdAtMax || 'none'})...`);
    const orders = await shopifyClient.fetchAllOrders({ createdAtMin, createdAtMax, tag });

    const vendorMaster = ShopifyClient.loadVijayawadaVendorsMaster();
    const processed = shopifyClient.processOrdersForVendors(orders, vendorMaster);

    const result = store.syncShopifyData(processed.billRows, processed.returns, processed.syncStats);

    store.logAudit(
      'System (Shopify Sync)',
      'SHOPIFY_SYNC',
      'shopify',
      'all',
      'orders',
      null,
      `${orders.length} orders → ${processed.billRows.length} bills`,
      `Sync from ${createdAtMin} completed with ${processed.syncStats.matchedVendorCodes.length} vendors matched`
    );

    console.log(`[Shopify Sync] Done: ${processed.billRows.length} bills, ${processed.returns.length} returns across ${processed.syncStats.matchedVendorCodes.length} vendors.`);
    return {
      success: true,
      totalOrders: orders.length,
      matchedBills: processed.billRows.length,
      matchedReturns: processed.returns.length,
      stats: processed.syncStats,
      lastSync: result.lastSync
    };
  } catch (err) {
    console.error('[Shopify Sync] Error:', err.message);
    return { success: false, error: err.message };
  } finally {
    isSyncing = false;
  }
}

// -------------------------------------------------------------
// 1. Auth & User Context
// -------------------------------------------------------------
function getBusinessTodayKolkata() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const p = type => parts.find(it => it.type === type)?.value ?? '';
  return `${p('year')}-${p('month')}-${p('day')}`;
}

function validateDateRange(startDate, endDate) {
  const today = getBusinessTodayKolkata();
  if (startDate && startDate > today) {
    return { valid: false, error: `Start date (${startDate}) cannot exceed today (${today}) in Asia/Kolkata.` };
  }
  if (endDate && endDate > today) {
    return { valid: false, error: `End date (${endDate}) cannot exceed today (${today}) in Asia/Kolkata.` };
  }
  if (startDate && endDate && endDate < startDate) {
    return { valid: false, error: 'End date cannot be earlier than start date.' };
  }
  return { valid: true, today };
}

let currentUser = (store.data && store.data.users && store.data.users[0]) || {
  id: 'usr_1',
  name: 'Krishna (Super Admin)',
  email: 'admin@halfpe.com',
  role: 'super_admin'
};

const USER_CREDENTIALS = [
  { id: 'usr_1', email: 'admin@halfpe.com', password: 'admin@2026', name: 'Krishna (Super Admin)', role: 'super_admin', roleLabel: 'Super Admin', desc: 'Full event settlement, edit & void authorization' },
  { id: 'usr_2', email: 'billing@halfpe.com', password: 'billing@2026', name: 'Ravi Teja (Billing Counter)', role: 'billing_staff', roleLabel: 'Billing Counter Staff', desc: 'Counter POS entry, cash collection & refund requests' },
  { id: 'usr_3', email: 'finance@halfpe.com', password: 'finance@2026', name: 'Ananya Rao (Finance & Accounts)', role: 'finance', roleLabel: 'Finance & Accounts', desc: 'Payouts, bank settlement, daily lock audits' },
  { id: 'usr_4', email: 'viewer@halfpe.com', password: 'viewer@2026', name: 'Suresh Kumar (Audit Viewer)', role: 'viewer', roleLabel: 'External Auditor', desc: 'Read-only financial view, masked PII phones' }
];

// Secure account metadata endpoint - NO PASSWORDS EXPOSED
app.get('/api/auth/credentials', (req, res) => {
  res.json({
    accounts: USER_CREDENTIALS.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      roleLabel: u.roleLabel,
      desc: u.desc
    }))
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const matched = USER_CREDENTIALS.find(u => 
    u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password.trim()
  );

  if (!matched) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const storeUser = store.data.users.find(u => u.id === matched.id) || {
    id: matched.id,
    name: matched.name,
    email: matched.email,
    role: matched.role
  };

  currentUser = storeUser;
  res.json({
    success: true,
    user: {
      id: storeUser.id,
      name: storeUser.name,
      email: storeUser.email,
      role: storeUser.role
    },
    token: Buffer.from(`${storeUser.id}:${Date.now()}`).toString('base64'),
    message: `Welcome back, ${storeUser.name}!`
  });
});

app.post('/api/auth/logout', (req, res) => {
  currentUser = null;
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/users', (req, res) => {
  res.json({
    currentUser,
    users: store.data.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role
    }))
  });
});

app.post('/api/auth/switch', (req, res) => {
  const { userId } = req.body;
  const user = store.data.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  currentUser = user;
  res.json({
    success: true,
    currentUser: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// Middleware to check day lock for mutation
function checkDayLock(req, res, next) {
  const { date } = req.body;
  if (!date) return next();
  
  const dayStr = date.split('T')[0];
  const lock = store.data.dayLocks.find(dl => dl.date === dayStr && dl.isLocked);
  
  if (lock && currentUser.role !== 'super_admin') {
    return res.status(403).json({
      error: `Day ${dayStr} is locked by Finance. Only Super Admin can modify locked records.`
    });
  }
  next();
}

// -------------------------------------------------------------
// 2. Vendors List & Detail (Supports Custom Date Range)
// -------------------------------------------------------------
app.get('/api/vendors', (req, res) => {
  const { startDate, endDate } = req.query;
  const dateCheck = validateDateRange(startDate, endDate);
  if (!dateCheck.valid) {
    return res.status(400).json({ error: dateCheck.error });
  }
  const data = store.getAllVendorsSummary({ startDate, endDate });
  res.json(data);
});

app.get('/api/vendors/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const dateCheck = validateDateRange(startDate, endDate);
    if (!dateCheck.valid) {
      return res.status(400).json({ error: dateCheck.error });
    }
    const summary = store.getVendorSummary(id, { startDate, endDate });
    if (!summary) return res.status(404).json({ error: 'Vendor not found' });

    // Get bills, returns, payouts
    let bills = store.data.billRows.filter(r => r.vendorId === id);
    let returns = store.data.returns.filter(ret => ret.vendorId === id);
    let payouts = store.data.payouts.filter(p => p.vendorId === id);

    bills = store.filterByDateRange(bills, 'createdAt', startDate, endDate);
    returns = store.filterByDateRange(returns, 'date', startDate, endDate);
    payouts = store.filterByDateRange(payouts, 'date', startDate, endDate);

    const auditHistory = store.data.auditLog.filter(a => 
      a.entityId === id || bills.some(b => b.id === a.entityId)
    );

    // Mask mobile numbers if not admin
    const activeRole = (currentUser && currentUser.role) || 'super_admin';
    const maskedBills = bills.map(b => {
      let maskedMobile = b.mobile || 'N/A';
      if (activeRole === 'viewer' || activeRole === 'billing_staff') {
        if (maskedMobile.length >= 4) {
          maskedMobile = 'XXXXXX' + maskedMobile.slice(-4);
        }
      }
      return { ...b, mobile: maskedMobile, rawMobile: b.mobile };
    });

    res.json({
      ...summary,
      bills: maskedBills,
      returns,
      payouts,
      auditHistory
    });
  } catch (err) {
    console.error('Error in /api/vendors/:id:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.patch('/api/vendors/:id/commission', (req, res) => {
  if (currentUser.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Super Admin can update vendor commission.' });
  }
  const { id } = req.params;
  const { commissionPct, reason } = req.body;
  const vendor = store.data.vendors.find(v => v.id === id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

  const oldVal = vendor.commissionPct;
  vendor.commissionPct = parseFloat(commissionPct);

  store.logAudit(
    currentUser.name,
    'UPDATE_COMMISSION',
    'vendor',
    vendor.id,
    'commissionPct',
    oldVal,
    vendor.commissionPct,
    reason || 'Commission rate updated by Super Admin'
  );
  store.save();

  res.json({ success: true, vendor, summary: store.getVendorSummary(id) });
});

// -------------------------------------------------------------
// 3. Bill Rows (Orders Table CRUD with Audit & Constraints)
// -------------------------------------------------------------
app.get('/api/bills', (req, res) => {
  const { vendorId, paymentMode, source, status, search, mismatchOnly, startDate, endDate } = req.query;
  const dateCheck = validateDateRange(startDate, endDate);
  if (!dateCheck.valid) {
    return res.status(400).json({ error: dateCheck.error });
  }
  let list = [...store.data.billRows];

  list = store.filterByDateRange(list, 'createdAt', startDate, endDate);

  if (vendorId) list = list.filter(r => r.vendorId === vendorId);
  if (paymentMode) list = list.filter(r => r.paymentMode.toLowerCase() === paymentMode.toLowerCase());
  if (source) list = list.filter(r => r.source.toLowerCase() === source.toLowerCase());
  if (status) list = list.filter(r => r.status.toLowerCase() === status.toLowerCase());
  if (mismatchOnly === 'true') list = list.filter(r => r.mismatchFlag);

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(r => 
      r.billCopyNo.toLowerCase().includes(q) ||
      r.paymentOrderRef.toLowerCase().includes(q) ||
      (r.customerName && r.customerName.toLowerCase().includes(q)) ||
      (r.mobile && r.mobile.includes(q))
    );
  }

  // Mask mobile numbers if not admin
  const activeRole = (currentUser && currentUser.role) || 'super_admin';
  const maskedBills = list.map(b => {
    let maskedMobile = b.mobile || 'N/A';
    if (activeRole === 'viewer' || activeRole === 'billing_staff') {
      if (maskedMobile.length >= 4) {
        maskedMobile = 'XXXXXX' + maskedMobile.slice(-4);
      }
    }
    return { ...b, mobile: maskedMobile, rawMobile: b.mobile };
  });

  res.json(maskedBills);
});

app.post('/api/bills', checkDayLock, (req, res) => {
  if (currentUser.role === 'viewer' || currentUser.role === 'finance') {
    return res.status(403).json({ error: 'Finance and Viewers cannot add sales rows.' });
  }

  const { vendorId, billCopyNo, billAmount, paymentMode, customerName, mobile, reason } = req.body;

  if (!vendorId || !billCopyNo || !billAmount) {
    return res.status(400).json({ error: 'Vendor, Bill Copy Number and Bill Amount are required.' });
  }

  // Duplicate Bill Copy Number check
  const duplicate = store.data.billRows.find(
    r => r.billCopyNo.trim().toUpperCase() === billCopyNo.trim().toUpperCase() && !r.isVoid
  );
  if (duplicate) {
    return res.status(400).json({
      error: `Duplicate Bill Copy Number! '${billCopyNo}' already exists under vendor ${duplicate.vendorId} (Order Ref: ${duplicate.paymentOrderRef}). Duplicate entry is blocked.`
    });
  }

  const newRow = {
    id: 'row_' + Date.now(),
    eventId: 'HPD-VIJ-OCT2026',
    vendorId,
    billCopyNo: billCopyNo.trim().toUpperCase(),
    billAmount: parseFloat(billAmount),
    paymentMode: paymentMode || 'Cash',
    paymentOrderRef: '#MANUAL-' + Math.floor(1000 + Math.random() * 9000),
    shopifyOrderId: null,
    customerName: customerName || 'Walk-in Customer',
    mobile: mobile || '9876543210',
    source: 'Manual',
    status: 'Paid',
    isVoid: false,
    voidReason: null,
    mismatchFlag: false,
    createdAt: new Date().toISOString(),
    lastEditedBy: currentUser.name,
    lastEditedAt: new Date().toISOString()
  };

  store.data.billRows.unshift(newRow);

  store.logAudit(
    currentUser.name,
    'ADD_ROW',
    'bill_row',
    newRow.id,
    'all',
    null,
    `${newRow.billCopyNo} (₹${newRow.billAmount})`,
    reason || 'Manual bill added by counter staff'
  );
  store.save();

  res.json({ success: true, row: newRow });
});

app.patch('/api/bills/:id', checkDayLock, (req, res) => {
  if (currentUser.role === 'viewer' || currentUser.role === 'finance') {
    return res.status(403).json({ error: 'Finance and Viewers cannot edit sales rows.' });
  }

  const { id } = req.params;
  const { billAmount, paymentMode, reason } = req.body;

  const row = store.data.billRows.find(r => r.id === id);
  if (!row) return res.status(404).json({ error: 'Bill row not found' });
  if (row.isVoid) return res.status(400).json({ error: 'Cannot edit a voided bill row.' });

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Reason is strictly required for modifying bill rows.' });
  }

  const oldAmount = row.billAmount;
  const oldMode = row.paymentMode;

  if (billAmount !== undefined) {
    row.billAmount = parseFloat(billAmount);
    if (row.source === 'Shopify' && row.billAmount !== oldAmount) {
      row.mismatchFlag = true;
    }
    store.logAudit(
      currentUser.name,
      'EDIT_ROW',
      'bill_row',
      row.id,
      'billAmount',
      oldAmount,
      row.billAmount,
      reason
    );
  }

  if (paymentMode && paymentMode !== oldMode) {
    row.paymentMode = paymentMode;
    store.logAudit(
      currentUser.name,
      'EDIT_ROW',
      'bill_row',
      row.id,
      'paymentMode',
      oldMode,
      row.paymentMode,
      reason
    );
  }

  row.source = 'Edited';
  row.lastEditedBy = currentUser.name;
  row.lastEditedAt = new Date().toISOString();
  store.save();

  res.json({ success: true, row });
});

app.post('/api/bills/:id/void', (req, res) => {
  if (currentUser.role === 'viewer' || currentUser.role === 'finance') {
    return res.status(403).json({ error: 'Only authorized billing staff or Super Admin can void rows.' });
  }

  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A valid reason is required to void this bill row.' });
  }

  const row = store.data.billRows.find(r => r.id === id);
  if (!row) return res.status(404).json({ error: 'Bill row not found' });
  if (row.isVoid) return res.status(400).json({ error: 'Row is already voided.' });

  row.isVoid = true;
  row.status = 'Voided';
  row.voidReason = reason;
  row.lastEditedBy = currentUser.name;
  row.lastEditedAt = new Date().toISOString();

  store.logAudit(
    currentUser.name,
    'VOID_ROW',
    'bill_row',
    row.id,
    'isVoid',
    'false',
    'true',
    reason
  );
  store.save();

  res.json({ success: true, row, message: 'Row voided successfully. It will remain in history for auditing but excluded from totals.' });
});

// -------------------------------------------------------------
// 4. Returns Management (Section 6.5)
// -------------------------------------------------------------
app.post('/api/returns', (req, res) => {
  if (currentUser.role === 'viewer') {
    return res.status(403).json({ error: 'Viewers cannot record returns.' });
  }

  const { billRowId, amount, reason, refundMode } = req.body;
  const row = store.data.billRows.find(r => r.id === billRowId);
  if (!row) return res.status(404).json({ error: 'Bill row not found' });
  if (row.isVoid) return res.status(400).json({ error: 'Cannot record return on a voided bill.' });

  const existingReturns = store.data.returns.filter(ret => ret.billRowId === billRowId);
  const alreadyReturned = existingReturns.reduce((sum, r) => sum + Number(r.amount), 0);
  const maxAllowed = row.billAmount - alreadyReturned;

  const returnAmt = parseFloat(amount);
  if (returnAmt <= 0) {
    return res.status(400).json({ error: 'Return amount must be greater than zero.' });
  }
  if (returnAmt > maxAllowed) {
    return res.status(400).json({
      error: `Return amount (₹${returnAmt}) exceeds max eligible return amount (₹${maxAllowed}).`
    });
  }

  const newReturn = {
    id: 'ret_' + Date.now(),
    billRowId,
    billCopyNo: row.billCopyNo,
    vendorId: row.vendorId,
    amount: returnAmt,
    reason: reason || 'Item return/exchange',
    refundMode: refundMode || 'Cash',
    date: new Date().toISOString(),
    approvedBy: currentUser.name
  };

  store.data.returns.unshift(newReturn);

  const totalReturnedNow = alreadyReturned + returnAmt;
  row.status = totalReturnedNow >= row.billAmount ? 'Returned (full)' : 'Returned (partial)';

  store.logAudit(
    currentUser.name,
    'RECORD_RETURN',
    'return',
    newReturn.id,
    'amount',
    null,
    `₹${returnAmt} on ${row.billCopyNo}`,
    reason
  );
  store.save();

  res.json({ success: true, return: newReturn });
});

// -------------------------------------------------------------
// 5. Payouts Management (Section 6.6)
// -------------------------------------------------------------
app.post('/api/payouts', (req, res) => {
  if (currentUser.role !== 'finance' && currentUser.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Finance or Super Admin can record payouts.' });
  }

  const { vendorId, amount, mode, reference } = req.body;
  if (!vendorId || !amount) {
    return res.status(400).json({ error: 'Vendor and amount are required.' });
  }

  const newPayout = {
    id: 'pay_' + Date.now(),
    vendorId,
    amount: parseFloat(amount),
    mode: mode || 'Bank Transfer',
    reference: reference || 'UTR-' + Date.now().toString().slice(-8),
    date: new Date().toISOString(),
    paidBy: currentUser.name
  };

  store.data.payouts.unshift(newPayout);

  store.logAudit(
    currentUser.name,
    'RECORD_PAYOUT',
    'payout',
    newPayout.id,
    'amount',
    null,
    `₹${newPayout.amount} via ${newPayout.mode} (Ref: ${newPayout.reference})`,
    `Payout recorded for vendor ${vendorId}`
  );
  store.save();

  res.json({ success: true, payout: newPayout });
});

// -------------------------------------------------------------
// 6. Day Locks (Section 6.6)
// -------------------------------------------------------------
app.get('/api/day-locks', (req, res) => {
  res.json(store.data.dayLocks);
});

app.post('/api/day-locks/toggle', (req, res) => {
  const { date, lock, reason } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required.' });

  const dayStr = date.split('T')[0];
  let lockEntry = store.data.dayLocks.find(dl => dl.date === dayStr);

  if (lock) {
    if (currentUser.role !== 'finance' && currentUser.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only Finance or Super Admin can lock a day.' });
    }
    if (!lockEntry) {
      lockEntry = { eventId: 'HPD-VIJ-OCT2026', date: dayStr, isLocked: true };
      store.data.dayLocks.push(lockEntry);
    }
    lockEntry.isLocked = true;
    lockEntry.lockedBy = currentUser.name;
    lockEntry.lockedAt = new Date().toISOString();

    store.logAudit(currentUser.name, 'LOCK_DAY', 'day_lock', dayStr, 'isLocked', 'false', 'true', 'Day marked settled and locked');
  } else {
    if (currentUser.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only Super Admin can unlock a locked day.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason is strictly required to unlock a settled day.' });
    }
    if (lockEntry) {
      lockEntry.isLocked = false;
      lockEntry.unlockedBy = currentUser.name;
      lockEntry.unlockReason = reason;
    }
    store.logAudit(currentUser.name, 'UNLOCK_DAY', 'day_lock', dayStr, 'isLocked', 'true', 'false', reason);
  }

  store.save();
  res.json({ success: true, dayLocks: store.data.dayLocks });
});

// -------------------------------------------------------------
// 7. Shopify API Status & Manual Sync Trigger
// -------------------------------------------------------------
app.get('/api/shopify/status', (req, res) => {
  res.json({
    configured: shopifyClient.isConfigured(),
    storeUrl: process.env.SHOPIFY_STORE_URL || null,
    isSyncing,
    lastSync: store.data.lastShopifySync || null,
    lastSyncStats: store.data.lastSyncStats || null,
    totalBills: store.data.billRows.length,
    totalVendors: store.data.vendors.length
  });
});

app.post('/api/shopify/sync', async (req, res) => {
  const { startDate, endDate, tag } = req.body;
  const createdAtMin = startDate ? `${startDate}T00:00:00+05:30` : '2026-10-06T00:00:00+05:30';
  const createdAtMax = endDate ? `${endDate}T23:59:59+05:30` : undefined;

  const result = await performShopifySync({ createdAtMin, createdAtMax, tag });
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

// -------------------------------------------------------------
// 8. Shopify Webhook Ingestion Engine & Simulator
// -------------------------------------------------------------
app.post('/api/webhooks/shopify-order', (req, res) => {
  const payload = req.body;
  const shopifyOrderId = String(payload.id || Date.now());
  const orderRef = payload.name || `#HP-${shopifyOrderId.slice(-5)}`;
  const customerName = (payload.customer && (payload.customer.first_name + ' ' + (payload.customer.last_name || ''))) || 'Walk-in Customer';
  const mobile = (payload.customer && payload.customer.phone) || payload.phone || '9876543210';
  const paymentMode = (payload.gateway && payload.gateway.toLowerCase().includes('cash')) ? 'Cash' : 'Razorpay Online';

  let billCopyNo = 'HP-VIJ-' + Math.floor(2000 + Math.random() * 8000);
  if (Array.isArray(payload.note_attributes)) {
    const attr = payload.note_attributes.find(a => 
      a.name && (a.name.toLowerCase().includes('bill') || a.name.toLowerCase().includes('slip'))
    );
    if (attr && attr.value) billCopyNo = attr.value.trim().toUpperCase();
  } else if (payload.note) {
    const noteMatch = payload.note.match(/Bill\s*#?([A-Za-z0-9\-_]+)/i);
    if (noteMatch) billCopyNo = noteMatch[1].trim();
  }

  const lineItems = payload.line_items || [];
  const vendorGroups = {};
  const masterVendors = ShopifyClient.loadVijayawadaVendorsMaster();

  if (lineItems.length > 0) {
    lineItems.forEach((item) => {
      const vendorName = (item.vendor || '').trim();
      const matched = shopifyClient.findMatchingVendor(vendorName.toLowerCase(), masterVendors.map(v => ({
        ...v,
        nameLower: v.vendor_name.toLowerCase(),
        codeLower: v.vendor_code.toLowerCase()
      })));

      if (!matched) return; // Ignore non-event vendors

      const vendorId = `v_${matched.vendor_code}`;
      if (!vendorGroups[vendorId]) {
        vendorGroups[vendorId] = {
          vendor: matched,
          totalAmount: 0,
          itemsCount: 0
        };
      }
      const itemPrice = parseFloat(item.price || 0) * (item.quantity || 1);
      vendorGroups[vendorId].totalAmount += itemPrice;
      vendorGroups[vendorId].itemsCount += (item.quantity || 1);
    });
  }

  const vKeys = Object.keys(vendorGroups);
  if (vKeys.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'Order received but no line items matched Vijayawada event vendors. Ignored.'
    });
  }

  let suffix = 1;
  const createdRows = [];

  for (const vId of vKeys) {
    const group = vendorGroups[vId];
    const finalBillCopyNo = vKeys.length > 1 ? `${billCopyNo}-S${suffix}` : billCopyNo;

    const row = {
      id: `webhook_${shopifyOrderId}_${vId}`,
      eventId: 'HPD-VIJ-OCT2026',
      vendorId: vId,
      billCopyNo: finalBillCopyNo,
      billAmount: Math.round(group.totalAmount * 100) / 100,
      paymentMode,
      paymentOrderRef: orderRef,
      shopifyOrderId,
      customerName,
      mobile,
      source: 'Shopify',
      status: 'Paid',
      isVoid: false,
      voidReason: null,
      mismatchFlag: false,
      createdAt: payload.created_at || new Date().toISOString(),
      lastEditedBy: null,
      lastEditedAt: null
    };

    store.data.billRows.unshift(row);
    createdRows.push(row);

    store.logAudit(
      'Shopify Webhook',
      'AUTO_CAPTURE',
      'bill_row',
      row.id,
      'all',
      null,
      `${row.billCopyNo} (₹${row.billAmount}) for ${group.vendor.vendor_name}`,
      `Captured via Shopify order ${orderRef}`
    );
    suffix++;
  }

  store.save();
  res.status(201).json({
    success: true,
    message: `Captured ${createdRows.length} vendor rows from order ${orderRef}`,
    rows: createdRows
  });
});

// -------------------------------------------------------------
// 9. Reports & Exports (CSV & Statements)
// -------------------------------------------------------------
app.get('/api/reports/all-vendors-summary.csv', (req, res) => {
  const { startDate, endDate } = req.query;
  const { vendors, eventTotals } = store.getAllVendorsSummary({ startDate, endDate });
  let csv = 'Stall No,Vendor Name,Webkul Seller ID,Total Orders,Gross Sales,Total Returns,Net Sales,Commission %,Commission Amount,Settlement Payable,Already Paid,Balance To Pay,Status\n';
  
  vendors.forEach(v => {
    csv += `"${v.vendor.stallNo}","${v.vendor.name}","${v.vendor.webkulSellerId}",${v.ordersCount},${v.grossSales},${v.returnsAmount},${v.netSales},${v.commissionPct}%,${v.commissionAmount},${v.settlementPayable},${v.alreadyPaid},${v.balanceToPay},"${v.status}"\n`;
  });

  csv += `\n"TOTALS","ALL VENDORS","-",${eventTotals.totalOrders},${eventTotals.grossSales},${eventTotals.totalReturns},${eventTotals.netSales},"-",${eventTotals.totalCommission},${eventTotals.settlementPayable},${eventTotals.alreadyPaid},${eventTotals.balanceToPay},"-"\n`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="HalfPe-All-Vendors-Settlement-Summary.csv"');
  res.send(csv);
});

app.get('/api/reports/exceptions.csv', (req, res) => {
  const exceptions = store.data.billRows.filter(r => 
    r.isVoid || r.mismatchFlag || r.source === 'Manual' || r.source === 'Edited'
  );

  let csv = 'Bill Copy No,Vendor,Amount,Payment Mode,Order Ref,Source,Status,Void Reason,Mismatch Flag,Last Edited By\n';
  exceptions.forEach(r => {
    const vendor = store.data.vendors.find(v => v.id === r.vendorId);
    csv += `"${r.billCopyNo}","${vendor ? vendor.name : r.vendorId}",${r.billAmount},"${r.paymentMode}","${r.paymentOrderRef}","${r.source}","${r.status}","${r.voidReason || ''}",${r.mismatchFlag},"${r.lastEditedBy || ''}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="HalfPe-Exceptions-Report.csv"');
  res.send(csv);
});

app.get('/api/reports/daily-payment-modes', (req, res) => {
  const nonVoid = store.data.billRows.filter(r => !r.isVoid);
  const summary = nonVoid.reduce((acc, r) => {
    const day = r.createdAt.split('T')[0];
    if (!acc[day]) {
      acc[day] = { date: day, cashTotal: 0, onlineTotal: 0, totalAmount: 0, orders: 0 };
    }
    const amt = Number(r.billAmount || 0);
    if (r.paymentMode.toLowerCase().includes('cash')) {
      acc[day].cashTotal += amt;
    } else {
      acc[day].onlineTotal += amt;
    }
    acc[day].totalAmount += amt;
    acc[day].orders += 1;
    return acc;
  }, {});

  res.json(Object.values(summary));
});

app.get('/api/audit-logs', (req, res) => {
  res.json(store.data.auditLog);
});

// Single Page Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`HalfPe Vendor Payments Dashboard running on http://localhost:${PORT}`);
  console.log(`Event: Half Price Days - Vijayawada Expo (SVN Conventions)`);
  console.log(`Shopify Integration: ${shopifyClient.isConfigured() ? 'CONFIGURED (' + process.env.SHOPIFY_STORE_URL + ')' : 'NOT CONFIGURED'}`);
  console.log(`====================================================`);

  // Auto-sync on server startup after 2 seconds
  if (shopifyClient.isConfigured()) {
    setTimeout(() => {
      console.log('[Shopify] Running initial auto-sync on server start...');
      performShopifySync();
    }, 2000);

    // Periodic refresh every SYNC_INTERVAL_MINUTES
    const intervalMins = parseInt(process.env.SYNC_INTERVAL_MINUTES || '5', 10);
    if (intervalMins > 0) {
      setInterval(() => {
        console.log(`[Shopify] Running scheduled ${intervalMins}-minute auto-refresh...`);
        performShopifySync();
      }, intervalMins * 60 * 1000);
    }
  }
});
