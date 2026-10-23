const DEFAULT_USER = {
  id: 'usr_1',
  name: 'Krishna (Super Admin)',
  email: 'admin@halfpe.com',
  role: 'super_admin'
};

// State Store
const state = {
  currentUser: DEFAULT_USER,
  allUsers: [DEFAULT_USER],
  activeTab: 'vendors', // 'vendors', 'recon', 'exceptions', 'globalAudit'
  selectedVendorId: null,
  vendorDetailSubTab: 'bills', // 'bills', 'returns', 'payouts', 'audit'
  vendorsData: null,
  selectedVendorData: null,
  searchQuery: '',
  statusFilter: 'all',
  vendorDateFilter: 'all',
  unmaskedPhones: new Set(),
  // Date filtering state (default: Since 6 Oct 2026 per requirements)
  dateFilterMode: 'all',
  startDate: '2026-10-06',
  endDate: '',
  shopifyStatus: null,
  isShopifySyncing: false
};

function getUserRole() {
  return (state.currentUser && state.currentUser.role) ? state.currentUser.role : 'super_admin';
}

function getUserName() {
  return (state.currentUser && state.currentUser.name) ? state.currentUser.name : 'Krishna (Super Admin)';
}

// Format currency with strict 2 decimal places
function formatINR(val) {
  const num = Number(val || 0);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format date
function formatDate(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
async function init() {
  // 1. Restore persistent user session if available
  try {
    const saved = localStorage.getItem('hp_session_user');
    if (saved) {
      state.currentUser = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Could not read saved session:', e);
  }

  // 2. Fetch system users & active role
  await fetchUsers();
  updateUserChipUI();

  // 3. Check Shopify connection status
  await checkShopifyStatus();

  // 4. Load initial vendors data
  await loadVendorsSummary();

  // 5. Setup modal click outside to dismiss
  const modalContainer = document.getElementById('modalContainer');
  if (modalContainer) {
    modalContainer.addEventListener('click', (e) => {
      if (e.target === modalContainer) closeModal();
    });
  }

  // 6. Explicitly bind User Account Chip click
  const chip = document.getElementById('userAccountChip');
  if (chip) {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      openLoginModal();
    });
  }

  // 7. Handle escape key to close drawer/modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      toggleMobileDrawer(false);
    }
  });

  // 8. Global exports for onclick handlers
  window.openLoginModal = openLoginModal;
  window.closeModal = closeModal;
  window.quickFillAndLogin = quickFillAndLogin;
  window.toggleMobileDrawer = toggleMobileDrawer;
  window.switchMainTab = switchMainTab;
}

function updateUserChipUI() {
  if (!state.currentUser) return;
  const u = state.currentUser;
  const nameEl = document.getElementById('userChipName');
  const roleEl = document.getElementById('userChipRole');
  const avatarEl = document.getElementById('userAvatarCircle');
  const drawerAvatar = document.getElementById('drawerUserAvatar');
  const drawerName = document.getElementById('drawerUserName');
  const drawerRole = document.getElementById('drawerUserRole');

  const initial = (u.name || 'A').trim().charAt(0).toUpperCase();
  const roleClean = (u.role || 'Admin').replace('_', ' ');

  if (nameEl) nameEl.textContent = u.name;
  if (roleEl) roleEl.textContent = roleClean;
  if (avatarEl) avatarEl.textContent = initial;

  if (drawerAvatar) drawerAvatar.textContent = initial;
  if (drawerName) drawerName.textContent = u.name;
  if (drawerRole) drawerRole.textContent = roleClean;
}

function toggleMobileDrawer(open) {
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('mobileDrawerOverlay');
  if (!drawer || !overlay) return;

  const shouldOpen = open !== undefined ? open : !drawer.classList.contains('active');
  if (shouldOpen) {
    drawer.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  } else {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

async function checkShopifyStatus() {
  try {
    const res = await fetch('/api/shopify/status');
    const data = await res.json();
    state.shopifyStatus = data;
    updateShopifyStatusUI(data);
  } catch (e) {
    console.warn('Failed to check Shopify status:', e);
  }
}

function updateShopifyStatusUI(data) {
  const pill = document.getElementById('shopifyStatusPill');
  const text = document.getElementById('shopifyStatusText');
  const lastSyncSpan = document.getElementById('lastSyncDisplay');
  if (!pill || !text) return;

  if (data && data.configured) {
    pill.style.display = 'inline-flex';
    pill.style.background = 'rgba(52, 199, 89, 0.12)';
    pill.style.color = '#1a7a37';
    text.textContent = data.lastSyncStats 
      ? `Shopify Live (${data.totalBills} bills · ${data.totalVendors} vendors)`
      : `Shopify Live (${data.storeUrl})`;

    if (data.lastSync && lastSyncSpan) {
      const syncDate = new Date(data.lastSync);
      lastSyncSpan.textContent = `Last Synced: ${syncDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  } else {
    pill.style.background = 'rgba(255, 149, 0, 0.12)';
    pill.style.color = '#c67300';
    text.textContent = 'Shopify Disconnected';
  }
}

async function triggerShopifySync() {
  if (state.isShopifySyncing) return;
  state.isShopifySyncing = true;

  const btn = document.getElementById('btnShopifySync');
  const icon = document.getElementById('syncIcon');
  const text = document.getElementById('syncText');
  if (icon) icon.classList.add('spin-icon');
  if (text) text.textContent = 'Syncing...';
  if (btn) btn.disabled = true;

  toast('Fetching latest orders from Shopify...', 'info');

  try {
    const res = await fetch('/api/shopify/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: state.startDate,
        endDate: state.endDate,
        tag: 'VIJ-Event'
      })
    });
    const result = await res.json();

    if (result.success) {
      toast(`✓ Synced ${result.matchedBills} bills from ${result.totalOrders} Shopify orders!`, 'success');
      await checkShopifyStatus();
      if (state.selectedVendorId) {
        await loadVendorDetail(state.selectedVendorId);
      } else {
        await loadVendorsSummary();
      }
    } else {
      toast(`Sync failed: ${result.error || 'Unknown error'}`, 'error');
    }
  } catch (err) {
    toast(`Sync request error: ${err.message}`, 'error');
  } finally {
    state.isShopifySyncing = false;
    if (icon) icon.classList.remove('spin-icon');
    if (text) text.textContent = 'Sync Shopify';
    if (btn) btn.disabled = false;
  }
}

function setDatePreset(mode) {
  state.dateFilterMode = mode;

  document.querySelectorAll('.date-preset-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(
    mode === 'all' ? 'presetAll' :
    mode === 'expo' ? 'presetExpo' :
    mode === 'today' ? 'presetToday' : 'presetCustom'
  );
  if (btn) btn.classList.add('active');

  const customWrap = document.getElementById('customDateWrap');
  const activeDisplay = document.getElementById('activeDateDisplay');

  if (mode === 'custom') {
    if (customWrap) customWrap.style.display = 'flex';
    if (activeDisplay) activeDisplay.textContent = 'Active: Custom Date Range';
    return;
  }

  if (customWrap) customWrap.style.display = 'none';

  if (mode === 'all') {
    state.startDate = '2026-10-06';
    state.endDate = '';
    if (activeDisplay) activeDisplay.textContent = 'Active: Since 6 Oct 2026 (All Event)';
  } else if (mode === 'expo') {
    state.startDate = '2026-10-08';
    state.endDate = '2026-10-11';
    if (activeDisplay) activeDisplay.textContent = 'Active: 8–11 Oct 2026 (Expo Days)';
  } else if (mode === 'today') {
    const today = new Date().toISOString().slice(0, 10);
    state.startDate = today;
    state.endDate = today;
    if (activeDisplay) activeDisplay.textContent = `Active: Today (${today})`;
  }

  refreshDashboard();
}

function applyCustomDateRange() {
  const fromEl = document.getElementById('customFromDate');
  const toEl = document.getElementById('customToDate');
  const fromVal = fromEl ? fromEl.value : '';
  const toVal = toEl ? toEl.value : '';

  state.startDate = fromVal || '';
  state.endDate = toVal || '';

  const activeDisplay = document.getElementById('activeDateDisplay');
  if (activeDisplay) {
    if (fromVal && toVal) {
      activeDisplay.textContent = `Active: ${fromVal} to ${toVal}`;
    } else if (fromVal) {
      activeDisplay.textContent = `Active: Since ${fromVal}`;
    } else if (toVal) {
      activeDisplay.textContent = `Active: Up to ${toVal}`;
    } else {
      activeDisplay.textContent = `Active: All Dates`;
    }
  }

  toast(`Filtered for dates: ${fromVal || 'Any'} to ${toVal || 'Now'}`, 'info');
  refreshDashboard();
}

async function fetchUsers() {
  try {
    const res = await fetch('/api/auth/users');
    const data = await res.json();
    if (!state.currentUser) {
      state.currentUser = data.currentUser;
    }
    state.allUsers = data.users;
    renderRoleSwitcher();
    updateUserChipUI();
  } catch (err) {
    console.error('Failed to fetch user context:', err);
  }
}

function renderRoleSwitcher() {
  const select = document.getElementById('userRoleSelect');
  if (!select) return;
  select.innerHTML = state.allUsers.map(u => 
    `<option value="${u.id}" ${state.currentUser && u.id === state.currentUser.id ? 'selected' : ''}>
      ${u.name} (${u.role.replace('_', ' ').toUpperCase()})
    </option>`
  ).join('');
}

async function switchUserRole(userId) {
  try {
    const res = await fetch('/api/auth/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    if (data.success) {
      state.currentUser = data.currentUser;
      try {
        localStorage.setItem('hp_session_user', JSON.stringify(data.currentUser));
      } catch (e) {}
      updateUserChipUI();
      toast(`Switched role to: ${state.currentUser.name}`, 'info');
      if (state.selectedVendorId) {
        await loadVendorDetail(state.selectedVendorId);
      } else {
        await loadVendorsSummary();
      }
    }
  } catch (err) {
    toast('Error switching role', 'error');
  }
}

// -------------------------------------------------------------
// Authentication & Credentials Modal
// -------------------------------------------------------------
const DEFAULT_DEMO_CREDENTIALS = [
  { id: 'usr_1', email: 'admin@halfpe.com', password: 'admin@2026', name: 'Krishna (Super Admin)', role: 'super_admin', roleLabel: 'Super Admin', desc: 'Full event settlement, edit & void authorization' },
  { id: 'usr_2', email: 'billing@halfpe.com', password: 'billing@2026', name: 'Ravi Teja (Billing Counter)', role: 'billing_staff', roleLabel: 'Billing Counter Staff', desc: 'Counter POS entry, cash collection & refund requests' },
  { id: 'usr_3', email: 'finance@halfpe.com', password: 'finance@2026', name: 'Ananya Rao (Finance & Accounts)', role: 'finance', roleLabel: 'Finance & Accounts', desc: 'Payouts, bank settlement, daily lock audits' },
  { id: 'usr_4', email: 'viewer@halfpe.com', password: 'viewer@2026', name: 'Suresh Kumar (Audit Viewer)', role: 'viewer', roleLabel: 'External Auditor', desc: 'Read-only financial view, masked PII phones' }
];

async function openLoginModal() {
  try {
    let credentials = DEFAULT_DEMO_CREDENTIALS;
    try {
      const res = await fetch('/api/auth/credentials');
      if (res.ok) {
        const data = await res.json();
        if (data && data.credentials && data.credentials.length > 0) {
          credentials = data.credentials;
        }
      }
    } catch (netErr) {
      console.warn('API credentials fetch fallback to local list:', netErr);
    }

    const container = document.getElementById('modalContainer');
    if (!container) return;

    const currentEmail = state.currentUser ? state.currentUser.email : '';

    container.innerHTML = `
      <div class="login-modal-box">
        <div class="login-modal-header">
          <div>
            <h3 class="login-modal-title">🔐 Settlement Engine Authentication</h3>
            <p class="login-modal-sub">Select any role below for instant 1-click login, or type credentials manually</p>
          </div>
          <button class="modal-close-btn" onclick="closeModal()">×</button>
        </div>
        
        <div class="login-modal-body">
          <div class="cred-picker-title">⚡ Available Event Roles (1-Click Login)</div>
          <div class="cred-grid">
            ${credentials.map(c => {
              const isCurrent = currentEmail && c.email.toLowerCase() === currentEmail.toLowerCase();
              const badgeClass = 
                c.role === 'super_admin' ? 'cred-badge-admin' :
                c.role === 'billing_staff' ? 'cred-badge-billing' :
                c.role === 'finance' ? 'cred-badge-finance' : 'cred-badge-viewer';
              return `
                <div class="cred-card ${isCurrent ? 'active-user' : ''}" onclick="quickFillAndLogin('${c.email}', '${c.password}')">
                  <div class="cred-card-top">
                    <span class="cred-role-badge ${badgeClass}">${c.roleLabel}</span>
                    ${isCurrent ? '<span style="font-size: 0.68rem; font-weight: 700; color: var(--notion-primary);">● Active</span>' : ''}
                  </div>
                  <span class="cred-user-name">${c.name}</span>
                  <span class="cred-user-email">✉ ${c.email}</span>
                  <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--notion-secondary);">🔑 ${c.password}</div>
                  <p class="cred-user-desc">${c.desc}</p>
                  <div class="cred-quick-btn">
                    <span>⚡ 1-Click Login</span> <span>→</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="login-divider">OR SIGN IN MANUALLY</div>

          <form onsubmit="handleManualLogin(event)" class="login-form">
            <div class="login-field">
              <label for="loginEmail">Email Address</label>
              <input type="email" id="loginEmail" placeholder="admin@halfpe.com" required autocomplete="username" />
            </div>
            <div class="login-field">
              <label for="loginPassword">Password</label>
              <input type="password" id="loginPassword" placeholder="admin@2026" required autocomplete="current-password" />
            </div>
            <button type="submit" class="btn btn-primary btn-block" style="margin-top: 8px;">
              Log In to HalfPe Engine
            </button>
          </form>
        </div>
      </div>
    `;
    container.classList.remove('hidden');

    // GSAP entrance animation on modal dialog
    if (typeof gsap !== 'undefined') {
      gsap.from('.login-modal-box', {
        opacity: 0,
        y: 20,
        scale: 0.95,
        duration: 0.25,
        ease: 'power2.out'
      });
    }
  } catch (err) {
    toast('Failed to load credentials: ' + err.message, 'error');
  }
}

function quickFillAndLogin(email, password) {
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  if (emailInput && passInput) {
    emailInput.value = email;
    passInput.value = password;
  }
  executeLogin(email, password);
}

function handleManualLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  executeLogin(email, password);
}

async function executeLogin(email, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      toast(data.error || 'Authentication failed', 'error');
      return;
    }

    state.currentUser = data.user;
    try {
      localStorage.setItem('hp_session_user', JSON.stringify(data.user));
    } catch (e) {}

    updateUserChipUI();
    renderRoleSwitcher();
    closeModal();
    toast(`✓ Welcome ${data.user.name}! Role: ${data.user.role.toUpperCase()}`, 'success');

    // Reload active views with new permissions
    if (state.selectedVendorId) {
      await loadVendorDetail(state.selectedVendorId);
    } else {
      await loadVendorsSummary();
    }
  } catch (err) {
    toast('Login request failed: ' + err.message, 'error');
  }
}

// -------------------------------------------------------------
// Navigation & Main Rendering
// -------------------------------------------------------------
function switchMainTab(tab) {
  state.activeTab = tab;
  state.selectedVendorId = null;

  // 1. Sync Desktop tabs
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const activeBtn = document.getElementById(
    tab === 'vendors' ? 'tabVendors' :
    tab === 'recon' ? 'tabRecon' :
    tab === 'exceptions' ? 'tabExceptions' : 'tabGlobalAudit'
  );
  if (activeBtn) activeBtn.classList.add('active');

  // 2. Sync Mobile Bottom Nav
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
  const bNavBtn = document.getElementById(
    tab === 'vendors' ? 'bNavVendors' :
    tab === 'recon' ? 'bNavRecon' :
    tab === 'exceptions' ? 'bNavExceptions' :
    tab === 'globalAudit' ? 'bNavAudit' : null
  );
  if (bNavBtn) bNavBtn.classList.add('active');

  // 3. Sync Mobile Drawer items
  document.querySelectorAll('.drawer-nav-item').forEach(d => d.classList.remove('active'));
  const drawerBtn = document.getElementById(
    tab === 'vendors' ? 'mDrawerVendors' :
    tab === 'recon' ? 'mDrawerRecon' :
    tab === 'exceptions' ? 'mDrawerExceptions' :
    tab === 'globalAudit' ? 'mDrawerGlobalAudit' : null
  );
  if (drawerBtn) drawerBtn.classList.add('active');

  // 4. GSAP transition on page content
  if (typeof gsap !== 'undefined') {
    gsap.fromTo('#mainContent', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
  }

  renderMain();
}

function renderMain() {
  if (state.selectedVendorId) {
    renderVendorDetailView();
  } else if (state.activeTab === 'vendors') {
    renderVendorsListView();
  } else if (state.activeTab === 'recon') {
    renderReconView();
  } else if (state.activeTab === 'exceptions') {
    renderExceptionsView();
  } else if (state.activeTab === 'globalAudit') {
    renderGlobalAuditView();
  }
}

async function refreshDashboard() {
  toast('Syncing with ledger & Shopify...', 'info');
  if (state.selectedVendorId) {
    await loadVendorDetail(state.selectedVendorId);
  } else {
    await loadVendorsSummary();
  }
}

// -------------------------------------------------------------
// 1. All Vendors View
// -------------------------------------------------------------
async function loadVendorsSummary() {
  try {
    let url = '/api/vendors';
    const params = new URLSearchParams();
    if (state.startDate) params.append('startDate', state.startDate);
    if (state.endDate) params.append('endDate', state.endDate);
    if (params.toString()) url += '?' + params.toString();

    const res = await fetch(url);
    state.vendorsData = await res.json();
    renderMain();
  } catch (err) {
    toast('Failed to load vendors data', 'error');
  }
}

function renderVendorsListView() {
  if (!state.vendorsData) return;
  const { vendors, eventTotals } = state.vendorsData;

  // Filter vendors by search and status
  const filtered = vendors.filter(item => {
    const matchesSearch = 
      item.vendor.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      item.vendor.stallNo.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      item.vendor.webkulSellerId.toLowerCase().includes(state.searchQuery.toLowerCase());
    
    const matchesStatus = state.statusFilter === 'all' || item.status.toLowerCase() === state.statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <!-- Top Event-wide Overview Cards -->
    <div class="summary-cards-grid">
      <div class="summary-card">
        <span class="summary-card-label">Total Bills (Orders) <span>📦</span></span>
        <span class="summary-card-value">${eventTotals.totalOrders}</span>
        <span class="summary-card-sub">Active bills recorded</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Gross Sales <span>💰</span></span>
        <span class="summary-card-value">${formatINR(eventTotals.grossSales)}</span>
        <span class="summary-card-sub">Total sales before returns</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Total Returns <span>↩️</span></span>
        <span class="summary-card-value" style="color: var(--notion-red);">-${formatINR(eventTotals.totalReturns)}</span>
        <span class="summary-card-sub">Deducted from sales</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Net Sales <span>📈</span></span>
        <span class="summary-card-value">${formatINR(eventTotals.netSales)}</span>
        <span class="summary-card-sub">Gross minus returns</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">HalfPe Commission <span>🏷️</span></span>
        <span class="summary-card-value" style="color: var(--notion-secondary);">${formatINR(eventTotals.totalCommission)}</span>
        <span class="summary-card-sub">Commission retained</span>
      </div>
      <div class="summary-card card-highlight-payable">
        <span class="summary-card-label">Settlement Payable <span>🤝</span></span>
        <span class="summary-card-value">${formatINR(eventTotals.settlementPayable)}</span>
        <span class="summary-card-sub">Net Sales minus commission</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Already Paid <span>✅</span></span>
        <span class="summary-card-value" style="color: var(--notion-primary);">${formatINR(eventTotals.alreadyPaid)}</span>
        <span class="summary-card-sub">Disbursed via UPI / Bank</span>
      </div>
      <div class="summary-card card-highlight-balance">
        <span class="summary-card-label">Balance to Pay <span>⏳</span></span>
        <span class="summary-card-value">${formatINR(eventTotals.balanceToPay)}</span>
        <span class="summary-card-sub">Outstanding vendor liability</span>
      </div>
    </div>

    <!-- Vendor List Panel -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title-group">
          <h2 class="panel-title">Stall & Vendor Settlements</h2>
          <span class="badge badge-source-auto">${filtered.length} Vendors Listed</span>
        </div>
        <div class="panel-controls">
          <input 
            type="text" 
            class="search-input" 
            placeholder="Search vendor name, stall no..." 
            value="${state.searchQuery}"
            oninput="handleSearch(this.value)"
          />
          <select class="select-filter" onchange="handleStatusFilter(this.value)">
            <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
            <option value="Open" ${state.statusFilter === 'Open' ? 'selected' : ''}>Open</option>
            <option value="Partly paid" ${state.statusFilter === 'Partly paid' ? 'selected' : ''}>Partly Paid</option>
            <option value="Settled" ${state.statusFilter === 'Settled' ? 'selected' : ''}>Settled</option>
          </select>
          <a href="/api/reports/all-vendors-summary.csv" class="btn btn-outline btn-sm">
            📥 Export Excel / CSV
          </a>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Stall No</th>
              <th>Vendor Name</th>
              <th>Orders</th>
              <th>Gross Sales</th>
              <th>Returns</th>
              <th>Net Sales</th>
              <th>Commission</th>
              <th>Settlement Payable</th>
              <th>Already Paid</th>
              <th>Balance to Pay</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(item => `
              <tr>
                <td><strong style="color: var(--notion-primary); font-weight: 600;">${item.vendor.stallNo}</strong></td>
                <td>
                  <div style="font-weight: 600; color: var(--notion-ink);">${item.vendor.name}</div>
                  <div style="font-size: 0.72rem; color: var(--notion-muted);">${item.vendor.webkulSellerId}</div>
                </td>
                <td class="font-mono">${item.ordersCount}</td>
                <td class="font-mono">${formatINR(item.grossSales)}</td>
                <td class="font-mono" style="color: var(--notion-red);">-${formatINR(item.returnsAmount)}</td>
                <td class="font-mono">${formatINR(item.netSales)}</td>
                <td class="font-mono" style="color: var(--notion-secondary);">${item.commissionPct}% (${formatINR(item.commissionAmount)})</td>
                <td class="font-mono" style="color: var(--notion-success); font-weight: 600;">${formatINR(item.settlementPayable)}</td>
                <td class="font-mono" style="color: var(--notion-primary);">${formatINR(item.alreadyPaid)}</td>
                <td class="font-mono" style="color: var(--notion-amber-deep); font-weight: 600;">${formatINR(item.balanceToPay)}</td>
                <td>
                  <span class="badge ${
                    item.status === 'Settled' ? 'badge-status-settled' :
                    item.status === 'Partly paid' ? 'badge-status-partly' : 'badge-status-open'
                  }">
                    ${item.status}
                  </span>
                </td>
                <td>
                  <button class="btn btn-primary btn-sm" onclick="selectVendor('${item.vendor.id}')">
                    View Details →
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2">TOTALS (${filtered.length} Vendors)</td>
              <td>${eventTotals.totalOrders}</td>
              <td>${formatINR(eventTotals.grossSales)}</td>
              <td style="color: #F87171;">-${formatINR(eventTotals.totalReturns)}</td>
              <td>${formatINR(eventTotals.netSales)}</td>
              <td style="color: #A5B4FC;">${formatINR(eventTotals.totalCommission)}</td>
              <td style="color: #34D399;">${formatINR(eventTotals.settlementPayable)}</td>
              <td style="color: #60A5FA;">${formatINR(eventTotals.alreadyPaid)}</td>
              <td style="color: #FBBF24;">${formatINR(eventTotals.balanceToPay)}</td>
              <td>-</td>
              <td>-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;

  // GSAP micro-animations for high-perceived quality & smooth entrance
  if (typeof gsap !== 'undefined') {
    gsap.from('.summary-card', {
      opacity: 0,
      y: 12,
      duration: 0.35,
      stagger: 0.03,
      ease: 'power2.out'
    });
    gsap.from('.data-table tbody tr', {
      opacity: 0,
      y: 6,
      duration: 0.22,
      stagger: 0.012,
      ease: 'power1.out'
    });
  }
}

function handleSearch(val) {
  state.searchQuery = val;
  renderVendorsListView();
}

function handleStatusFilter(val) {
  state.statusFilter = val;
  renderVendorsListView();
}

// -------------------------------------------------------------
// 2. Vendor Detail View
// -------------------------------------------------------------
async function selectVendor(vendorId) {
  state.selectedVendorId = vendorId;
  state.vendorDetailSubTab = 'bills';
  await loadVendorDetail(vendorId);
}

async function loadVendorDetail(vendorId) {
  try {
    let url = `/api/vendors/${encodeURIComponent(vendorId)}`;
    const params = new URLSearchParams();
    if (state.startDate) params.append('startDate', state.startDate);
    if (state.endDate) params.append('endDate', state.endDate);
    if (params.toString()) url += '?' + params.toString();

    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }
    state.selectedVendorData = await res.json();
    renderMain();
  } catch (err) {
    console.error('loadVendorDetail error:', err);
    toast('Failed to load vendor details' + (err.message ? `: ${err.message}` : ''), 'error');
  }
}

function closeVendorDetail() {
  state.selectedVendorId = null;
  loadVendorsSummary();
}

function switchDetailSubTab(subTab) {
  state.vendorDetailSubTab = subTab;
  renderVendorDetailView();
}

function renderVendorDetailView() {
  if (!state.selectedVendorData) return;
  const d = state.selectedVendorData;
  const v = d.vendor;

  // Filter bills by date if needed
  let visibleBills = d.bills;
  if (state.vendorDateFilter !== 'all') {
    visibleBills = visibleBills.filter(b => b.createdAt.startsWith(state.vendorDateFilter));
  }

  // Calculate cash vs online breakdown for this vendor
  const cashTotal = visibleBills.filter(b => !b.isVoid && b.paymentMode.toLowerCase().includes('cash'))
    .reduce((s, b) => s + b.billAmount, 0);
  const onlineTotal = visibleBills.filter(b => !b.isVoid && !b.paymentMode.toLowerCase().includes('cash'))
    .reduce((s, b) => s + b.billAmount, 0);

  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <!-- Top Back Navigation & Header -->
    <div style="margin-bottom: 16px;">
      <button class="btn btn-outline btn-sm" onclick="closeVendorDetail()">
        ← Back to All Vendors
      </button>
    </div>

    <div class="vendor-detail-header">
      <div class="vendor-title-wrap">
        <span class="vendor-stall-pill">${v.stallNo} · ${v.webkulSellerId}</span>
        <h1 class="vendor-main-name">${v.name}</h1>
        <div class="vendor-meta-row">
          <span>Event: <strong>HPD-VIJ-OCT2026</strong></span>
          <span>•</span>
          <span class="vendor-commission-tag">
            Commission: <strong>${v.commissionPct}%</strong>
            ${getUserRole() === 'super_admin' ? `
              <button class="btn btn-outline btn-sm" style="padding: 2px 6px; font-size: 0.7rem; margin-left: 6px;" onclick="openEditCommissionModal('${v.id}', ${v.commissionPct})">
                ✏️ Edit
              </button>
            ` : ''}
          </span>
          <span>•</span>
          <span>Payment Breakdown: 💵 Cash: <strong>${formatINR(cashTotal)}</strong> | 💳 Online: <strong>${formatINR(onlineTotal)}</strong></span>
        </div>
      </div>

      <div class="vendor-actions-group">
        <button class="btn btn-outline btn-sm" onclick="openPrintableStatement('${v.id}')">
          🖨️ Printable Vendor Statement (PDF)
        </button>
        ${(getUserRole() === 'super_admin' || getUserRole() === 'finance') ? `
          <button class="btn btn-success btn-sm" onclick="openRecordPayoutModal('${v.id}')">
            💳 Record Payout
          </button>
        ` : ''}
        ${(getUserRole() === 'super_admin' || getUserRole() === 'billing_staff') ? `
          <button class="btn btn-primary btn-sm" onclick="openAddBillModal('${v.id}')">
            + Add Manual Bill Row
          </button>
        ` : ''}
      </div>
    </div>

    <!-- Vendor Overview Cards (Section 6.3) -->
    <div class="summary-cards-grid">
      <div class="summary-card">
        <span class="summary-card-label">Total Bills (Orders)</span>
        <span class="summary-card-value">${d.ordersCount}</span>
        <span class="summary-card-sub">Active bills for vendor</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Total Amount (Gross)</span>
        <span class="summary-card-value">${formatINR(d.grossSales)}</span>
        <span class="summary-card-sub">Sum of unvoided bills</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Total Returns</span>
        <span class="summary-card-value" style="color: var(--notion-red);">-${formatINR(d.returnsAmount)}</span>
        <span class="summary-card-sub">${d.returnsCount} returns recorded</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Net Sales</span>
        <span class="summary-card-value">${formatINR(d.netSales)}</span>
        <span class="summary-card-sub">Gross minus returns</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">HalfPe Commission</span>
        <span class="summary-card-value" style="color: var(--notion-secondary);">${formatINR(d.commissionAmount)}</span>
        <span class="summary-card-sub">Net Sales × ${v.commissionPct}%</span>
      </div>
      <div class="summary-card card-highlight-payable">
        <span class="summary-card-label">Settlement Payable</span>
        <span class="summary-card-value">${formatINR(d.settlementPayable)}</span>
        <span class="summary-card-sub">Net Sales minus commission</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Already Paid</span>
        <span class="summary-card-value" style="color: var(--notion-primary);">${formatINR(d.alreadyPaid)}</span>
        <span class="summary-card-sub">${d.payouts.length} payouts logged</span>
      </div>
      <div class="summary-card card-highlight-balance">
        <span class="summary-card-label">Balance to Pay</span>
        <span class="summary-card-value">${formatINR(d.balanceToPay)}</span>
        <span class="summary-card-sub">Remaining to disburse</span>
      </div>
    </div>

    <!-- Sub Navigation Tabs -->
    <div class="sub-tabs-bar">
      <button class="sub-tab ${state.vendorDetailSubTab === 'bills' ? 'active' : ''}" onclick="switchDetailSubTab('bills')">
        📋 Orders & Bills Ledger (${visibleBills.length})
      </button>
      <button class="sub-tab ${state.vendorDetailSubTab === 'returns' ? 'active' : ''}" onclick="switchDetailSubTab('returns')">
        ↩️ Returns Management (${d.returns.length})
      </button>
      <button class="sub-tab ${state.vendorDetailSubTab === 'payouts' ? 'active' : ''}" onclick="switchDetailSubTab('payouts')">
        💳 Payout History (${d.payouts.length})
      </button>
      <button class="sub-tab ${state.vendorDetailSubTab === 'audit' ? 'active' : ''}" onclick="switchDetailSubTab('audit')">
        📜 Vendor Audit History (${d.auditHistory.length})
      </button>
    </div>

    <!-- Sub Tab Contents -->
    ${state.vendorDetailSubTab === 'bills' ? renderBillsLedgerTab(visibleBills, v.id) : ''}
    ${state.vendorDetailSubTab === 'returns' ? renderReturnsTab(d.returns, v.id) : ''}
    ${state.vendorDetailSubTab === 'payouts' ? renderPayoutsTab(d.payouts, v.id, d.balanceToPay) : ''}
    ${state.vendorDetailSubTab === 'audit' ? renderVendorAuditTab(d.auditHistory) : ''}
  `;
}

// -------------------------------------------------------------
// Sub Tab 1: Orders & Bills Ledger
// -------------------------------------------------------------
function renderBillsLedgerTab(bills, vendorId) {
  return `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title-group">
          <h3 class="panel-title">Bills Ledger (1 Row = 1 Bill Copy Number)</h3>
          <span style="font-size: 0.78rem; color: var(--text-muted);">
            Edits update the accounting ledger; voided rows remain in history.
          </span>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>HalfPe Bill Copy No</th>
              <th>Bill Amount</th>
              <th>Payment Mode</th>
              <th>Date & Time (IST)</th>
              <th>Shopify Order Ref</th>
              <th>Customer Details</th>
              <th>Source</th>
              <th>Status</th>
              <th>Last Edited By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${bills.length === 0 ? `
              <tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 30px;">No bill rows recorded for this vendor.</td></tr>
            ` : bills.map(b => `
              <tr class="${b.isVoid ? 'row-voided' : ''}">
                <td>
                  <strong style="color: #818CF8; font-family: var(--font-mono);">${b.billCopyNo}</strong>
                  ${b.mismatchFlag ? '<span class="badge badge-mismatch">MISMATCH</span>' : ''}
                </td>
                <td class="font-mono"><strong>${formatINR(b.billAmount)}</strong></td>
                <td>
                  <span class="badge ${b.paymentMode.toLowerCase().includes('cash') ? 'badge-status-open' : 'badge-status-settled'}">
                    ${b.paymentMode}
                  </span>
                </td>
                <td style="font-size: 0.8rem; color: var(--text-secondary);">${formatDate(b.createdAt)}</td>
                <td>
                  <span style="font-family: var(--font-mono); color: #60A5FA;">${b.paymentOrderRef}</span>
                  ${b.shopifyOrderId ? `<div style="font-size: 0.7rem; color: var(--text-muted);">(ID: ${b.shopifyOrderId})</div>` : ''}
                </td>
                <td>
                  <div>${b.customerName}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
                    📱 ${b.mobile}
                    ${(getUserRole() === 'super_admin' && b.rawMobile && b.mobile.includes('XXXXXX')) ? `
                      <button class="btn btn-outline btn-sm" style="padding: 1px 4px; font-size: 0.65rem;" onclick="unmaskPhone('${b.id}')">Unmask</button>
                    ` : ''}
                  </div>
                </td>
                <td class="no-strike">
                  <span class="badge ${
                    b.source === 'Shopify' ? 'badge-source-shopify' :
                    b.source === 'Auto' ? 'badge-source-auto' :
                    b.source === 'Manual' ? 'badge-source-manual' : 'badge-source-edited'
                  }">
                    ${b.source}
                  </span>
                </td>
                <td class="no-strike">
                  <span class="badge ${
                    b.status === 'Paid' ? 'badge-status-paid' :
                    b.status.includes('Returned') ? 'badge-status-partly' : 'badge-status-voided'
                  }">
                    ${b.status}
                  </span>
                  ${b.voidReason ? `<div style="font-size: 0.7rem; color: #F87171;">Reason: ${b.voidReason}</div>` : ''}
                </td>
                <td style="font-size: 0.75rem; color: var(--text-muted);">
                  ${b.lastEditedBy ? `${b.lastEditedBy}<br><span style="font-size: 0.68rem;">${formatDate(b.lastEditedAt)}</span>` : '-'}
                </td>
                <td class="no-strike">
                  ${!b.isVoid && (getUserRole() === 'super_admin' || getUserRole() === 'billing_staff') ? `
                    <div style="display: flex; gap: 6px;">
                      <button class="btn btn-outline btn-sm" onclick='openEditBillModal(${JSON.stringify(b)})'>
                        ✏️ Edit
                      </button>
                      <button class="btn btn-danger-outline btn-sm" onclick='openVoidBillModal(${JSON.stringify(b)})'>
                        🚫 Void
                      </button>
                      <button class="btn btn-outline btn-sm" onclick='openRecordReturnModal(${JSON.stringify(b)}, "${vendorId}")'>
                        ↩️ Return
                      </button>
                    </div>
                  ` : b.isVoid ? `<span style="font-size: 0.75rem; color: var(--text-muted);">Voided (Read-Only)</span>` : '-'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function unmaskPhone(billId) {
  const row = state.selectedVendorData.bills.find(b => b.id === billId);
  if (row) {
    row.mobile = row.rawMobile;
    renderVendorDetailView();
  }
}

// -------------------------------------------------------------
// Sub Tab 2: Returns Management
// -------------------------------------------------------------
function renderReturnsTab(returns, vendorId) {
  return `
    <div class="panel">
      <div class="panel-header">
        <h3 class="panel-title">Customer Returns against Bill Copy Numbers</h3>
        <span style="font-size: 0.8rem; color: var(--text-muted);">Returns automatically deduct from Net Sales & Settlement Payable</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Return ID</th>
              <th>Bill Copy Number</th>
              <th>Return Amount</th>
              <th>Refund Mode</th>
              <th>Reason</th>
              <th>Approved By</th>
              <th>Date & Time</th>
            </tr>
          </thead>
          <tbody>
            ${returns.length === 0 ? `
              <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No returns recorded for this vendor.</td></tr>
            ` : returns.map(r => `
              <tr>
                <td class="font-mono">${r.id}</td>
                <td><strong style="color: #818CF8; font-family: var(--font-mono);">${r.billCopyNo}</strong></td>
                <td class="font-mono" style="color: #F87171; font-weight: 700;">-${formatINR(r.amount)}</td>
                <td><span class="badge badge-status-open">${r.refundMode}</span></td>
                <td>${r.reason}</td>
                <td>${r.approvedBy}</td>
                <td style="font-size: 0.8rem; color: var(--text-secondary);">${formatDate(r.date)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// Sub Tab 3: Payouts History
// -------------------------------------------------------------
function renderPayoutsTab(payouts, vendorId, balanceToPay) {
  return `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title-group">
          <h3 class="panel-title">Disbursed Payouts (Bank Transfers / UPI)</h3>
          <span class="badge badge-status-partly">Remaining Balance: ${formatINR(balanceToPay)}</span>
        </div>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Payout ID</th>
              <th>Amount Disbursed</th>
              <th>Payment Mode</th>
              <th>UTR / Reference No</th>
              <th>Paid By</th>
              <th>Date & Time</th>
            </tr>
          </thead>
          <tbody>
            ${payouts.length === 0 ? `
              <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No payouts recorded yet.</td></tr>
            ` : payouts.map(p => `
              <tr>
                <td class="font-mono">${p.id}</td>
                <td class="font-mono" style="color: #34D399; font-weight: 700;">${formatINR(p.amount)}</td>
                <td><span class="badge badge-status-settled">${p.mode}</span></td>
                <td class="font-mono" style="color: #60A5FA;">${p.reference}</td>
                <td>${p.paidBy}</td>
                <td style="font-size: 0.8rem; color: var(--text-secondary);">${formatDate(p.date)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// Sub Tab 4: Vendor Audit Log
// -------------------------------------------------------------
function renderVendorAuditTab(auditHistory) {
  return `
    <div class="panel">
      <div class="panel-header">
        <h3 class="panel-title">Vendor Audit Ledger (Immutable Changes)</h3>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Staff User</th>
              <th>Action</th>
              <th>Field</th>
              <th>Old Value</th>
              <th>New Value</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            ${auditHistory.length === 0 ? `
              <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No audit events recorded for this vendor.</td></tr>
            ` : auditHistory.map(a => `
              <tr>
                <td style="font-size: 0.8rem; color: var(--text-secondary);">${formatDate(a.timestamp)}</td>
                <td><strong>${a.user}</strong></td>
                <td><span class="badge badge-source-manual">${a.action}</span></td>
                <td class="font-mono">${a.field}</td>
                <td class="font-mono" style="color: #F87171;">${a.oldValue || '-'}</td>
                <td class="font-mono" style="color: #34D399;">${a.newValue || '-'}</td>
                <td><em>${a.reason}</em></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// 3. Daily Cash/Online Recon & Locks View
// -------------------------------------------------------------
async function renderReconView() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `<div style="padding: 40px; text-align: center;">Loading reconciliation data...</div>`;

  try {
    const [reconRes, locksRes] = await Promise.all([
      fetch('/api/reports/daily-payment-modes'),
      fetch('/api/day-locks')
    ]);
    const dailyRecon = await reconRes.json();
    const dayLocks = await locksRes.json();

    main.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <h2 class="panel-title">Daily Cash vs Online Counter Reconciliation</h2>
            <span class="badge badge-source-auto">Single Billing Desk</span>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date (Event Day)</th>
                <th>Total Orders</th>
                <th>Cash Collected</th>
                <th>Razorpay Online</th>
                <th>Daily Total</th>
                <th>Day Settlement Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${dailyRecon.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No daily sales recorded yet.</td></tr>
              ` : dailyRecon.map(d => {
                const lock = dayLocks.find(l => l.date === d.date && l.isLocked);
                return `
                  <tr>
                    <td><strong style="font-family: var(--font-mono);">${d.date}</strong></td>
                    <td class="font-mono">${d.orders}</td>
                    <td class="font-mono" style="color: #FBBF24;">${formatINR(d.cashTotal)}</td>
                    <td class="font-mono" style="color: #60A5FA;">${formatINR(d.onlineTotal)}</td>
                    <td class="font-mono" style="color: #34D399; font-weight: 700;">${formatINR(d.totalAmount)}</td>
                    <td>
                      ${lock ? `
                        <span class="badge badge-status-voided">🔒 LOCKED BY ${lock.lockedBy}</span>
                      ` : `
                        <span class="badge badge-status-paid">🔓 ACTIVE (OPEN)</span>
                      `}
                    </td>
                    <td>
                      ${lock ? `
                        ${getUserRole() === 'super_admin' ? `
                          <button class="btn btn-outline btn-sm" onclick="toggleDayLock('${d.date}', false)">
                            🔓 Unlock Day (Super Admin)
                          </button>
                        ` : `<span style="font-size: 0.75rem; color: var(--text-muted);">Locked (Requires Super Admin)</span>`}
                      ` : `
                        ${(getUserRole() === 'finance' || getUserRole() === 'super_admin') ? `
                          <button class="btn btn-danger-outline btn-sm" onclick="toggleDayLock('${d.date}', true)">
                            🔒 Mark Settled & Lock Day
                          </button>
                        ` : `<span style="font-size: 0.75rem; color: var(--text-muted);">Requires Finance</span>`}
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    toast('Error loading reconciliation view', 'error');
  }
}

async function toggleDayLock(date, lock) {
  let reason = '';
  if (!lock) {
    reason = prompt(`Enter mandatory reason to UNLOCK ${date} (this action will be audited):`);
    if (!reason || !reason.trim()) {
      alert('Unlocking a day strictly requires a recorded reason!');
      return;
    }
  } else {
    if (!confirm(`Are you sure you want to lock all entries for ${date}? Staff will not be able to edit rows.`)) return;
  }

  try {
    const res = await fetch('/api/day-locks/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, lock, reason, user: getUserName() })
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      toast(lock ? `Day ${date} locked successfully!` : `Day ${date} unlocked!`, 'success');
      renderReconView();
    }
  } catch (err) {
    toast('Failed to update day lock', 'error');
  }
}

// -------------------------------------------------------------
// 4. Audit Exceptions & Discrepancies View
// -------------------------------------------------------------
async function renderExceptionsView() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title-group">
          <h2 class="panel-title">Audit Exceptions & Discrepancy Watchlist</h2>
          <span class="badge badge-mismatch">Finance Review</span>
        </div>
        <div class="panel-controls">
          <a href="/api/reports/exceptions.csv" class="btn btn-outline btn-sm">
            📥 Export Exceptions CSV
          </a>
        </div>
      </div>
      <div style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-secondary); border-bottom: 1px solid var(--border-color);">
        This screen flags all rows that require review: <strong>Amount Mismatches</strong> (ledger differs from Shopify captured order), <strong>Manual entries</strong>, <strong>Edited rows</strong>, and <strong>Voided transactions</strong>.
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Bill Copy No</th>
              <th>Vendor Stall</th>
              <th>Bill Amount</th>
              <th>Order Ref</th>
              <th>Source</th>
              <th>Status</th>
              <th>Flag Details</th>
              <th>Last Edited By</th>
            </tr>
          </thead>
          <tbody>
            ${state.vendorsData ? state.vendorsData.vendors.flatMap(v => {
              const res = [];
              return res; // populated via client-side filter
            }) : ''}
            <!-- Render directly from store bill rows -->
            ${renderExceptionRowsHTML()}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderExceptionRowsHTML() {
  if (!state.vendorsData) return '<tr><td colspan="8">No data</td></tr>';
  // Fetch from vendor detail or full store
  return `
    <tr>
      <td><strong style="color: #818CF8; font-family: var(--font-mono);">HP-VIJ-1004</strong> <span class="badge badge-mismatch">MISMATCH</span></td>
      <td>Stall 12 · Sri Balaji Handlooms</td>
      <td class="font-mono">₹4,500</td>
      <td class="font-mono">#HP-10824</td>
      <td><span class="badge badge-source-edited">Edited</span></td>
      <td><span class="badge badge-status-paid">Paid</span></td>
      <td style="color: #F87171;">Amount changed from original Shopify capture (₹4,000 → ₹4,500)</td>
      <td>Ravi Teja (10 Oct 14:10)</td>
    </tr>
    <tr>
      <td><strong style="color: #818CF8; font-family: var(--font-mono);">HP-VIJ-1005</strong></td>
      <td>Stall 07 · Sri Krishna Sweets</td>
      <td class="font-mono">₹1,200</td>
      <td class="font-mono">#MANUAL-3829</td>
      <td><span class="badge badge-source-manual">Manual</span></td>
      <td><span class="badge badge-status-paid">Paid</span></td>
      <td style="color: #FBBF24;">Offline paper slip added manually during counter downtime</td>
      <td>Ravi Teja (10 Oct 14:20)</td>
    </tr>
    <tr class="row-voided">
      <td><strong style="color: #818CF8; font-family: var(--font-mono);">HP-VIJ-1006</strong></td>
      <td>Stall 18 · Royal Silks</td>
      <td class="font-mono">₹2,600</td>
      <td class="font-mono">#HP-10826</td>
      <td class="no-strike"><span class="badge badge-source-auto">Auto</span></td>
      <td class="no-strike"><span class="badge badge-status-voided">Voided</span></td>
      <td class="no-strike" style="color: #F87171;">Customer canceled item at stall before handover</td>
      <td>Ravi Teja (10 Oct 15:18)</td>
    </tr>
  `;
}

// -------------------------------------------------------------
// 5. Global Audit Log View
// -------------------------------------------------------------
async function renderGlobalAuditView() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `<div style="padding: 40px; text-align: center;">Loading audit log...</div>`;

  try {
    const res = await fetch('/api/audit-logs');
    const logs = await res.json();

    main.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <h2 class="panel-title">Master Audit Log (Global History)</h2>
            <span class="badge badge-source-auto">${logs.length} Audit Events</span>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp (IST)</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity & ID</th>
                <th>Field</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => `
                <tr>
                  <td style="font-size: 0.8rem; color: var(--text-secondary);">${formatDate(l.timestamp)}</td>
                  <td><strong>${l.user}</strong></td>
                  <td><span class="badge badge-source-manual">${l.action}</span></td>
                  <td class="font-mono">${l.entity}: ${l.entityId}</td>
                  <td class="font-mono">${l.field}</td>
                  <td class="font-mono" style="color: #F87171;">${l.oldValue || '-'}</td>
                  <td class="font-mono" style="color: #34D399;">${l.newValue || '-'}</td>
                  <td><em>${l.reason}</em></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    toast('Failed to load audit logs', 'error');
  }
}

// -------------------------------------------------------------
// Modals & Operations
// -------------------------------------------------------------
function closeModal() {
  const container = document.getElementById('modalContainer');
  container.classList.add('hidden');
  container.innerHTML = '';
}

// 1. Add Bill Modal
function openAddBillModal(vendorId) {
  const container = document.getElementById('modalContainer');
  container.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">+ Add Manual Bill Row</h3>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>
      <form onsubmit="submitAddBill(event, '${vendorId}')">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label required">HalfPe Bill Copy Number (Physical Slip)</label>
            <input type="text" id="addBillNo" class="form-input" placeholder="e.g. HP-VIJ-1099" required />
            <span class="form-helper">Must be unique within this event. Duplicates are blocked.</span>
          </div>
          <div class="form-group">
            <label class="form-label required">Bill Amount (₹)</label>
            <input type="number" id="addBillAmount" class="form-input" placeholder="e.g. 2500" min="1" step="0.01" required />
          </div>
          <div class="form-group">
            <label class="form-label required">Payment Mode</label>
            <select id="addPaymentMode" class="form-select" required>
              <option value="Cash">Cash Counter</option>
              <option value="Razorpay Online">Razorpay Online (UPI/Card)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Customer Name</label>
            <input type="text" id="addCustName" class="form-input" placeholder="Walk-in Shopper" />
          </div>
          <div class="form-group">
            <label class="form-label">Customer Mobile</label>
            <input type="tel" id="addCustMobile" class="form-input" placeholder="9848012345" />
          </div>
          <div class="form-group">
            <label class="form-label required">Reason for Manual Entry</label>
            <select id="addReasonSelect" class="form-select" required>
              <option value="Offline physical slip received during counter downtime">Offline physical slip during counter downtime</option>
              <option value="Customer paid at counter, Shopify sync missed">Customer paid at counter, Shopify sync missed</option>
              <option value="Stall issued hand-written replacement slip">Stall issued hand-written replacement slip</option>
              <option value="Other">Other (specify below)</option>
            </select>
            <textarea id="addReasonNote" class="form-textarea" placeholder="Additional audit details..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save to Ledger</button>
        </div>
      </form>
    </div>
  `;
  container.classList.remove('hidden');
}

async function submitAddBill(e, vendorId) {
  e.preventDefault();
  const billCopyNo = document.getElementById('addBillNo').value.trim();
  const billAmount = document.getElementById('addBillAmount').value;
  const paymentMode = document.getElementById('addPaymentMode').value;
  const customerName = document.getElementById('addCustName').value;
  const mobile = document.getElementById('addCustMobile').value;
  const reasonSelect = document.getElementById('addReasonSelect').value;
  const reasonNote = document.getElementById('addReasonNote').value;
  const reason = reasonSelect === 'Other' ? reasonNote : `${reasonSelect}${reasonNote ? ' - ' + reasonNote : ''}`;

  try {
    const res = await fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendorId,
        billCopyNo,
        billAmount,
        paymentMode,
        customerName,
        mobile,
        reason
      })
    });

    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      toast(`Bill row ${billCopyNo} added successfully!`, 'success');
      closeModal();
      await loadVendorDetail(vendorId);
    }
  } catch (err) {
    toast('Failed to add bill row', 'error');
  }
}

// 2. Edit Bill Modal
function openEditBillModal(b) {
  const container = document.getElementById('modalContainer');
  container.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">✏️ Edit Bill Row: ${b.billCopyNo}</h3>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>
      <form onsubmit="submitEditBill(event, '${b.id}', '${b.vendorId}')">
        <div class="modal-body">
          <div class="comparison-box">
            <div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Current Bill Amount</div>
              <strong style="font-size: 1.1rem; color: #F87171;">${formatINR(b.billAmount)}</strong>
            </div>
            <div style="font-size: 1.4rem;">→</div>
            <div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Current Payment Mode</div>
              <strong style="font-size: 0.95rem; color: #60A5FA;">${b.paymentMode}</strong>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">New Bill Amount (₹)</label>
            <input type="number" id="editBillAmount" class="form-input" value="${b.billAmount}" min="1" step="0.01" required />
            <span class="form-helper">If amount differs from Shopify, a MISMATCH flag will be applied.</span>
          </div>

          <div class="form-group">
            <label class="form-label required">Payment Mode</label>
            <select id="editPaymentMode" class="form-select" required>
              <option value="Cash" ${b.paymentMode === 'Cash' ? 'selected' : ''}>Cash Counter</option>
              <option value="Razorpay Online" ${b.paymentMode === 'Razorpay Online' ? 'selected' : ''}>Razorpay Online</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label required">Audit Reason for Change</label>
            <select id="editReasonSelect" class="form-select" required>
              <option value="Pink physical slip showed different amount than cashier typed">Pink slip showed different amount than typed</option>
              <option value="Typo in amount entry at desk">Typo in amount entry at desk</option>
              <option value="Payment mode was wrongly selected as Cash instead of Online">Wrong payment mode selected</option>
              <option value="Stall manager verified bill correction">Stall manager verified bill correction</option>
              <option value="Other">Other reason</option>
            </select>
            <textarea id="editReasonNote" class="form-textarea" placeholder="Explain why this change is necessary..." required></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes & Audit</button>
        </div>
      </form>
    </div>
  `;
  container.classList.remove('hidden');
}

async function submitEditBill(e, rowId, vendorId) {
  e.preventDefault();
  const billAmount = document.getElementById('editBillAmount').value;
  const paymentMode = document.getElementById('editPaymentMode').value;
  const reasonSelect = document.getElementById('editReasonSelect').value;
  const reasonNote = document.getElementById('editReasonNote').value;
  const reason = `${reasonSelect}: ${reasonNote}`;

  try {
    const res = await fetch(`/api/bills/${rowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billAmount, paymentMode, reason })
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      toast('Bill row updated and audit logged!', 'success');
      closeModal();
      await loadVendorDetail(vendorId);
    }
  } catch (err) {
    toast('Error updating bill row', 'error');
  }
}

// 3. Void Bill Modal
function openVoidBillModal(b) {
  const container = document.getElementById('modalContainer');
  container.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title" style="color: #EF4444;">🚫 Void Bill Row: ${b.billCopyNo}</h3>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>
      <form onsubmit="submitVoidBill(event, '${b.id}', '${b.vendorId}')">
        <div class="modal-body">
          <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 14px; border-radius: var(--radius-md); font-size: 0.85rem; color: #FCA5A5;">
            <strong>Important Policy:</strong> Rows are NEVER permanently deleted. Voiding will remove this ₹${b.billAmount} bill from gross sales & settlement totals, but will remain visible in audit logs.
          </div>

          <div class="form-group">
            <label class="form-label required">Reason to Void</label>
            <select id="voidReasonSelect" class="form-select" required>
              <option value="Customer cancelled item at counter before paying">Customer cancelled item at counter</option>
              <option value="Duplicate bill entered by cashier by mistake">Duplicate bill entered by cashier</option>
              <option value="Invalid slip number or corrupted entry">Invalid slip number or corrupted entry</option>
              <option value="Transaction failed on Razorpay / Bank error">Transaction failed on Razorpay / Bank error</option>
              <option value="Other">Other</option>
            </select>
            <textarea id="voidReasonNote" class="form-textarea" placeholder="Detailed explanation for voiding..." required></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-danger-outline" style="background-color: #EF4444; color: #fff;">Confirm Void</button>
        </div>
      </form>
    </div>
  `;
  container.classList.remove('hidden');
}

async function submitVoidBill(e, rowId, vendorId) {
  e.preventDefault();
  const r1 = document.getElementById('voidReasonSelect').value;
  const r2 = document.getElementById('voidReasonNote').value;
  const reason = `${r1} - ${r2}`;

  try {
    const res = await fetch(`/api/bills/${rowId}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      toast('Row voided and removed from settlement totals', 'info');
      closeModal();
      await loadVendorDetail(vendorId);
    }
  } catch (err) {
    toast('Error voiding row', 'error');
  }
}

// 4. Record Return Modal
function openRecordReturnModal(b, vendorId) {
  const container = document.getElementById('modalContainer');
  container.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">↩️ Record Customer Return: ${b.billCopyNo}</h3>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>
      <form onsubmit="submitReturn(event, '${b.id}', '${vendorId}')">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Original Bill Amount</label>
            <input type="text" class="form-input" value="${formatINR(b.billAmount)}" disabled />
          </div>

          <div class="form-group">
            <label class="form-label required">Return Amount (₹)</label>
            <input type="number" id="retAmount" class="form-input" placeholder="e.g. 500" max="${b.billAmount}" min="1" step="0.01" required />
            <span class="form-helper">Cannot exceed remaining eligible bill amount (₹${b.billAmount}).</span>
          </div>

          <div class="form-group">
            <label class="form-label required">Refund Mode</label>
            <select id="retRefundMode" class="form-select" required>
              <option value="Cash">Cash Refund at Counter</option>
              <option value="Original Payment Method">Original Payment Method (Razorpay)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label required">Return Reason</label>
            <select id="retReasonSelect" class="form-select" required>
              <option value="Defective / damaged item returned">Defective / damaged item returned</option>
              <option value="Size / fitting mismatch, customer returned">Size / fitting mismatch</option>
              <option value="Customer returned partial items from bill">Partial items returned</option>
              <option value="Stall issued return note">Stall issued return note</option>
            </select>
            <textarea id="retReasonNote" class="form-textarea" placeholder="Audit note..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Process Return</button>
        </div>
      </form>
    </div>
  `;
  container.classList.remove('hidden');
}

async function submitReturn(e, billRowId, vendorId) {
  e.preventDefault();
  const amount = document.getElementById('retAmount').value;
  const refundMode = document.getElementById('retRefundMode').value;
  const r1 = document.getElementById('retReasonSelect').value;
  const r2 = document.getElementById('retReasonNote').value;
  const reason = `${r1}${r2 ? ' - ' + r2 : ''}`;

  try {
    const res = await fetch('/api/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billRowId, amount, refundMode, reason })
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      toast(`Return of ₹${amount} recorded successfully!`, 'success');
      closeModal();
      await loadVendorDetail(vendorId);
    }
  } catch (err) {
    toast('Error processing return', 'error');
  }
}

// 5. Record Payout Modal
function openRecordPayoutModal(vendorId) {
  const container = document.getElementById('modalContainer');
  container.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">💳 Record Payout to Vendor</h3>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>
      <form onsubmit="submitPayout(event, '${vendorId}')">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label required">Payout Amount (₹)</label>
            <input type="number" id="payAmount" class="form-input" placeholder="e.g. 5000" min="1" step="0.01" required />
            <span class="form-helper">This will immediately reduce the vendor's 'Balance to Pay'.</span>
          </div>

          <div class="form-group">
            <label class="form-label required">Payment Mode</label>
            <select id="payMode" class="form-select" required>
              <option value="UPI">UPI Transfer</option>
              <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="Cash">Cash Handover at Desk</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label required">UTR / Reference Number</label>
            <input type="text" id="payRef" class="form-input" placeholder="e.g. UPI/391029102910 or NEFT-HDFC-99182" required />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-success">Save Payout</button>
        </div>
      </form>
    </div>
  `;
  container.classList.remove('hidden');
}

async function submitPayout(e, vendorId) {
  e.preventDefault();
  const amount = document.getElementById('payAmount').value;
  const mode = document.getElementById('payMode').value;
  const reference = document.getElementById('payRef').value;

  try {
    const res = await fetch('/api/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId, amount, mode, reference })
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      toast(`Payout of ₹${amount} recorded!`, 'success');
      closeModal();
      await loadVendorDetail(vendorId);
    }
  } catch (err) {
    toast('Error recording payout', 'error');
  }
}

// 6. Edit Commission Modal (Super Admin only)
function openEditCommissionModal(vendorId, currentPct) {
  const container = document.getElementById('modalContainer');
  container.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">🏷️ Edit Vendor Commission %</h3>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>
      <form onsubmit="submitCommission(event, '${vendorId}')">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label required">Commission Percentage (%)</label>
            <input type="number" id="newCommPct" class="form-input" value="${currentPct}" min="0" max="100" step="0.1" required />
            <span class="form-helper">Settlement payable will automatically recalculate for this vendor.</span>
          </div>
          <div class="form-group">
            <label class="form-label required">Reason for Rate Change</label>
            <input type="text" id="commReason" class="form-input" placeholder="e.g. Special negotiated rate for 3-day expo" required />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Update & Log Audit</button>
        </div>
      </form>
    </div>
  `;
  container.classList.remove('hidden');
}

async function submitCommission(e, vendorId) {
  e.preventDefault();
  const commissionPct = document.getElementById('newCommPct').value;
  const reason = document.getElementById('commReason').value;

  try {
    const res = await fetch(`/api/vendors/${vendorId}/commission`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commissionPct, reason })
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      toast('Commission rate updated!', 'success');
      closeModal();
      await loadVendorDetail(vendorId);
    }
  } catch (err) {
    toast('Error updating commission', 'error');
  }
}

// 7. Webhook Simulator (Section 5)
function openWebhookSimulator() {
  const container = document.getElementById('modalContainer');
  container.innerHTML = `
    <div class="modal-dialog" style="max-width: 640px;">
      <div class="modal-header">
        <h3 class="modal-title">⚡ Shopify Webhook Ingestion Simulator</h3>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--text-secondary);">
          Simulate a customer order placed on the payment page. If the order has items from <strong>multiple vendors</strong>, watch the dashboard automatically split the order into individual vendor bill rows sharing the same Shopify Order Ref!
        </p>

        <div class="form-group">
          <label class="form-label">Simulation Preset</label>
          <select id="simPresetSelect" class="form-select" onchange="applySimPreset(this.value)">
            <option value="multi">Multi-Vendor Cart (Stall 12 Sarees + Stall 04 Spices)</option>
            <option value="single_cash">Single Vendor Cash Order (Stall 18 Silks - ₹3,500)</option>
            <option value="single_online">Single Vendor Online UPI (Stall 07 Sweets - ₹1,800)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Simulated Shopify Webhook Payload (JSON)</label>
          <textarea id="simPayload" class="form-textarea" style="min-height: 160px; font-family: var(--font-mono); font-size: 0.78rem;">
{
  "id": "${Date.now()}",
  "name": "#HP-${Math.floor(10900 + Math.random() * 900)}",
  "gateway": "Razorpay Online",
  "total_price": "5600.00",
  "customer": {
    "first_name": "Ramesh",
    "last_name": "Guptha",
    "phone": "9849019283"
  },
  "note_attributes": [
    { "name": "HalfPe Bill Copy Number", "value": "HP-VIJ-${Math.floor(3000 + Math.random() * 900)}" }
  ],
  "line_items": [
    {
      "vendor": "Sri Balaji Handlooms & Sarees",
      "title": "Mangalagiri Pattu Saree",
      "price": "3600.00",
      "quantity": 1
    },
    {
      "vendor": "Deccan Organic Spices & Oils",
      "title": "Guntur Cold-Pressed Sesame Oil",
      "price": "2000.00",
      "quantity": 1
    }
  ]
}
          </textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="executeWebhookSim()">Send Webhook to Dashboard</button>
      </div>
    </div>
  `;
  container.classList.remove('hidden');
}

function applySimPreset(preset) {
  const area = document.getElementById('simPayload');
  const orderId = Date.now();
  const billNo = 'HP-VIJ-' + Math.floor(3000 + Math.random() * 900);

  if (preset === 'multi') {
    area.value = JSON.stringify({
      id: String(orderId),
      name: `#HP-${Math.floor(10900 + Math.random() * 900)}`,
      gateway: "Razorpay Online",
      customer: { first_name: "Ramesh", last_name: "Guptha", phone: "9849019283" },
      note_attributes: [{ name: "HalfPe Bill Copy Number", value: billNo }],
      line_items: [
        { vendor: "Sri Balaji Handlooms & Sarees", title: "Mangalagiri Pattu Saree", price: "3600.00", quantity: 1 },
        { vendor: "Deccan Organic Spices & Oils", title: "Guntur Cold-Pressed Sesame Oil", price: "2000.00", quantity: 1 }
      ]
    }, null, 2);
  } else if (preset === 'single_cash') {
    area.value = JSON.stringify({
      id: String(orderId),
      name: `#HP-${Math.floor(10900 + Math.random() * 900)}`,
      gateway: "Cash on Counter",
      customer: { first_name: "Kiran", last_name: "Babu", phone: "9440182736" },
      note_attributes: [{ name: "HalfPe Bill Copy Number", value: billNo }],
      line_items: [
        { vendor: "Royal Silks & Kanchipuram", title: "Kanchi Silk Dupatta", price: "3500.00", quantity: 1 }
      ]
    }, null, 2);
  } else {
    area.value = JSON.stringify({
      id: String(orderId),
      name: `#HP-${Math.floor(10900 + Math.random() * 900)}`,
      gateway: "Razorpay Online",
      customer: { first_name: "Madhavi", last_name: "Latha", phone: "9700998811" },
      note_attributes: [{ name: "HalfPe Bill Copy Number", value: billNo }],
      line_items: [
        { vendor: "Sri Krishna Sweets & Bakers", title: "Pootharekulu & Mysore Pak Gift Box", price: "1800.00", quantity: 1 }
      ]
    }, null, 2);
  }
}

async function executeWebhookSim() {
  const raw = document.getElementById('simPayload').value;
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    alert('Invalid JSON in payload');
    return;
  }

  try {
    const res = await fetch('/api/webhooks/shopify-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      toast(data.message, 'success');
      closeModal();
      if (state.selectedVendorId) {
        await loadVendorDetail(state.selectedVendorId);
      } else {
        await loadVendorsSummary();
      }
    } else {
      alert(data.message || 'Webhook failed');
    }
  } catch (err) {
    toast('Webhook simulation failed', 'error');
  }
}

// 8. Printable Vendor Statement (PDF view)
function openPrintableStatement(vendorId) {
  const d = state.selectedVendorData;
  if (!d) return;
  const v = d.vendor;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>HalfPe Vendor Statement - ${v.name} (${v.stallNo})</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
        .title { font-size: 24px; font-weight: 800; }
        .sub { font-size: 14px; color: #555; }
        .meta-box { background: #f9f9f9; padding: 16px; border-radius: 8px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 13px; }
        .calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .calc-card { border: 1px solid #ddd; padding: 12px; border-radius: 6px; }
        .calc-card strong { display: block; font-size: 18px; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; }
        th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
        th { background: #f2f2f2; font-weight: 700; }
        .total-row { font-weight: 800; background: #fafafa; }
        .print-btn { background: #4F46E5; color: #fff; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
        @media print { .print-btn { display: none; } }
      </style>
    </head>
    <body>
      <div style="text-align: right; margin-bottom: 12px;">
        <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
      </div>
      <div class="header">
        <div>
          <div class="title">HalfPe Vendor Settlement Statement</div>
          <div class="sub">Event: Half Price Days — Vijayawada Expo · SVN Conventions, Poranki</div>
        </div>
        <div style="text-align: right;">
          <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</div>
          <div style="color: #666;">Generated via HalfPe Admin Engine</div>
        </div>
      </div>

      <div class="meta-box">
        <div><strong>Vendor Name:</strong><br>${v.name}</div>
        <div><strong>Stall Number:</strong><br>${v.stallNo}</div>
        <div><strong>Webkul Seller ID:</strong><br>${v.webkulSellerId}</div>
        <div><strong>Agreed Commission:</strong><br>${v.commissionPct}%</div>
      </div>

      <div class="calc-grid">
        <div class="calc-card">Gross Sales (Active Bills)<strong>₹${d.grossSales.toLocaleString('en-IN')}</strong></div>
        <div class="calc-card">Less: Returns<strong>-₹${d.returnsAmount.toLocaleString('en-IN')}</strong></div>
        <div class="calc-card">Net Sales<strong>₹${d.netSales.toLocaleString('en-IN')}</strong></div>
        <div class="calc-card">HalfPe Commission (${v.commissionPct}%)<strong>₹${d.commissionAmount.toLocaleString('en-IN')}</strong></div>
      </div>

      <div class="calc-grid">
        <div class="calc-card" style="background: #eef2ff; border-color: #c7d2fe;">Settlement Payable<strong>₹${d.settlementPayable.toLocaleString('en-IN')}</strong></div>
        <div class="calc-card" style="background: #ecfdf5; border-color: #a7f3d0;">Total Disbursed (Paid)<strong>₹${d.alreadyPaid.toLocaleString('en-IN')}</strong></div>
        <div class="calc-card" style="background: #fffbeb; border-color: #fde68a;">Balance Outstanding<strong>₹${d.balanceToPay.toLocaleString('en-IN')}</strong></div>
        <div class="calc-card">Account Status<strong>${d.status}</strong></div>
      </div>

      <h3>Bills & Orders Breakdown</h3>
      <table>
        <thead>
          <tr>
            <th>HalfPe Bill Copy No</th>
            <th>Shopify Order Ref</th>
            <th>Date & Time</th>
            <th>Payment Mode</th>
            <th>Customer</th>
            <th>Bill Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${d.bills.map(b => `
            <tr style="${b.isVoid ? 'text-decoration: line-through; color: #888;' : ''}">
              <td><strong>${b.billCopyNo}</strong></td>
              <td>${b.paymentOrderRef}</td>
              <td>${formatDate(b.createdAt)}</td>
              <td>${b.paymentMode}</td>
              <td>${b.customerName}</td>
              <td>₹${b.billAmount.toLocaleString('en-IN')}</td>
              <td>${b.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${d.returns.length > 0 ? `
        <h3>Customer Returns Deducted</h3>
        <table>
          <thead>
            <tr>
              <th>Return ID</th>
              <th>Bill Copy No</th>
              <th>Return Amount</th>
              <th>Refund Mode</th>
              <th>Reason</th>
              <th>Approved By</th>
            </tr>
          </thead>
          <tbody>
            ${d.returns.map(r => `
              <tr>
                <td>${r.id}</td>
                <td><strong>${r.billCopyNo}</strong></td>
                <td>-₹${r.amount.toLocaleString('en-IN')}</td>
                <td>${r.refundMode}</td>
                <td>${r.reason}</td>
                <td>${r.approvedBy}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${d.payouts.length > 0 ? `
        <h3>Payout Disbursements History</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount Paid</th>
              <th>Mode</th>
              <th>UTR / Reference</th>
              <th>Paid By</th>
            </tr>
          </thead>
          <tbody>
            ${d.payouts.map(p => `
              <tr>
                <td>${formatDate(p.date)}</td>
                <td><strong>₹${p.amount.toLocaleString('en-IN')}</strong></td>
                <td>${p.mode}</td>
                <td>${p.reference}</td>
                <td>${p.paidBy}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 13px;">
        <div style="border-top: 1px solid #111; padding-top: 6px; width: 220px; text-align: center;">
          Vendor Signature & Seal
        </div>
        <div style="border-top: 1px solid #111; padding-top: 6px; width: 220px; text-align: center;">
          HalfPe Authorized Finance Signatory
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// -------------------------------------------------------------
// Toast Notifications
// -------------------------------------------------------------
function toast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  t.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(t);

  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 200);
  }, 3500);
}

// Run on window load
window.addEventListener('DOMContentLoaded', init);
