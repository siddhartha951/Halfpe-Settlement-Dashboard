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

const superAdminKrishna = {
  id: 'usr_1',
  name: 'Krishna (Super Admin)',
  email: 'admin@halfpe.com',
  designation: 'Founder & Super Admin',
  role: 'super_admin',
  scopes: (store.ALL_SCOPES || []).map(s => s.id),
  active: true
};

let currentUser = (store.data && store.data.users && store.data.users.find(u => u.role === 'super_admin')) || superAdminKrishna;

function getRequestUser(req) {
  const headerUserId = req.headers['x-user-id'] || (req.body && req.body.adminUserId);
  const headerUserEmail = req.headers['x-user-email'] || (req.body && req.body.adminUserEmail);

  if (headerUserId) {
    const u = store.getUserById(headerUserId);
    if (u && u.active !== false) return u;
  }
  if (headerUserEmail) {
    const u = store.getUserByEmail(headerUserEmail);
    if (u && u.active !== false) return u;
  }
  if (currentUser && currentUser.active !== false) {
    return currentUser;
  }
  return store.getUserById('usr_1') || superAdminKrishna;
}

// Attach active user to every request
app.use((req, res, next) => {
  req.user = getRequestUser(req);
  next();
});

// Secure account metadata endpoint - reads active users from store dynamically
app.get('/api/auth/credentials', (req, res) => {
  res.json({
    accounts: store.getUsers().filter(u => u.active !== false).map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      designation: u.designation || 'Staff',
      role: u.role,
      vendorId: u.vendorId || null,
      roleLabel: u.designation || (u.role === 'super_admin' ? 'Super Admin' : u.role),
      desc: (u.scopes || []).slice(0, 3).map(s => s.replace(/_/g, ' ')).join(', ')
    }))
  });
});

app.get('/api/auth/scopes', (req, res) => {
  res.json({ scopes: store.ALL_SCOPES || [] });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = store.getUserByEmail(email);

  if (!user || user.password !== password.trim()) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.active === false) {
    return res.status(403).json({ error: 'Your account has been suspended. Please contact Krishna (Super Admin).' });
  }

  if (user.role === 'super_admin' || user.id === 'usr_1' || user.email === 'admin@halfpe.com') {
    currentUser = user;
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      designation: user.designation || 'Staff',
      role: user.role,
      vendorId: user.vendorId || null,
      scopes: user.scopes || []
    },
    token: Buffer.from(`${user.id}:${Date.now()}`).toString('base64'),
    message: `Welcome back, ${user.name}!`
  });
});

app.post('/api/auth/logout', (req, res) => {
  currentUser = store.getUserById('usr_1') || superAdminKrishna;
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/users', (req, res) => {
  res.json({
    currentUser: getRequestUser(req),
    users: store.getUsers().map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      designation: u.designation || 'Staff',
      role: u.role,
      scopes: u.scopes || [],
      active: u.active !== false
    }))
  });
});

// -------------------------------------------------------------
// Team & Access Management Endpoints (Super Admin Krishna Master)
// -------------------------------------------------------------
app.get('/api/users', (req, res) => {
  const activeUser = getRequestUser(req);
  const isAllowed = activeUser.role === 'super_admin' || 
                    (activeUser.scopes && activeUser.scopes.includes('user_management')) ||
                    activeUser.email === 'admin@halfpe.com' ||
                    activeUser.id === 'usr_1';

  if (!isAllowed) {
    return res.status(403).json({ error: 'Unauthorized: Only Super Admin Krishna can manage team access.' });
  }

  const users = store.getUsers().map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    designation: u.designation || (u.role === 'super_admin' ? 'Super Admin' : 'Staff'),
    role: u.role,
    vendorId: u.vendorId || null,
    scopes: u.scopes || [],
    active: u.active !== false,
    createdAt: u.createdAt || null,
    updatedAt: u.updatedAt || null
  }));

  res.json(users);
});

app.post('/api/users', (req, res) => {
  const activeUser = getRequestUser(req);
  const isAllowed = activeUser.role === 'super_admin' || 
                    (activeUser.scopes && activeUser.scopes.includes('user_management')) ||
                    activeUser.email === 'admin@halfpe.com' ||
                    activeUser.id === 'usr_1';

  if (!isAllowed) {
    return res.status(403).json({ error: 'Unauthorized: Only Super Admin Krishna can create users and share access.' });
  }

  try {
    const newUser = store.addUser(req.body, activeUser);
    res.status(201).json({
      success: true,
      message: `Access granted for ${newUser.name} (${newUser.designation})!`,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        designation: newUser.designation,
        role: newUser.role,
        vendorId: newUser.vendorId,
        scopes: newUser.scopes,
        active: newUser.active
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/users/:id', (req, res) => {
  const activeUser = getRequestUser(req);
  const isAllowed = activeUser.role === 'super_admin' || 
                    (activeUser.scopes && activeUser.scopes.includes('user_management')) ||
                    activeUser.email === 'admin@halfpe.com' ||
                    activeUser.id === 'usr_1';

  if (!isAllowed) {
    return res.status(403).json({ error: 'Unauthorized: Only Super Admin can modify user credentials and scopes.' });
  }

  try {
    const updated = store.updateUser(req.params.id, req.body, activeUser);
    res.json({
      success: true,
      message: `Access updated for ${updated.name}!`,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        designation: updated.designation,
        role: updated.role,
        vendorId: updated.vendorId,
        scopes: updated.scopes,
        active: updated.active
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/users/:id/toggle-status', (req, res) => {
  const activeUser = getRequestUser(req);
  const isAllowed = activeUser.role === 'super_admin' || 
                    (activeUser.scopes && activeUser.scopes.includes('user_management')) ||
                    activeUser.email === 'admin@halfpe.com' ||
                    activeUser.id === 'usr_1';

  if (!isAllowed) {
    return res.status(403).json({ error: 'Unauthorized: Only Super Admin can modify user access status.' });
  }

  const { active } = req.body;
  try {
    const updated = store.toggleUserStatus(req.params.id, active, activeUser);
    res.json({
      success: true,
      message: updated.active ? `User ${updated.name} activated.` : `User ${updated.name} access suspended.`,
      user: {
        id: updated.id,
        name: updated.name,
        active: updated.active
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/switch', (req, res) => {
  const { userId } = req.body;
  const user = store.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.active === false) return res.status(403).json({ error: 'Account is suspended' });
  currentUser = user;
  res.json({
    success: true,
    currentUser: {
      id: user.id,
      name: user.name,
      email: user.email,
      designation: user.designation || 'Staff',
      role: user.role,
      scopes: user.scopes || []
    }
  });
});

// -------------------------------------------------------------
// Real-Time Live Sync Engine (SSE - Server-Sent Events)
// -------------------------------------------------------------
const sseClients = new Set();

app.get('/api/events/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const client = { id: clientId, res, user: req.user };
  sseClients.add(client);

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, timestamp: new Date().toISOString() })}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat ${Date.now()}\n\n`);
    } catch (e) {
      clearInterval(heartbeat);
      sseClients.delete(client);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(client);
  });
});

function broadcastEvent(type, payload = {}) {
  const msg = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  for (const client of sseClients) {
    try {
      client.res.write(`data: ${msg}\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Middleware to check day lock for mutation
function checkDayLock(req, res, next) {
  const { date } = req.body;
  if (!date) return next();
  
  const dayStr = date.split('T')[0];
  const lock = store.data.dayLocks.find(dl => dl.date === dayStr && dl.isLocked);
  const actor = req.user || getRequestUser(req);
  
  if (lock && actor.role !== 'super_admin') {
    return res.status(403).json({
      error: `Day ${dayStr} is locked by Finance. Only Super Admin can modify locked records.`
    });
  }
  next();
}

// -------------------------------------------------------------
// 2. Vendors List & Detail (Supports Custom Date Range & Role Isolation)
// -------------------------------------------------------------
app.get('/api/vendors', (req, res) => {
  const actor = req.user || getRequestUser(req);
  const { startDate, endDate, includeInactive } = req.query;
  const dateCheck = validateDateRange(startDate, endDate);
  if (!dateCheck.valid) {
    return res.status(400).json({ error: dateCheck.error });
  }

  // Vendor role data isolation
  if (actor && actor.role === 'vendor' && actor.vendorId) {
    const single = store.getVendorSummary(actor.vendorId, { startDate, endDate });
    return res.json({
      vendors: single ? [single] : [],
      eventTotals: single ? {
        totalOrders: single.ordersCount,
        grossSales: single.grossSales,
        totalReturns: single.returnsAmount,
        netSales: single.netSales,
        totalCommission: single.commissionAmount,
        settlementPayable: single.settlementPayable,
        alreadyPaid: single.alreadyPaid,
        balanceToPay: single.balanceToPay
      } : {
        totalOrders: 0, grossSales: 0, totalReturns: 0, netSales: 0,
        totalCommission: 0, settlementPayable: 0, alreadyPaid: 0, balanceToPay: 0
      },
      lastShopifySync: store.data.lastShopifySync || null,
      isVendorIsolated: true
    });
  }

  const data = store.getAllVendorsSummary({ startDate, endDate });
  
  // By default, filter out soft-deactivated vendors unless includeInactive=true
  if (includeInactive !== 'true' && data.vendors) {
    data.vendors = data.vendors.filter(v => v.vendor.active !== false);
  }

  res.json(data);
});

app.get('/api/vendors/:id', (req, res) => {
  try {
    const actor = req.user || getRequestUser(req);
    const { id } = req.params;
    // Vendor isolation guard
    if (actor && actor.role === 'vendor' && actor.vendorId && actor.vendorId !== id) {
      return res.status(403).json({ error: 'Access denied: You can only view your own vendor dashboard.' });
    }

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
    const activeRole = (actor && actor.role) || 'super_admin';
    const maskedBills = bills.map(b => {
      let maskedMobile = b.mobile || 'N/A';
      if (activeRole === 'viewer' || activeRole === 'billing_staff' || activeRole === 'vendor') {
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

// Super Admin Vendor Management (CRUD)
app.post('/api/vendors', (req, res) => {
  const actor = req.user || getRequestUser(req);
  if (actor.role !== 'super_admin') {
    return res.status(403).json({ error: 'Unauthorized: Only Super Admin can add vendors.' });
  }
  try {
    const newVendor = store.addVendor(req.body, actor);
    res.status(201).json({ success: true, vendor: newVendor });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/vendors/:id', (req, res) => {
  const actor = req.user || getRequestUser(req);
  if (actor.role !== 'super_admin') {
    return res.status(403).json({ error: 'Unauthorized: Only Super Admin can edit vendor details.' });
  }
  try {
    const updated = store.updateVendor(req.params.id, req.body, actor);
    res.json({ success: true, vendor: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/vendors/:id/toggle-status', (req, res) => {
  const actor = req.user || getRequestUser(req);
  if (actor.role !== 'super_admin') {
    return res.status(403).json({ error: 'Unauthorized: Only Super Admin can activate/deactivate vendors.' });
  }
  try {
    const { active } = req.body;
    const vendor = store.toggleVendorStatus(req.params.id, active, actor);
    res.json({ success: true, vendor });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/vendors/:id/commission', (req, res) => {
  const actor = req.user || getRequestUser(req);
  if (actor.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Super Admin can update vendor commission.' });
  }
  const { id } = req.params;
  const { commissionPct, reason } = req.body;
  const vendor = store.data.vendors.find(v => v.id === id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

  const oldVal = vendor.commissionPct;
  vendor.commissionPct = parseFloat(commissionPct);

  store.logAudit(
    actor.name,
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
// 2.5 Orders Management & Staging Flow (Krishna's Requirement)
// -------------------------------------------------------------
// Record Internal Order from POS / Payment Page (DOES NOT create Shopify order automatically)
app.post('/api/orders/record', (req, res) => {
  try {
    const activeUser = getRequestUser(req);
    const result = store.recordInternalOrder(req.body, activeUser);
    if (!result.isDuplicate) {
      broadcastEvent('ORDER_RECORDED', { 
        orderId: result.order.id, 
        billNo: result.order.billNo,
        vendorId: result.order.vendorId,
        grossAmount: result.order.totals?.grossAmount || 0
      });
    }
    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      isDuplicate: result.isDuplicate,
      order: result.order,
      message: result.isDuplicate 
        ? 'Existing order returned (idempotent)' 
        : 'Order recorded internally in HalfPe database. Awaiting Super Admin review & approval.'
    });
  } catch (err) {
    console.error('[Store] Error recording internal order:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// List Internal Orders
app.get('/api/orders', (req, res) => {
  try {
    const actor = req.user || getRequestUser(req);
    const filters = { ...req.query };

    // Strict Vendor Isolation: vendor user only sees their own orders
    if (actor && actor.role === 'vendor' && actor.vendorId) {
      filters.vendorId = actor.vendorId;
    }

    const orders = store.getInternalOrders(filters);

    // Mask phone numbers if viewer or billing staff
    const activeRole = (actor && actor.role) || 'super_admin';
    const maskedOrders = orders.map(o => {
      let phone = o.customer?.phone || '';
      if (activeRole === 'viewer' || activeRole === 'billing_staff') {
        if (phone.length >= 4) phone = 'XXXXXX' + phone.slice(-4);
      }
      return {
        ...o,
        customer: { ...o.customer, phone, rawPhone: o.customer?.phone }
      };
    });

    res.json(maskedOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single Order detail
app.get('/api/orders/:id', (req, res) => {
  const actor = req.user || getRequestUser(req);
  const order = store.getInternalOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Vendor isolation guard
  if (actor && actor.role === 'vendor' && actor.vendorId && order.vendorId !== actor.vendorId) {
    return res.status(403).json({ error: 'Access denied: You can only view your own orders.' });
  }

  res.json(order);
});

// Edit internal order before Shopify push (Super Admin only)
app.put('/api/orders/:id', (req, res) => {
  const activeUser = getRequestUser(req);
  if (activeUser.role !== 'super_admin') {
    return res.status(403).json({ error: 'Unauthorized: Only Super Admin can edit internal order details.' });
  }

  const { customer, vendorId, status } = req.body;
  if (customer && customer.name !== undefined && !String(customer.name).trim()) {
    return res.status(400).json({ error: 'Customer name cannot be empty.' });
  }

  try {
    const updated = store.updateInternalOrder(req.params.id, req.body, activeUser);
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    broadcastEvent('ORDER_UPDATED', { order: updated });
    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Push approved internal order to Shopify (Super Admin only - Backend Enforced)
app.post('/api/orders/:id/push-to-shopify', async (req, res) => {
  const activeUser = getRequestUser(req);
  if (activeUser.role !== 'super_admin') {
    return res.status(403).json({ error: 'Unauthorized: Only Super Admin can push orders to Shopify.' });
  }

  const order = store.getInternalOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Duplicate guard
  if (order.shopifyOrderId) {
    return res.status(400).json({
      error: `Duplicate push prevented: Order already exists in Shopify (Order ID: ${order.shopifyOrderId}).`
    });
  }

  try {
    console.log(`[PushToShopify] Super Admin "${activeUser.name}" initiated push for Bill #${order.billNo}...`);
    const shopifyResult = await shopifyClient.createShopifyOrder(order);

    const updatedOrder = store.markOrderPushed(order.id, {
      shopifyOrderId: shopifyResult.shopifyOrderId,
      shopifyOrderNumber: shopifyResult.shopifyOrderNumber,
      pushedBy: activeUser,
      syncResult: shopifyResult
    });

    broadcastEvent('ORDER_PUSHED', {
      orderId: order.id,
      shopifyOrderId: shopifyResult.shopifyOrderId,
      shopifyOrderNumber: shopifyResult.shopifyOrderNumber
    });

    res.json({
      success: true,
      message: `Shopify order #${shopifyResult.shopifyOrderNumber} created successfully!`,
      shopifyOrderId: shopifyResult.shopifyOrderId,
      shopifyOrderNumber: shopifyResult.shopifyOrderNumber,
      order: updatedOrder
    });
  } catch (err) {
    console.error(`[PushToShopify] Failed to push Bill #${order.billNo}:`, err.message);
    store.markOrderPushFailed(order.id, { error: err.message, pushedBy: activeUser });
    res.status(500).json({
      success: false,
      error: `Failed to create order in Shopify: ${err.message}`,
      order: store.getInternalOrderById(order.id)
    });
  }
});

// Bulk push approved orders to Shopify (Super Admin only)
app.post('/api/orders/bulk-push-to-shopify', async (req, res) => {
  const activeUser = getRequestUser(req);
  if (activeUser.role !== 'super_admin') {
    return res.status(403).json({ error: 'Unauthorized: Only Super Admin can execute bulk push to Shopify.' });
  }

  const { orderIds } = req.body;
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ error: 'orderIds array is required.' });
  }

  const results = [];
  for (const id of orderIds) {
    const order = store.getInternalOrderById(id);
    if (!order || order.shopifyOrderId) {
      results.push({ id, success: false, reason: 'Already pushed or order not found' });
      continue;
    }

    try {
      const shopifyResult = await shopifyClient.createShopifyOrder(order);
      store.markOrderPushed(order.id, {
        shopifyOrderId: shopifyResult.shopifyOrderId,
        shopifyOrderNumber: shopifyResult.shopifyOrderNumber,
        pushedBy: activeUser,
        syncResult: shopifyResult
      });
      results.push({ id, billNo: order.billNo, success: true, shopifyOrderNumber: shopifyResult.shopifyOrderNumber });
    } catch (err) {
      store.markOrderPushFailed(order.id, { error: err.message, pushedBy: activeUser });
      results.push({ id, billNo: order.billNo, success: false, error: err.message });
    }
  }

  broadcastEvent('ORDERS_BULK_PUSHED', {
    processedCount: results.length,
    results
  });

  res.json({
    success: true,
    processedCount: results.length,
    results
  });
});

// Reject an unapproved internal order (Super Admin only)
app.post('/api/orders/:id/reject', (req, res) => {
  const activeUser = getRequestUser(req);
  if (activeUser.role !== 'super_admin') {
    return res.status(403).json({ error: 'Unauthorized: Only Super Admin can reject orders.' });
  }
  const { reason } = req.body || {};
  try {
    const order = store.rejectInternalOrder(req.params.id, reason || 'Rejected by Super Admin', activeUser);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    broadcastEvent('ORDER_REJECTED', { orderId: req.params.id, reason });
    res.json({ success: true, message: 'Order rejected successfully', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simulate a new order from POS for testing (Super Admin only)
app.post('/api/orders/simulate', (req, res) => {
  const sampleVendors = store.getVendors().filter(v => v.active !== false);
  const v = sampleVendors[Math.floor(Math.random() * sampleVendors.length)] || {
    id: 'v_PSC',
    name: 'Prasiddhi Silks',
    stallNo: 'Stall 12',
    commissionPct: 15
  };
  const billNo = 'VIJ-POS-' + Math.floor(10000 + Math.random() * 90000);
  const sampleAmounts = [1200, 1850, 2400, 3500, 4200, 5600];
  const payable = sampleAmounts[Math.floor(Math.random() * sampleAmounts.length)];
  const isCash = Math.random() > 0.5;

  const result = store.recordInternalOrder({
    billNo,
    clientOrderRef: billNo,
    customer: {
      name: ['Kavitha Reddy', 'Ramesh Chandra', 'Srinivas Rao', 'Padmaja Rani', 'Venkatesh Babu'][Math.floor(Math.random() * 5)],
      phone: '98' + Math.floor(10000000 + Math.random() * 90000000),
      email: 'customer@expo.halfpe.com'
    },
    items: [
      { name: `${v.name} Handloom Garment`, price: payable, quantity: 1, stallNo: v.stallNo, vendorId: v.id }
    ],
    stallGroups: [
      { stallNo: v.stallNo, vendorId: v.id, vendorName: v.name, subtotal: payable }
    ],
    totals: { subtotal: payable, payable, discount: 0 },
    payment: {
      method: isCash ? 'Counter Cash' : 'Razorpay UPI',
      paymentId: isCash ? `CASH_${Date.now()}` : `pay_${Date.now().toString(36)}`,
      status: 'PAID'
    },
    terminal: 'POS-01',
    source: 'POS Billing Terminal'
  }, currentUser.name || 'Super Admin Simulation');

  broadcastEvent('ORDER_RECORDED', { 
    orderId: result.order.id, 
    billNo: result.order.billNo,
    vendorId: result.order.vendorId,
    grossAmount: result.order.totals?.grossAmount || 0
  });

  res.json({ success: true, order: result.order });
});

// -------------------------------------------------------------
// 3. Bill Rows (Orders Table CRUD with Audit & Constraints)
// -------------------------------------------------------------
app.get('/api/bills', (req, res) => {
  const actor = req.user || getRequestUser(req);
  const { vendorId, paymentMode, source, status, search, mismatchOnly, startDate, endDate } = req.query;
  const dateCheck = validateDateRange(startDate, endDate);
  if (!dateCheck.valid) {
    return res.status(400).json({ error: dateCheck.error });
  }
  let list = [...store.data.billRows];

  list = store.filterByDateRange(list, 'createdAt', startDate, endDate);

  const effectiveVendorId = (actor && actor.role === 'vendor' && actor.vendorId) 
    ? actor.vendorId 
    : vendorId;

  if (effectiveVendorId) list = list.filter(r => r.vendorId === effectiveVendorId);
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
  const activeRole = (actor && actor.role) || 'super_admin';
  const maskedBills = list.map(b => {
    let maskedMobile = b.mobile || 'N/A';
    if (activeRole === 'viewer' || activeRole === 'billing_staff' || activeRole === 'vendor') {
      if (maskedMobile.length >= 4) {
        maskedMobile = 'XXXXXX' + maskedMobile.slice(-4);
      }
    }
    return { ...b, mobile: maskedMobile, rawMobile: b.mobile };
  });

  res.json(maskedBills);
});

app.post('/api/bills', checkDayLock, (req, res) => {
  const actor = req.user || getRequestUser(req);
  if (actor.role === 'viewer' || actor.role === 'finance') {
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
    lastEditedBy: actor.name,
    lastEditedAt: new Date().toISOString()
  };

  store.data.billRows.unshift(newRow);

  store.logAudit(
    actor.name,
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
  const actor = req.user || getRequestUser(req);
  if (actor.role === 'viewer' || actor.role === 'finance') {
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
      actor.name,
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
      actor.name,
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
  row.lastEditedBy = actor.name;
  row.lastEditedAt = new Date().toISOString();
  store.save();

  res.json({ success: true, row });
});

app.post('/api/bills/:id/void', (req, res) => {
  const actor = req.user || getRequestUser(req);
  if (actor.role === 'viewer' || actor.role === 'finance') {
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
  row.lastEditedBy = actor.name;
  row.lastEditedAt = new Date().toISOString();

  store.logAudit(
    actor.name,
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
  const actor = req.user || getRequestUser(req);
  if (actor.role === 'viewer') {
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
    approvedBy: actor.name
  };

  store.data.returns.unshift(newReturn);

  const totalReturnedNow = alreadyReturned + returnAmt;
  row.status = totalReturnedNow >= row.billAmount ? 'Returned (full)' : 'Returned (partial)';

  store.logAudit(
    actor.name,
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
// 5. Payouts Management (Section 6.6 & Order-Linked Settlements)
// -------------------------------------------------------------
app.get('/api/vendors/:id/unpaid-orders', (req, res) => {
  try {
    const actor = req.user || getRequestUser(req);
    const { id } = req.params;
    if (actor && actor.role === 'vendor' && actor.vendorId && actor.vendorId !== id) {
      return res.status(403).json({ error: 'Access denied: You can only view your own vendor orders.' });
    }
    const orders = store.getUnpaidOrdersForVendor(id);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payouts', (req, res) => {
  try {
    const actor = req.user || getRequestUser(req);
    const { startDate, endDate, vendorId } = req.query;
    let payouts = [...(store.data.payouts || [])];

    if (vendorId) {
      payouts = payouts.filter(p => p.vendorId === vendorId);
    }
    if (actor && actor.role === 'vendor' && actor.vendorId) {
      payouts = payouts.filter(p => p.vendorId === actor.vendorId);
    }
    if (startDate || endDate) {
      payouts = store.filterByDateRange(payouts, 'date', startDate, endDate);
    }

    const populated = payouts.map(p => {
      const v = store.data.vendors.find(item => item.id === p.vendorId);
      return {
        ...p,
        vendorName: v ? v.name : (p.vendorName || p.vendorId),
        vendorStall: v ? v.stallNo : (p.vendorStall || '-')
      };
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payouts', (req, res) => {
  const actor = req.user || getRequestUser(req);
  if (actor.role !== 'finance' && actor.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Finance or Super Admin can record payouts.' });
  }

  const { vendorId, amount, mode, reference, notes, allocations, date } = req.body;
  if (!vendorId || (!amount && (!allocations || allocations.length === 0))) {
    return res.status(400).json({ error: 'Vendor and amount/allocations are required.' });
  }

  try {
    // If allocations are provided, use order-linked payout recording
    if (Array.isArray(allocations) && allocations.length > 0) {
      const payout = store.recordOrderPayout({
        vendorId,
        allocations,
        amount: parseFloat(amount),
        paymentMode: mode,
        referenceUtr: reference,
        notes,
        adminUser: actor,
        date
      });
      broadcastEvent('PAYOUT_DISBURSED', { vendorId, amount: parseFloat(amount) });
      return res.status(201).json({ success: true, payout });
    }

    // Fallback: general vendor payout without order linking (for legacy backward compatibility)
    const newPayout = {
      id: 'pay_' + Date.now(),
      vendorId,
      amount: parseFloat(amount),
      mode: mode || 'Bank Transfer',
      reference: reference || 'UTR-' + Date.now().toString().slice(-8),
      notes: notes || '',
      date: date || new Date().toISOString(),
      paidBy: actor.name
    };

    store.data.payouts.unshift(newPayout);
    store.logAudit(
      actor.name,
      'RECORD_PAYOUT',
      'payout',
      newPayout.id,
      'amount',
      null,
      `₹${newPayout.amount} via ${newPayout.mode} (Ref: ${newPayout.reference})`,
      `Lumpsum payout recorded for vendor ${vendorId}`
    );
    store.save();

    broadcastEvent('PAYOUT_DISBURSED', { vendorId, amount: parseFloat(amount) });
    res.json({ success: true, payout: newPayout });
  } catch (err) {
    console.error('[Payout Error]:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 6. Day Locks (Section 6.6)
// -------------------------------------------------------------
app.get('/api/day-locks', (req, res) => {
  res.json(store.data.dayLocks);
});

app.post('/api/day-locks/toggle', (req, res) => {
  const actor = req.user || currentUser;
  const { date, lock, reason } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required.' });

  const dayStr = date.split('T')[0];
  let lockEntry = store.data.dayLocks.find(dl => dl.date === dayStr);

  if (lock) {
    if (actor.role !== 'finance' && actor.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only Finance or Super Admin can lock a day.' });
    }
    if (!lockEntry) {
      lockEntry = { eventId: 'HPD-VIJ-OCT2026', date: dayStr, isLocked: true };
      store.data.dayLocks.push(lockEntry);
    }
    lockEntry.isLocked = true;
    lockEntry.lockedBy = actor.name;
    lockEntry.lockedAt = new Date().toISOString();

    store.logAudit(actor.name, 'LOCK_DAY', 'day_lock', dayStr, 'isLocked', 'false', 'true', 'Day marked settled and locked');
  } else {
    if (actor.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only Super Admin can unlock a locked day.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason is strictly required to unlock a settled day.' });
    }
    if (lockEntry) {
      lockEntry.isLocked = false;
      lockEntry.unlockedBy = actor.name;
      lockEntry.unlockReason = reason;
    }
    store.logAudit(actor.name, 'UNLOCK_DAY', 'day_lock', dayStr, 'isLocked', 'true', 'false', reason);
  }

  store.save();
  broadcastEvent('DAY_LOCK_CHANGED', { date: dayStr, isLocked: !!lock });
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
  const nonVoid = store.data.billRows.filter(r => !r.isVoid && r.isApproved !== false);
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
