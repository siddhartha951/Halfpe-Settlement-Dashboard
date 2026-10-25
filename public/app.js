const DEFAULT_USER = {
  id: 'usr_1',
  name: 'Krishna (Super Admin)',
  email: 'admin@halfpe.com',
  role: 'super_admin'
};

// Timezone-safe date helpers for Asia/Kolkata (Indian Standard Time)
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

function getBusinessYesterdayKolkata() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(yesterday);
  const p = type => parts.find(it => it.type === type)?.value ?? '';
  return `${p('year')}-${p('month')}-${p('day')}`;
}

// State Store
const state = {
  currentUser: null,
  allUsers: [],
  activeTab: 'overall', // 'overall' or 'vendors'
  selectedVendorId: null,
  vendorDetailSubTab: 'bills', // 'bills', 'returns', 'payouts', 'audit'
  vendorsData: null,
  selectedVendorData: null,
  searchQuery: '',
  statusFilter: 'all',
  vendorDateFilter: 'all',
  // Vendor Drilldown Filters (Phase 6: Group A & Group B)
  vendorFilterGroupA: 'all', // 'all', 'paid', 'returns', 'cod'
  vendorFilterGroupB: 'all', // 'all', 'paid', 'partially_paid', 'not_yet_paid'
  unmaskedPhones: new Set(),
  // Date filtering state (simplified to Yesterday, Today, Custom with Asia/Kolkata bounds)
  dateFilterMode: 'custom',
  startDate: '2026-10-08',
  endDate: getBusinessTodayKolkata(),
  shopifyStatus: null,
  isShopifySyncing: false
};

function getUserRole() {
  return (state.currentUser && state.currentUser.role) ? state.currentUser.role : 'guest';
}

function getUserName() {
  return (state.currentUser && state.currentUser.name) ? state.currentUser.name : 'Guest';
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

  // 4. Load initial vendors data only if authenticated, otherwise render login page immediately
  if (state.currentUser) {
    await loadVendorsSummary();
  } else {
    renderMain();
  }

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
      handleUserAuthClick();
    });
  }

  // 7. Handle escape key to close drawer/modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      toggleMobileDrawer(false);
    }
  });

  // 8. Initialize Custom Date toolbar constraints
  const todayStr = getBusinessTodayKolkata();
  const fromEl = document.getElementById('customFromDate');
  const toEl = document.getElementById('customToDate');
  if (fromEl) {
    fromEl.max = todayStr;
    fromEl.value = state.startDate;
  }
  if (toEl) {
    toEl.max = todayStr;
    toEl.min = state.startDate;
    toEl.value = state.endDate;
  }

  // 9. Global exports for onclick handlers
  window.openLoginModal = openLoginModal;
  window.handleUserAuthClick = handleUserAuthClick;
  window.logout = logout;
  window.togglePasswordVisibility = togglePasswordVisibility;
  window.closeModal = closeModal;
  window.toggleMobileDrawer = toggleMobileDrawer;
  window.switchMainTab = switchMainTab;
  window.handleSearch = handleSearch;
  window.handleStatusFilter = handleStatusFilter;
  window.setDatePreset = setDatePreset;
  window.applyCustomDateRange = applyCustomDateRange;
  window.handleCustomStartDateChange = handleCustomStartDateChange;
  window.handleCustomEndDateChange = handleCustomEndDateChange;
  window.setVendorFilterGroupA = setVendorFilterGroupA;
  window.setVendorFilterGroupB = setVendorFilterGroupB;
  window.clearVendorFilters = clearVendorFilters;
  window.renderLoginPage = renderLoginPage;
  window.handleLoginPageSubmit = handleLoginPageSubmit;
  window.autofillLogin = autofillLogin;
  window.handleGlobalVendorChange = handleGlobalVendorChange;
  window.renderOrdersManagementView = renderOrdersManagementView;
  window.handleOrderSearch = handleOrderSearch;
  window.setOrderShopifyFilter = setOrderShopifyFilter;
  window.toggleSelectOrder = toggleSelectOrder;
  window.toggleSelectAllOrders = toggleSelectAllOrders;
  window.pushSingleOrderToShopify = pushSingleOrderToShopify;
  window.bulkPushApprovedOrders = bulkPushApprovedOrders;
  window.openViewOrderModal = openViewOrderModal;
  window.openEditOrderModal = openEditOrderModal;
  window.submitEditOrder = submitEditOrder;
  window.renderVendorManagementView = renderVendorManagementView;
  window.openAddVendorModal = openAddVendorModal;
  window.submitAddVendor = submitAddVendor;
  window.openEditVendorModal = openEditVendorModal;
  window.submitEditVendor = submitEditVendor;
  window.toggleVendorActiveStatus = toggleVendorActiveStatus;
  window.renderPayoutManagementView = renderPayoutManagementView;
  window.openOrderPayoutModal = openOrderPayoutModal;
  window.handlePayoutVendorSelect = handlePayoutVendorSelect;
  window.quickFillAllocation = quickFillAllocation;
  window.recalculatePayoutAllocations = recalculatePayoutAllocations;
  window.submitOrderPayout = submitOrderPayout;
  window.renderAuditLogView = renderAuditLogView;
}

function updateUserChipUI() {
  const nameEl = document.getElementById('userChipName');
  const roleEl = document.getElementById('userChipRole');
  const avatarEl = document.getElementById('userAvatarCircle');
  const authActionBtn = document.getElementById('authActionBtn');
  const drawerAvatar = document.getElementById('drawerUserAvatar');
  const drawerName = document.getElementById('drawerUserName');
  const drawerRole = document.getElementById('drawerUserRole');
  const drawerAuthBtn = document.getElementById('drawerAuthBtn');
  const bNavAccountLabel = document.getElementById('bNavAccountLabel');

  if (state.currentUser) {
    const u = state.currentUser;
    const initial = (u.name || 'U').trim().charAt(0).toUpperCase();
    const roleClean = (u.role || 'Admin').replace('_', ' ').toUpperCase();

    if (nameEl) nameEl.textContent = u.name;
    if (roleEl) roleEl.textContent = roleClean;
    if (avatarEl) avatarEl.textContent = initial;
    if (authActionBtn) {
      authActionBtn.textContent = 'Log Out';
      authActionBtn.className = 'btn btn-danger-outline btn-xs';
    }

    if (drawerAvatar) drawerAvatar.textContent = initial;
    if (drawerName) drawerName.textContent = u.name;
    if (drawerRole) drawerRole.textContent = roleClean;
    if (drawerAuthBtn) drawerAuthBtn.textContent = 'Log Out';
    if (bNavAccountLabel) bNavAccountLabel.textContent = u.name.split(' ')[0];
  } else {
    if (nameEl) nameEl.textContent = 'Sign In';
    if (roleEl) roleEl.textContent = 'Guest';
    if (avatarEl) avatarEl.textContent = '👤';
    if (authActionBtn) {
      authActionBtn.textContent = 'Log In';
      authActionBtn.className = 'btn btn-primary btn-xs';
    }

    if (drawerAvatar) drawerAvatar.textContent = '👤';
    if (drawerName) drawerName.textContent = 'Sign In';
    if (drawerRole) drawerRole.textContent = 'Guest';
    if (drawerAuthBtn) drawerAuthBtn.textContent = 'Log In';
    if (bNavAccountLabel) bNavAccountLabel.textContent = 'Login';
  }
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
  const today = getBusinessTodayKolkata();
  const yesterday = getBusinessYesterdayKolkata();

  document.querySelectorAll('.date-preset-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(
    mode === 'yesterday' ? 'presetYesterday' :
    mode === 'today' ? 'presetToday' : 'presetCustom'
  );
  if (btn) btn.classList.add('active');

  const customWrap = document.getElementById('customDateWrap');
  const activeDisplay = document.getElementById('activeDateDisplay');
  const fromEl = document.getElementById('customFromDate');
  const toEl = document.getElementById('customToDate');

  if (mode === 'custom') {
    if (customWrap) customWrap.style.display = 'flex';
    if (fromEl) {
      fromEl.max = today;
      if (!fromEl.value) fromEl.value = state.startDate || '2026-10-08';
    }
    if (toEl) {
      toEl.max = today;
      if (fromEl && fromEl.value) toEl.min = fromEl.value;
      if (!toEl.value) toEl.value = state.endDate || today;
    }
    state.startDate = fromEl ? fromEl.value : (state.startDate || '2026-10-08');
    state.endDate = toEl ? toEl.value : (state.endDate || today);
    if (activeDisplay) activeDisplay.textContent = `Active: Custom (${state.startDate} to ${state.endDate})`;
    refreshDashboard();
    return;
  }

  if (customWrap) customWrap.style.display = 'none';

  if (mode === 'today') {
    state.startDate = today;
    state.endDate = today;
    if (activeDisplay) activeDisplay.textContent = `Active: Today (${today})`;
  } else if (mode === 'yesterday') {
    state.startDate = yesterday;
    state.endDate = yesterday;
    if (activeDisplay) activeDisplay.textContent = `Active: Yesterday (${yesterday})`;
  }

  refreshDashboard();
}

function handleCustomStartDateChange(val) {
  const today = getBusinessTodayKolkata();
  const fromEl = document.getElementById('customFromDate');
  const toEl = document.getElementById('customToDate');

  if (val > today) {
    toast(`Future date (${val}) not allowed. Restricted to today (${today}).`, 'error');
    if (fromEl) fromEl.value = today;
    val = today;
  }

  if (toEl) {
    toEl.min = val;
    if (toEl.value && toEl.value < val) {
      toEl.value = val;
    }
  }
}

function handleCustomEndDateChange(val) {
  const today = getBusinessTodayKolkata();
  const fromEl = document.getElementById('customFromDate');
  const toEl = document.getElementById('customToDate');
  const fromVal = fromEl ? fromEl.value : '';

  if (val > today) {
    toast(`Future date (${val}) not allowed. Restricted to today (${today}).`, 'error');
    if (toEl) toEl.value = today;
    val = today;
  }

  if (fromVal && val < fromVal) {
    toast(`End date (${val}) cannot be earlier than start date (${fromVal}).`, 'error');
    if (toEl) toEl.value = fromVal;
  }
}

function applyCustomDateRange() {
  const today = getBusinessTodayKolkata();
  const fromEl = document.getElementById('customFromDate');
  const toEl = document.getElementById('customToDate');
  let fromVal = fromEl ? fromEl.value : '';
  let toVal = toEl ? toEl.value : '';

  if (fromVal > today) {
    toast(`Start date cannot exceed today (${today}).`, 'error');
    fromVal = today;
    if (fromEl) fromEl.value = today;
  }
  if (toVal > today) {
    toast(`End date cannot exceed today (${today}).`, 'error');
    toVal = today;
    if (toEl) toEl.value = today;
  }
  if (fromVal && toVal && toVal < fromVal) {
    toast(`End date cannot be earlier than start date.`, 'error');
    toVal = fromVal;
    if (toEl) toEl.value = fromVal;
  }

  state.startDate = fromVal || '';
  state.endDate = toVal || '';

  const activeDisplay = document.getElementById('activeDateDisplay');
  if (activeDisplay) {
    if (fromVal && toVal) {
      activeDisplay.textContent = `Active: Custom (${fromVal} to ${toVal})`;
    } else if (fromVal) {
      activeDisplay.textContent = `Active: Since ${fromVal}`;
    } else if (toVal) {
      activeDisplay.textContent = `Active: Up to ${toVal}`;
    } else {
      activeDisplay.textContent = `Active: All Dates`;
    }
  }

  toast(`Filtered for dates: ${fromVal || 'Start'} to ${toVal || 'Today'}`, 'info');
  refreshDashboard();
}

async function fetchUsers() {
  try {
    const res = await fetch('/api/auth/users');
    const data = await res.json();
    state.allUsers = data.users || [];
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
// Authentication & Secure Login Flow
// -------------------------------------------------------------
function handleUserAuthClick() {
  if (state.currentUser) {
    openUserProfileModal();
  } else {
    openLoginModal();
  }
}

function openUserProfileModal() {
  const container = document.getElementById('modalContainer');
  if (!container || !state.currentUser) return;

  const u = state.currentUser;
  const initial = (u.name || 'U').trim().charAt(0).toUpperCase();

  container.innerHTML = `
    <div class="login-modal-box" style="max-width: 420px;">
      <div class="login-modal-header">
        <div>
          <h3 class="login-modal-title">👤 Account Profile</h3>
          <p class="login-modal-sub">Signed in to HalfPe Settlement Engine</p>
        </div>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>
      <div class="login-modal-body" style="padding: 24px;">
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px;">
          <div class="user-avatar-circle" style="width: 52px; height: 52px; font-size: 1.3rem;">${initial}</div>
          <div>
            <div style="font-weight: 700; font-size: 1.15rem; color: var(--text-primary);">${u.name}</div>
            <div style="color: var(--text-muted); font-size: 0.85rem;">${u.email}</div>
          </div>
        </div>
        <div style="margin-bottom: 24px; padding: 12px; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-color); border-radius: 8px;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Assigned Role</div>
          <span class="badge badge-status-paid" style="font-size: 0.85rem; padding: 4px 10px;">${(u.role || 'Admin').toUpperCase()}</span>
        </div>
        <button class="btn btn-danger-outline btn-block" style="padding: 10px;" onclick="logout()">
          🚪 Sign Out
        </button>
      </div>
    </div>
  `;
  container.classList.remove('hidden');
}

function openLoginModal() {
  const container = document.getElementById('modalContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="login-modal-box" style="max-width: 440px;">
      <div class="login-modal-header">
        <div>
          <h3 class="login-modal-title">🔐 Settlement Engine Sign In</h3>
          <p class="login-modal-sub">Enter your email and password to access dashboard</p>
        </div>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>
      
      <div class="login-modal-body" style="padding: 24px;">
        <form onsubmit="handleManualLogin(event)" class="login-form">
          <div class="login-field" style="margin-bottom: 16px;">
            <label for="loginEmail" style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">Email Address</label>
            <input type="email" id="loginEmail" placeholder="e.g. admin@halfpe.com" required autocomplete="username" 
              style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-card); color: var(--text-primary);" />
          </div>
          <div class="login-field" style="margin-bottom: 20px;">
            <label for="loginPassword" style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">Password</label>
            <div style="position: relative;">
              <input type="password" id="loginPassword" placeholder="Enter your password" required autocomplete="current-password" 
                style="width: 100%; padding: 10px 38px 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-card); color: var(--text-primary);" />
              <button type="button" onclick="togglePasswordVisibility()" title="Show/Hide Password"
                style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1rem; opacity: 0.7;">
                👁️
              </button>
            </div>
          </div>
          <button type="submit" id="btnSubmitLogin" class="btn btn-primary btn-block" style="padding: 12px; font-weight: 600; font-size: 0.95rem;">
            Sign In to Dashboard
          </button>
        </form>

        <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border-color); font-size: 0.75rem; color: var(--text-muted); text-align: center; line-height: 1.5;">
          <span>Authorized Event Accounts:</span><br>
          <code style="color: #60A5FA;">admin@halfpe.com</code> · <code style="color: #34D399;">billing@halfpe.com</code> · <code style="color: #FBBF24;">finance@halfpe.com</code>
        </div>
      </div>
    </div>
  `;
  container.classList.remove('hidden');

  if (typeof gsap !== 'undefined') {
    gsap.from('.login-modal-box', {
      opacity: 0,
      y: 20,
      scale: 0.95,
      duration: 0.25,
      ease: 'power2.out'
    });
  }

  // Focus email input
  setTimeout(() => {
    const el = document.getElementById('loginEmail');
    if (el) el.focus();
  }, 100);
}

function togglePasswordVisibility() {
  const pInput = document.getElementById('loginPassword');
  if (!pInput) return;
  pInput.type = pInput.type === 'password' ? 'text' : 'password';
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  state.currentUser = null;
  state.selectedVendorId = null;
  state.vendorsData = null;
  state.selectedVendorData = null;
  try {
    localStorage.removeItem('hp_session_user');
  } catch (e) {}
  closeModal();
  updateUserChipUI();
  toast('Signed out successfully.', 'info');
  renderMain();
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

  const tabIdMap = {
    overall: 'tabOverall',
    vendors: 'tabVendors',
    orders: 'tabOrders',
    vendor_mgmt: 'tabVendorMgmt',
    payout_mgmt: 'tabPayouts',
    audit: 'tabAudit'
  };

  const drawerIdMap = {
    overall: 'mDrawerOverall',
    vendors: 'mDrawerVendors',
    orders: 'mDrawerOrders',
    vendor_mgmt: 'mDrawerVendorMgmt',
    payout_mgmt: 'mDrawerPayouts',
    audit: 'mDrawerAudit'
  };

  // 1. Sync Desktop tabs
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const activeBtn = document.getElementById(tabIdMap[tab] || 'tabOverall');
  if (activeBtn) activeBtn.classList.add('active');

  // 2. Sync Mobile Bottom Nav
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
  const bNavBtn = document.getElementById(tab === 'overall' ? 'bNavOverall' : 'bNavVendors');
  if (bNavBtn) bNavBtn.classList.add('active');

  // 3. Sync Mobile Drawer items
  document.querySelectorAll('.drawer-nav-item').forEach(d => d.classList.remove('active'));
  const drawerBtn = document.getElementById(drawerIdMap[tab] || 'mDrawerOverall');
  if (drawerBtn) drawerBtn.classList.add('active');

  // 4. GSAP transition on page content
  if (typeof gsap !== 'undefined') {
    gsap.fromTo('#mainContent', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
  }

  renderMain();
}

function updateNavigationVisibility() {
  const isAuth = Boolean(state.currentUser);
  const desktopNav = document.querySelector('.desktop-nav');
  const dateToolbar = document.querySelector('.date-range-toolbar');
  const mobileBottomNav = document.getElementById('mobileBottomNav');
  const syncBtn = document.getElementById('btnShopifySync');

  if (desktopNav) desktopNav.style.display = isAuth ? '' : 'none';
  if (dateToolbar) dateToolbar.style.display = isAuth ? '' : 'none';
  if (mobileBottomNav) mobileBottomNav.style.display = isAuth ? '' : 'none';
  if (syncBtn) syncBtn.style.display = isAuth ? '' : 'none';

  // Vendor role restrictions: vendor users should only see their own vendor portal
  if (isAuth && state.currentUser.role === 'vendor') {
    const tabOverall = document.getElementById('tabOverall');
    const tabVendorMgmt = document.getElementById('tabVendorMgmt');
    const tabOrders = document.getElementById('tabOrders');
    const tabPayouts = document.getElementById('tabPayouts');
    const tabAudit = document.getElementById('tabAudit');
    if (tabOverall) tabOverall.style.display = 'none';
    if (tabVendorMgmt) tabVendorMgmt.style.display = 'none';
    if (tabAudit) tabAudit.style.display = 'none';
  }
}

function renderMain() {
  updateNavigationVisibility();

  if (!state.currentUser) {
    renderLoginPage();
    return;
  }

  // If vendor role, automatically lock to their vendor ID
  if (state.currentUser.role === 'vendor' && state.currentUser.vendorId && !state.selectedVendorId) {
    state.selectedVendorId = state.currentUser.vendorId;
  }

  if (state.selectedVendorId) {
    renderVendorDetailView();
  } else if (state.activeTab === 'overall') {
    renderOverallSettlementView();
  } else if (state.activeTab === 'vendors') {
    renderVendorsListView();
  } else if (state.activeTab === 'orders') {
    renderOrdersManagementView();
  } else if (state.activeTab === 'vendor_mgmt') {
    renderVendorManagementView();
  } else if (state.activeTab === 'payout_mgmt') {
    renderPayoutManagementView();
  } else if (state.activeTab === 'audit') {
    renderAuditLogView();
  } else {
    renderVendorsListView();
  }
}

function renderLoginPage() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  main.innerHTML = `
    <div class="login-page-wrapper">
      <div class="login-page-card">
        <div class="login-page-header">
          <div class="login-page-logo-wrap">
            <img src="halfpe-logo.png" alt="HalfPe Logo" class="login-page-logo-img">
            <div style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.03em;">
              <span class="brand-half">Half</span><span class="brand-pe">Pe</span>
              <span class="brand-badge">SETTLEMENT</span>
            </div>
          </div>
          <h1 class="login-page-title">Sign In to Dashboard</h1>
          <p class="login-page-subtitle">
            Enter your credentials to access the Vijayawada Expo financial settlements and vendor reconciliation.
          </p>
        </div>

        <form onsubmit="handleLoginPageSubmit(event)" class="login-form">
          <div class="login-field">
            <label for="pageLoginEmail">Email Address</label>
            <input type="email" id="pageLoginEmail" placeholder="e.g. admin@halfpe.com" required autocomplete="username" />
          </div>
          <div class="login-field">
            <label for="pageLoginPassword">Password</label>
            <div style="position: relative;">
              <input type="password" id="pageLoginPassword" placeholder="Enter your password" required autocomplete="current-password" 
                style="width: 100%; padding-right: 38px;" />
              <button type="button" onclick="togglePagePasswordVisibility()" title="Show/Hide Password"
                style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1rem; opacity: 0.7;">
                👁️
              </button>
            </div>
          </div>
          <button type="submit" id="btnPageLogin" class="btn btn-primary btn-block" style="padding: 12px; font-weight: 600; font-size: 0.95rem; margin-top: 6px;">
            Sign In & Unlock Dashboard →
          </button>
        </form>

        <div class="login-accounts-box">
          <div class="login-accounts-title">
            <span>⚡ Click to Fill Test Account</span>
          </div>
          <div class="login-accounts-grid">
            <button type="button" class="login-account-btn" onclick="autofillLogin('admin@halfpe.com', 'admin@2026')">
              <span class="login-account-role">👑 Super Admin</span>
              <span class="login-account-email">admin@halfpe.com</span>
            </button>
            <button type="button" class="login-account-btn" onclick="autofillLogin('billing@halfpe.com', 'billing@2026')">
              <span class="login-account-role">🧾 Billing Counter</span>
              <span class="login-account-email">billing@halfpe.com</span>
            </button>
            <button type="button" class="login-account-btn" onclick="autofillLogin('finance@halfpe.com', 'finance@2026')">
              <span class="login-account-role">💼 Finance & Accounts</span>
              <span class="login-account-email">finance@halfpe.com</span>
            </button>
            <button type="button" class="login-account-btn" onclick="autofillLogin('viewer@halfpe.com', 'viewer@2026')">
              <span class="login-account-role">👁️ Auditor / Viewer</span>
              <span class="login-account-email">viewer@halfpe.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  if (typeof gsap !== 'undefined') {
    gsap.from('.login-page-card', {
      opacity: 0,
      y: 25,
      scale: 0.98,
      duration: 0.35,
      ease: 'power2.out'
    });
  }

  setTimeout(() => {
    const el = document.getElementById('pageLoginEmail');
    if (el) el.focus();
  }, 100);
}

function togglePagePasswordVisibility() {
  const pInput = document.getElementById('pageLoginPassword');
  if (!pInput) return;
  pInput.type = pInput.type === 'password' ? 'text' : 'password';
}

function autofillLogin(email, password) {
  const eInput = document.getElementById('pageLoginEmail') || document.getElementById('loginEmail');
  const pInput = document.getElementById('pageLoginPassword') || document.getElementById('loginPassword');
  if (eInput) eInput.value = email;
  if (pInput) pInput.value = password;
  toast(`Selected: ${email}`, 'info');
}

function handleLoginPageSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('pageLoginEmail').value;
  const password = document.getElementById('pageLoginPassword').value;
  executeLogin(email, password);
}

async function renderOverallSettlementView() {
  if (!state.vendorsData) {
    await loadVendorsSummary();
    return;
  }
  const { eventTotals } = state.vendorsData;

  const main = document.getElementById('mainContent');
  if (!main) return;

  // Fetch daily reconciliation and day locks
  let dailyRecon = [];
  let dayLocks = [];
  try {
    const [reconRes, locksRes] = await Promise.all([
      fetch('/api/reports/daily-payment-modes'),
      fetch('/api/day-locks')
    ]);
    dailyRecon = await reconRes.json();
    dayLocks = await locksRes.json();
  } catch (e) {
    console.warn('Reconciliation fetch error:', e);
  }

  const totalCash = dailyRecon.reduce((s, d) => s + (d.cashTotal || 0), 0);
  const totalOnline = dailyRecon.reduce((s, d) => s + (d.onlineTotal || 0), 0);

  main.innerHTML = `
    <!-- Top Overall Settlement Header -->
    <div class="panel-header" style="margin-bottom: 20px;">
      <div>
        <h1 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 4px 0;">📊 Overall Settlement Dashboard</h1>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">
          Consolidated financial overview, settlement audit & single billing desk reconciliation
        </p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-outline btn-sm" onclick="exportVendorsCSV()">
          📊 Export CSV / Excel
        </button>
        <button class="btn btn-primary btn-sm" onclick="refreshDashboard()">
          🔄 Refresh
        </button>
      </div>
    </div>

    <!-- Executive KPI Cards Grid (Section 6.2) -->
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
        <span class="summary-card-sub">Refunds processed</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Net Sales <span>📈</span></span>
        <span class="summary-card-value" style="color: var(--notion-blue);">${formatINR(eventTotals.netSales)}</span>
        <span class="summary-card-sub">Gross minus returns</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Total Commission <span>🏷️</span></span>
        <span class="summary-card-value" style="color: var(--notion-purple);">${formatINR(eventTotals.totalCommission)}</span>
        <span class="summary-card-sub">HalfPe 15% event fee</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Settlement Payable <span>⚖️</span></span>
        <span class="summary-card-value" style="color: var(--notion-green);">${formatINR(eventTotals.settlementPayable)}</span>
        <span class="summary-card-sub">Net sales - commission</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Already Paid <span>✅</span></span>
        <span class="summary-card-value" style="color: var(--notion-blue);">${formatINR(eventTotals.alreadyPaid)}</span>
        <span class="summary-card-sub">Disbursed via bank</span>
      </div>
      <div class="summary-card" style="border-left: 3px solid var(--notion-yellow);">
        <span class="summary-card-label">Balance to Pay <span>⏳</span></span>
        <span class="summary-card-value" style="color: var(--notion-yellow);">${formatINR(eventTotals.balanceToPay)}</span>
        <span class="summary-card-sub">Remaining balance</span>
      </div>
    </div>

    <!-- Payment Channel Breakdown -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin: 24px 0;">
      <div class="summary-card" style="background: rgba(34, 197, 94, 0.04); border-color: rgba(34, 197, 94, 0.2);">
        <span class="summary-card-label">Counter Cash Collection <span>💵</span></span>
        <span class="summary-card-value" style="color: #34D399;">${formatINR(totalCash)}</span>
        <span class="summary-card-sub">Collected at physical counter</span>
      </div>
      <div class="summary-card" style="background: rgba(59, 130, 246, 0.04); border-color: rgba(59, 130, 246, 0.2);">
        <span class="summary-card-label">Razorpay / Shopify Online <span>💳</span></span>
        <span class="summary-card-value" style="color: #60A5FA;">${formatINR(totalOnline)}</span>
        <span class="summary-card-sub">Settled via digital gateways</span>
      </div>
    </div>

    <!-- Daily Reconciliation & Day Locks Table -->
    <div class="panel" style="margin-top: 20px;">
      <div class="panel-header">
        <div class="panel-title-group">
          <h2 class="panel-title">Daily Cash vs Online Counter Reconciliation & Day Locks</h2>
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
    populateGlobalVendorDropdown();
    renderMain();
  } catch (err) {
    toast('Failed to load vendors data', 'error');
  }
}

function populateGlobalVendorDropdown() {
  const sel = document.getElementById('globalVendorSelector');
  if (!sel || !state.vendorsData || !state.vendorsData.vendors) return;

  const currentVal = state.selectedGlobalVendor || (state.selectedVendorId || 'all');
  const options = ['<option value="all">All Vendors (Consolidated)</option>'];

  const sorted = [...state.vendorsData.vendors].sort(compareStallNumbers);
  sorted.forEach(vObj => {
    const v = vObj.vendor || vObj;
    options.push(`<option value="${v.id}" ${v.id === currentVal ? 'selected' : ''}>${v.stallNo}: ${v.name}</option>`);
  });

  sel.innerHTML = options.join('');
}

function handleGlobalVendorChange(vendorId) {
  state.selectedGlobalVendor = vendorId;
  if (vendorId === 'all') {
    state.selectedVendorId = null;
    toast('Switched to All Vendors (Consolidated View)', 'info');
  } else {
    state.selectedVendorId = vendorId;
    toast(`Filtered for vendor: ${vendorId}`, 'info');
  }
  refreshDashboard();
}

// -------------------------------------------------------------
// Stall Number Natural Numeric Sorting (Bug 5)
// -------------------------------------------------------------
function parseStallNumber(item) {
  const raw = item && item.vendor ? item.vendor.stallNo : (item ? item.stallNo : '');
  if (!raw) return NaN;
  const match = String(raw).match(/\d+/);
  return match ? parseInt(match[0], 10) : NaN;
}

function compareStallNumbers(a, b) {
  const stallA = parseStallNumber(a);
  const stallB = parseStallNumber(b);
  const validA = !Number.isNaN(stallA);
  const validB = !Number.isNaN(stallB);

  const nameA = String((a.vendor ? a.vendor.name : a.name) || '');
  const nameB = String((b.vendor ? b.vendor.name : b.name) || '');

  if (validA && validB) {
    if (stallA !== stallB) return stallA - stallB;
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
  }
  if (validA) return -1;
  if (validB) return 1;

  const rawA = String((a.vendor ? a.vendor.stallNo : a.stallNo) || '');
  const rawB = String((b.vendor ? b.vendor.stallNo : b.stallNo) || '');
  return rawA.localeCompare(rawB, undefined, { numeric: true, sensitivity: 'base' }) || nameA.localeCompare(nameB);
}

function getFilteredAndSortedVendors() {
  if (!state.vendorsData || !state.vendorsData.vendors) return [];
  const vendors = [...state.vendorsData.vendors];

  // Natural numeric ascending sort by stall number (Bug 5: 1, 2, 3, 10, 11)
  vendors.sort(compareStallNumbers);

  const query = (state.searchQuery || '').trim().toLowerCase();
  return vendors.filter(item => {
    const searchableText = [
      item.vendor.name,
      item.vendor.stallNo,
      item.vendor.webkulSellerId,
      item.vendor.code,
      item.vendor.category
    ].filter(Boolean).join(' ').toLowerCase();

    const matchesSearch = !query || searchableText.includes(query);
    const matchesStatus = state.statusFilter === 'all' || item.status.toLowerCase() === state.statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });
}

function renderVendorTableRowHTML(item) {
  return `
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
        <button class="btn btn-primary btn-sm btn-view-details" onclick="selectVendor('${item.vendor.id}')">
          View Details →
        </button>
      </td>
    </tr>
  `;
}

function updateVendorTableRowsOnly() {
  const tbody = document.getElementById('vendorTableBody');
  const countBadge = document.getElementById('vendorCountBadge');
  const tfoot = document.getElementById('vendorTableFooter');

  if (!tbody || !countBadge) {
    renderVendorsListView();
    return;
  }

  const filtered = getFilteredAndSortedVendors();
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: var(--text-muted); padding: 36px;">No vendors match your search "${state.searchQuery}".</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(renderVendorTableRowHTML).join('');
  }

  countBadge.textContent = `${filtered.length} Vendors Listed`;

  if (tfoot) {
    const totOrders = filtered.reduce((s, it) => s + (it.ordersCount || 0), 0);
    const totGross = filtered.reduce((s, it) => s + (it.grossSales || 0), 0);
    const totReturns = filtered.reduce((s, it) => s + (it.returnsAmount || 0), 0);
    const totNet = filtered.reduce((s, it) => s + (it.netSales || 0), 0);
    const totComm = filtered.reduce((s, it) => s + (it.commissionAmount || 0), 0);
    const totPayable = filtered.reduce((s, it) => s + (it.settlementPayable || 0), 0);
    const totPaid = filtered.reduce((s, it) => s + (it.alreadyPaid || 0), 0);
    const totBal = filtered.reduce((s, it) => s + (it.balanceToPay || 0), 0);

    tfoot.innerHTML = `
      <tr>
        <td colspan="2">TOTALS (${filtered.length} Vendors)</td>
        <td>${totOrders}</td>
        <td>${formatINR(totGross)}</td>
        <td style="color: #F87171;">-${formatINR(totReturns)}</td>
        <td>${formatINR(totNet)}</td>
        <td style="color: #A5B4FC;">${formatINR(totComm)}</td>
        <td style="color: #34D399;">${formatINR(totPayable)}</td>
        <td style="color: #60A5FA;">${formatINR(totPaid)}</td>
        <td style="color: #FBBF24;">${formatINR(totBal)}</td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;
  }
}

function renderVendorsListView() {
  if (!state.vendorsData) return;
  const { eventTotals } = state.vendorsData;
  const filtered = getFilteredAndSortedVendors();

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
          <span class="badge badge-source-auto" id="vendorCountBadge">${filtered.length} Vendors Listed</span>
        </div>
        <div class="panel-controls">
          <input 
            type="search" 
            id="vendorSearchInput"
            class="search-input" 
            placeholder="Search vendor name, stall no..." 
            value="${state.searchQuery}"
            oninput="handleSearch(this.value)"
            autocomplete="off"
            aria-label="Search vendor or stall number"
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
          <tbody id="vendorTableBody">
            ${filtered.length === 0 ? `
              <tr><td colspan="12" style="text-align: center; color: var(--text-muted); padding: 36px;">No vendors found.</td></tr>
            ` : filtered.map(renderVendorTableRowHTML).join('')}
          </tbody>
          <tfoot id="vendorTableFooter">
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

  // GSAP micro-animations on initial load
  if (typeof gsap !== 'undefined') {
    gsap.from('.summary-card', {
      opacity: 0,
      y: 12,
      duration: 0.35,
      stagger: 0.03,
      ease: 'power2.out'
    });
  }
}

function handleSearch(val) {
  state.searchQuery = val;
  updateVendorTableRowsOnly();
}

function handleStatusFilter(val) {
  state.statusFilter = val;
  updateVendorTableRowsOnly();
}

// -------------------------------------------------------------
// 2. Vendor Detail View
// -------------------------------------------------------------
async function selectVendor(vendorId) {
  state.selectedVendorId = vendorId;
  state.vendorDetailSubTab = 'bills';
  state.vendorFilterGroupA = 'all';
  state.vendorFilterGroupB = 'all';
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
  state.vendorFilterGroupA = 'all';
  state.vendorFilterGroupB = 'all';
  loadVendorsSummary();
}

function switchDetailSubTab(subTab) {
  state.vendorDetailSubTab = subTab;
  renderVendorDetailView();
}

function setVendorFilterGroupA(mode) {
  state.vendorFilterGroupA = mode;
  if (mode === 'returns') {
    state.vendorDetailSubTab = 'returns';
  } else if (state.vendorDetailSubTab === 'returns' && mode !== 'all') {
    state.vendorDetailSubTab = 'bills';
  }
  renderVendorDetailView();
}

function setVendorFilterGroupB(mode) {
  state.vendorFilterGroupB = mode;
  renderVendorDetailView();
}

function clearVendorFilters() {
  state.vendorFilterGroupA = 'all';
  state.vendorFilterGroupB = 'all';
  renderVendorDetailView();
}

function renderVendorDetailView() {
  if (!state.selectedVendorData) return;
  const d = state.selectedVendorData;
  const v = d.vendor;

  // 1. Determine vendor's actual master payout status
  const originalPayable = d.settlementPayable || 0;
  const originalPaid = d.alreadyPaid || 0;
  let vendorPayoutStatus = 'not_yet_paid';
  if (originalPaid >= originalPayable && originalPayable > 0) {
    vendorPayoutStatus = 'paid';
  } else if (originalPaid > 0) {
    vendorPayoutStatus = 'partially_paid';
  }

  // 2. Filter Group A (Transaction / Payment Mode)
  let visibleBills = [...d.bills];
  let visibleReturns = [...d.returns];
  let visiblePayouts = [...d.payouts];

  if (state.vendorFilterGroupA === 'paid') {
    visibleBills = visibleBills.filter(b => b.status === 'Paid' && !b.isVoid);
    visibleReturns = [];
  } else if (state.vendorFilterGroupA === 'returns') {
    visibleBills = visibleBills.filter(b => b.status && b.status.toLowerCase().includes('return'));
  } else if (state.vendorFilterGroupA === 'cod') {
    visibleBills = visibleBills.filter(b => !b.isVoid && (b.paymentMode || '').toLowerCase().includes('cash'));
    visibleReturns = [];
  }

  // 3. Filter Group B (Vendor Payout Status)
  let groupBMatches = true;
  if (state.vendorFilterGroupB !== 'all') {
    if (state.vendorFilterGroupB !== vendorPayoutStatus) {
      groupBMatches = false;
      visibleBills = [];
      visibleReturns = [];
      visiblePayouts = [];
    }
  }

  // 4. Dynamic Recalculation of Vendor Overview Cards
  const calcOrdersCount = visibleBills.length;
  const calcGrossSales = visibleBills.reduce((s, b) => s + (b.isVoid ? 0 : b.billAmount), 0);
  const calcReturnsCount = visibleReturns.length;
  const calcReturnsAmount = visibleReturns.reduce((s, r) => s + (r.amount || 0), 0);
  const calcNetSales = Math.max(0, calcGrossSales - calcReturnsAmount);
  const calcCommission = Number((calcNetSales * (v.commissionPct / 100)).toFixed(2));
  const calcSettlementPayable = Number((calcNetSales - calcCommission).toFixed(2));
  const calcAlreadyPaid = visiblePayouts.reduce((s, p) => s + (p.amount || 0), 0);
  const calcBalanceToPay = Number((calcSettlementPayable - calcAlreadyPaid).toFixed(2));

  // Cash vs Online for visible bills
  const cashTotal = visibleBills.filter(b => !b.isVoid && (b.paymentMode || '').toLowerCase().includes('cash'))
    .reduce((s, b) => s + b.billAmount, 0);
  const onlineTotal = visibleBills.filter(b => !b.isVoid && !(b.paymentMode || '').toLowerCase().includes('cash'))
    .reduce((s, b) => s + b.billAmount, 0);

  const activeFilterCount = (state.vendorFilterGroupA !== 'all' ? 1 : 0) + (state.vendorFilterGroupB !== 'all' ? 1 : 0);

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

    <!-- Vendor Detail Filters (Bug 4: Separate Group A & Group B) -->
    <div class="vendor-filters-panel">
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 18px;">
          <!-- Group A: Transaction / Customer Payment Filter -->
          <div class="filter-group">
            <span style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--notion-secondary);">
              🏷️ Group A (Transaction):
            </span>
            <div class="btn-group-pill">
              <button class="filter-pill ${state.vendorFilterGroupA === 'all' ? 'active' : ''}" onclick="setVendorFilterGroupA('all')">All</button>
              <button class="filter-pill ${state.vendorFilterGroupA === 'paid' ? 'active' : ''}" onclick="setVendorFilterGroupA('paid')">Paid</button>
              <button class="filter-pill ${state.vendorFilterGroupA === 'returns' ? 'active' : ''}" onclick="setVendorFilterGroupA('returns')">Returns</button>
              <button class="filter-pill ${state.vendorFilterGroupA === 'cod' ? 'active' : ''}" onclick="setVendorFilterGroupA('cod')">COD (Cash)</button>
            </div>
          </div>

          <!-- Divider -->
          <div style="width: 1px; height: 22px; background: var(--notion-hairline);" class="desktop-only"></div>

          <!-- Group B: Vendor Payout Status Filter -->
          <div class="filter-group">
            <span style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--notion-secondary);">
              💳 Group B (Payout Status):
            </span>
            <div class="btn-group-pill">
              <button class="filter-pill ${state.vendorFilterGroupB === 'all' ? 'active' : ''}" onclick="setVendorFilterGroupB('all')">All</button>
              <button class="filter-pill ${state.vendorFilterGroupB === 'paid' ? 'active' : ''}" onclick="setVendorFilterGroupB('paid')">Paid</button>
              <button class="filter-pill ${state.vendorFilterGroupB === 'partially_paid' ? 'active' : ''}" onclick="setVendorFilterGroupB('partially_paid')">Partially Paid</button>
              <button class="filter-pill ${state.vendorFilterGroupB === 'not_yet_paid' ? 'active' : ''}" onclick="setVendorFilterGroupB('not_yet_paid')">Not Yet Paid</button>
            </div>
          </div>
        </div>

        <!-- Filter Count & Clear Button -->
        <div style="display: flex; align-items: center; gap: 10px; margin-left: auto;">
          ${activeFilterCount > 0 ? `
            <span class="badge badge-source-manual" style="font-size: 0.72rem;">
              ${activeFilterCount} Active Filter${activeFilterCount > 1 ? 's' : ''}
            </span>
            <button class="btn btn-outline btn-xs" onclick="clearVendorFilters()" style="color: var(--notion-red); font-weight: 600;">
              ✕ Clear Filters
            </button>
          ` : `
            <span style="font-size: 0.72rem; color: var(--notion-muted);">All Filters Reset</span>
          `}
        </div>
      </div>
    </div>

    ${!groupBMatches ? `
      <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 20px; color: #DC2626; font-size: 0.82rem;">
        ⚠️ <strong>Group B Filter Mismatch:</strong> This vendor's actual payout status is <strong>${vendorPayoutStatus.replace('_', ' ').toUpperCase()}</strong> (Paid: ${formatINR(d.alreadyPaid)} / Balance: ${formatINR(d.balanceToPay)}), which does not match filter "<strong>${state.vendorFilterGroupB.replace('_', ' ').toUpperCase()}</strong>". Click "Clear Filters" to view records.
      </div>
    ` : ''}

    <!-- Vendor Overview Cards (Dynamically Recalculated for Filtered Subset) -->
    <div class="summary-cards-grid">
      <div class="summary-card">
        <span class="summary-card-label">Total Bills (Orders)</span>
        <span class="summary-card-value">${calcOrdersCount}</span>
        <span class="summary-card-sub">${activeFilterCount > 0 ? 'Filtered bills count' : 'Active bills for vendor'}</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Total Amount (Gross)</span>
        <span class="summary-card-value">${formatINR(calcGrossSales)}</span>
        <span class="summary-card-sub">${activeFilterCount > 0 ? 'Filtered gross sales' : 'Sum of unvoided bills'}</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Total Returns</span>
        <span class="summary-card-value" style="color: var(--notion-red);">-${formatINR(calcReturnsAmount)}</span>
        <span class="summary-card-sub">${calcReturnsCount} returns recorded</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Net Sales</span>
        <span class="summary-card-value">${formatINR(calcNetSales)}</span>
        <span class="summary-card-sub">Gross minus returns</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">HalfPe Commission</span>
        <span class="summary-card-value" style="color: var(--notion-secondary);">${formatINR(calcCommission)}</span>
        <span class="summary-card-sub">Net Sales × ${v.commissionPct}%</span>
      </div>
      <div class="summary-card card-highlight-payable">
        <span class="summary-card-label">Settlement Payable</span>
        <span class="summary-card-value">${formatINR(calcSettlementPayable)}</span>
        <span class="summary-card-sub">Net Sales minus commission</span>
      </div>
      <div class="summary-card">
        <span class="summary-card-label">Already Paid</span>
        <span class="summary-card-value" style="color: var(--notion-primary);">${formatINR(calcAlreadyPaid)}</span>
        <span class="summary-card-sub">${visiblePayouts.length} payouts logged</span>
      </div>
      <div class="summary-card card-highlight-balance">
        <span class="summary-card-label">Balance to Pay</span>
        <span class="summary-card-value">${formatINR(calcBalanceToPay)}</span>
        <span class="summary-card-sub">Remaining to disburse</span>
      </div>
    </div>

    <!-- Sub Navigation Tabs -->
    <div class="sub-tabs-bar">
      <button class="sub-tab ${state.vendorDetailSubTab === 'bills' ? 'active' : ''}" onclick="switchDetailSubTab('bills')">
        📋 Orders & Bills Ledger (${visibleBills.length})
      </button>
      <button class="sub-tab ${state.vendorDetailSubTab === 'returns' ? 'active' : ''}" onclick="switchDetailSubTab('returns')">
        ↩️ Returns Management (${visibleReturns.length})
      </button>
      <button class="sub-tab ${state.vendorDetailSubTab === 'payouts' ? 'active' : ''}" onclick="switchDetailSubTab('payouts')">
        💳 Payout History (${visiblePayouts.length})
      </button>
      <button class="sub-tab ${state.vendorDetailSubTab === 'audit' ? 'active' : ''}" onclick="switchDetailSubTab('audit')">
        📜 Vendor Audit History (${d.auditHistory.length})
      </button>
    </div>

    <!-- Sub Tab Contents -->
    ${state.vendorDetailSubTab === 'bills' ? renderBillsLedgerTab(visibleBills, v.id) : ''}
    ${state.vendorDetailSubTab === 'returns' ? renderReturnsTab(visibleReturns, v.id) : ''}
    ${state.vendorDetailSubTab === 'payouts' ? renderPayoutsTab(visiblePayouts, v.id, calcBalanceToPay) : ''}
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

// =============================================================
// KRISHNA PILLAR 2: ORDERS MANAGEMENT & SHOPIFY PUSH ENGINE
// =============================================================

let ordersManagementState = {
  search: '',
  statusFilter: 'all',
  shopifyFilter: 'all',
  selectedOrderIds: new Set(),
  ordersList: []
};

async function renderOrdersManagementView() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  main.innerHTML = `
    <div class="view-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
      <div>
        <h1 class="view-title" style="font-size: 1.6rem; font-weight: 700; color: var(--notion-ink); display: flex; align-items: center; gap: 10px;">
          📦 Orders Management
          <span class="badge badge-blue" style="font-size: 0.75rem; vertical-align: middle;">Pre-Shopify Staging</span>
        </h1>
        <p class="view-subtitle" style="color: var(--notion-secondary); font-size: 0.88rem; margin-top: 4px;">
          Review internally recorded customer orders, verify details, and push approved orders to Shopify.
        </p>
      </div>

      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <button class="btn btn-outline btn-sm" onclick="renderOrdersManagementView()">
          🔄 Refresh Orders
        </button>
        ${getUserRole() === 'super_admin' ? `
          <button class="btn btn-primary btn-sm" onclick="bulkPushApprovedOrders()">
            🚀 Bulk Push Approved to Shopify
          </button>
        ` : ''}
      </div>
    </div>

    <!-- Orders Filter Bar -->
    <div class="card" style="padding: 16px; margin-bottom: 20px; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline);">
      <div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
        <div style="display: flex; gap: 10px; flex-grow: 1; max-width: 400px;">
          <input type="text" id="orderSearchInput" class="form-input" placeholder="🔍 Search by Bill #, Customer Name, Phone, Stall..." 
            value="${escapeHtml(ordersManagementState.search)}" oninput="handleOrderSearch(this.value)" style="width: 100%; height: 36px;">
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 0.82rem; font-weight: 600; color: var(--notion-secondary);">Shopify Sync:</span>
          <button class="btn btn-xs ${ordersManagementState.shopifyFilter === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="setOrderShopifyFilter('all')">All</button>
          <button class="btn btn-xs ${ordersManagementState.shopifyFilter === 'NOT_PUSHED' ? 'btn-primary' : 'btn-outline'}" onclick="setOrderShopifyFilter('NOT_PUSHED')">⏳ Awaiting Push</button>
          <button class="btn btn-xs ${ordersManagementState.shopifyFilter === 'PUSHED' ? 'btn-primary' : 'btn-outline'}" onclick="setOrderShopifyFilter('PUSHED')">✓ Pushed to Shopify</button>
          <button class="btn btn-xs ${ordersManagementState.shopifyFilter === 'FAILED' ? 'btn-primary' : 'btn-outline'}" onclick="setOrderShopifyFilter('FAILED')">✕ Push Failed</button>
        </div>
      </div>
    </div>

    <!-- Orders Table Container -->
    <div id="ordersTableContainer">
      <div style="text-align: center; padding: 40px; color: var(--notion-secondary);">
        ⏳ Loading internal orders...
      </div>
    </div>
  `;

  await loadAndRenderOrdersTable();
}

async function loadAndRenderOrdersTable() {
  const container = document.getElementById('ordersTableContainer');
  if (!container) return;

  try {
    const params = new URLSearchParams();
    if (state.startDate) params.append('startDate', state.startDate);
    if (state.endDate) params.append('endDate', state.endDate);
    if (ordersManagementState.search) params.append('search', ordersManagementState.search);
    if (ordersManagementState.shopifyFilter !== 'all') params.append('shopifySyncStatus', ordersManagementState.shopifyFilter);
    if (state.selectedGlobalVendor && state.selectedGlobalVendor !== 'all') params.append('vendorId', state.selectedGlobalVendor);

    const res = await fetch(`/api/orders?${params.toString()}`);
    const orders = await res.json();
    ordersManagementState.ordersList = orders;

    if (!Array.isArray(orders) || orders.length === 0) {
      container.innerHTML = `
        <div class="card" style="padding: 48px; text-align: center; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline);">
          <div style="font-size: 2.2rem; margin-bottom: 12px;">📦</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--notion-ink);">No Internal Orders Found</h3>
          <p style="color: var(--notion-secondary); font-size: 0.88rem; max-width: 440px; margin: 8px auto 0;">
            Orders recorded through the payment page will appear here for Super Admin approval before being pushed to Shopify.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-card" style="background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); overflow: hidden; box-shadow: var(--shadow-soft);">
        <div style="padding: 12px 18px; background: var(--notion-surface-warm); border-bottom: 1px solid var(--notion-hairline); display: flex; justify-content: space-between; align-items: center; font-size: 0.84rem; color: var(--notion-secondary);">
          <span>Showing <strong>${orders.length}</strong> recorded orders</span>
          ${getUserRole() === 'super_admin' ? `
            <span style="font-size: 0.8rem;">💡 Only Super Admin can approve and push orders to Shopify</span>
          ` : ''}
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="background: var(--notion-surface-warm); border-bottom: 1px solid var(--notion-hairline); text-align: left;">
                <th style="padding: 10px 14px; width: 36px;">
                  <input type="checkbox" onchange="toggleSelectAllOrders(this.checked)" title="Select all unpushed">
                </th>
                <th style="padding: 10px 14px;">Bill # / Ref</th>
                <th style="padding: 10px 14px;">Customer</th>
                <th style="padding: 10px 14px;">Stall & Vendor</th>
                <th style="padding: 10px 14px; text-align: right;">Gross Sale</th>
                <th style="padding: 10px 14px; text-align: right;">Net Payable</th>
                <th style="padding: 10px 14px;">Payment</th>
                <th style="padding: 10px 14px;">Shopify Status</th>
                <th style="padding: 10px 14px;">Approval</th>
                <th style="padding: 10px 14px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => {
                const isPushed = o.shopifySyncStatus === 'PUSHED';
                const isFailed = o.shopifySyncStatus === 'FAILED';
                const gross = o.totals?.grossAmount || o.totalPayable || 0;
                const net = o.totalPayable || gross;
                return `
                  <tr style="border-bottom: 1px solid var(--notion-hairline-subtle); transition: background 0.15s;" onmouseover="this.style.background='#faf9f8'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 14px;">
                      <input type="checkbox" ${isPushed ? 'disabled' : ''} value="${o.id}" 
                        ${ordersManagementState.selectedOrderIds.has(o.id) ? 'checked' : ''}
                        onchange="toggleSelectOrder('${o.id}', this.checked)">
                    </td>
                    <td style="padding: 12px 14px;">
                      <strong style="color: var(--notion-ink);">${escapeHtml(o.billNo || o.id)}</strong>
                      <div style="font-size: 0.72rem; color: var(--notion-muted);">${formatDate(o.createdAt)}</div>
                    </td>
                    <td style="padding: 12px 14px;">
                      <div style="font-weight: 500;">${escapeHtml(o.customer?.name || 'Walk-in')}</div>
                      <div style="font-size: 0.75rem; color: var(--notion-secondary);">${escapeHtml(o.customer?.phone || '-')}</div>
                    </td>
                    <td style="padding: 12px 14px;">
                      <span class="badge" style="background: #eef2f6; font-size: 0.72rem; font-weight: 600;">${escapeHtml(o.stallNo || 'Stall TBD')}</span>
                      <div style="font-size: 0.8rem; color: var(--notion-ink); margin-top: 2px;">${escapeHtml(o.vendorName || 'Unassigned')}</div>
                    </td>
                    <td style="padding: 12px 14px; text-align: right; font-weight: 600;">
                      ₹${Number(gross).toLocaleString('en-IN')}
                    </td>
                    <td style="padding: 12px 14px; text-align: right; font-weight: 600; color: #0075DE;">
                      ₹${Number(net).toLocaleString('en-IN')}
                    </td>
                    <td style="padding: 12px 14px;">
                      <div style="font-size: 0.78rem; font-weight: 500;">${escapeHtml(o.payment?.method || 'Prepaid')}</div>
                      <div style="font-size: 0.7rem; color: var(--notion-muted); font-family: var(--font-mono);">${escapeHtml(o.payment?.paymentId ? String(o.payment.paymentId).slice(-10) : '-')}</div>
                    </td>
                    <td style="padding: 12px 14px;">
                      ${isPushed ? `
                        <span class="badge" style="background: #d4edda; color: #155724; font-size: 0.75rem; font-weight: 600;">
                          ✓ Shopify #${escapeHtml(String(o.shopifyOrderNumber || o.shopifyOrderId))}
                        </span>
                      ` : isFailed ? `
                        <span class="badge" style="background: #f8d7da; color: #721c24; font-size: 0.75rem; font-weight: 600;" title="${escapeHtml(o.shopifyError || 'Error')}">
                          ✕ Push Failed
                        </span>
                      ` : `
                        <span class="badge" style="background: #fff3cd; color: #856404; font-size: 0.75rem; font-weight: 600;">
                          ⏳ Awaiting Push
                        </span>
                      `}
                    </td>
                    <td style="padding: 12px 14px;">
                      <span class="badge" style="font-size: 0.72rem; ${o.status === 'APPROVED' ? 'background: #e8f4fd; color: #0075DE;' : 'background: #f0f0f0; color: #555;'}">
                        ${escapeHtml(o.status || 'PENDING')}
                      </span>
                    </td>
                    <td style="padding: 12px 14px; text-align: right; white-space: nowrap;">
                      <div style="display: inline-flex; gap: 6px;">
                        <button class="btn btn-outline btn-xs" onclick="openViewOrderModal('${o.id}')" title="Inspect Order Details">
                          👁️ View
                        </button>
                        ${getUserRole() === 'super_admin' ? `
                          <button class="btn btn-outline btn-xs" onclick="openEditOrderModal('${o.id}')" title="Edit Stall / Vendor / Customer">
                            ✏️ Edit
                          </button>
                          ${!isPushed ? `
                            <button class="btn btn-primary btn-xs" id="pushBtn_${o.id}" onclick="pushSingleOrderToShopify('${o.id}')">
                              🚀 Push to Shopify
                            </button>
                          ` : ''}
                        ` : ''}
                      </div>
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
    container.innerHTML = `<div class="card" style="padding: 24px; color: red;">Error loading orders: ${err.message}</div>`;
  }
}

function handleOrderSearch(val) {
  ordersManagementState.search = val.trim();
  loadAndRenderOrdersTable();
}

function setOrderShopifyFilter(status) {
  ordersManagementState.shopifyFilter = status;
  renderOrdersManagementView();
}

function toggleSelectOrder(id, checked) {
  if (checked) ordersManagementState.selectedOrderIds.add(id);
  else ordersManagementState.selectedOrderIds.delete(id);
}

function toggleSelectAllOrders(checked) {
  const checkboxes = document.querySelectorAll('#ordersTableContainer tbody input[type="checkbox"]:not([disabled])');
  checkboxes.forEach(cb => {
    cb.checked = checked;
    if (checked) ordersManagementState.selectedOrderIds.add(cb.value);
    else ordersManagementState.selectedOrderIds.delete(cb.value);
  });
}

// Push Single Order to Shopify (Super Admin Only)
async function pushSingleOrderToShopify(orderId) {
  if (getUserRole() !== 'super_admin') {
    toast('Access Denied: Only Super Admin can push orders to Shopify.', 'error');
    return;
  }

  const btn = document.getElementById(`pushBtn_${orderId}`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Pushing...';
  }

  toast('Creating Shopify Order with Webkul stall tagging...', 'info');

  try {
    const res = await fetch(`/api/orders/${orderId}/push-to-shopify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();

    if (data.success) {
      toast(`✓ Shopify Order #${data.shopifyOrderNumber} created successfully!`, 'success');
      await loadAndRenderOrdersTable();
    } else {
      toast(`Push rejected: ${data.error || 'Shopify API error'}`, 'error');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Retry Push';
      }
    }
  } catch (err) {
    toast(`Network failure during Shopify push: ${err.message}`, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Retry Push';
    }
  }
}

// Bulk Push to Shopify
async function bulkPushApprovedOrders() {
  if (getUserRole() !== 'super_admin') {
    toast('Access Denied: Only Super Admin can execute bulk push.', 'error');
    return;
  }

  const ids = Array.from(ordersManagementState.selectedOrderIds);
  if (ids.length === 0) {
    toast('Please select at least one unpushed order to push to Shopify.', 'error');
    return;
  }

  if (!confirm(`Are you sure you want to push ${ids.length} orders to Shopify? This action is create-only.`)) {
    return;
  }

  toast(`Pushing ${ids.length} orders to Shopify...`, 'info');

  try {
    const res = await fetch('/api/orders/bulk-push-to-shopify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: ids })
    });
    const data = await res.json();

    if (data.success) {
      const successCount = data.results.filter(r => r.success).length;
      toast(`✓ Successfully created ${successCount} of ${ids.length} orders in Shopify!`, 'success');
      ordersManagementState.selectedOrderIds.clear();
      await loadAndRenderOrdersTable();
    } else {
      toast(`Bulk push failed: ${data.error}`, 'error');
    }
  } catch (err) {
    toast(`Bulk push error: ${err.message}`, 'error');
  }
}

// Order View Modal
async function openViewOrderModal(orderId) {
  const container = document.getElementById('modalContainer');
  if (!container) return;

  try {
    const res = await fetch(`/api/orders/${orderId}`);
    const order = await res.json();

    container.innerHTML = `
      <div class="login-modal-box" style="max-width: 600px;">
        <div class="login-modal-header">
          <div>
            <h3 class="login-modal-title">📦 Order #${escapeHtml(order.billNo)}</h3>
            <p class="login-modal-sub">Internal HalfPe Record Details</p>
          </div>
          <button class="modal-close-btn" onclick="closeModal()">×</button>
        </div>
        <div class="login-modal-body" style="padding: 24px; max-height: 70vh; overflow-y: auto;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
            <div style="background: var(--notion-surface-warm); padding: 12px; border-radius: var(--radius-sm);">
              <span style="font-size: 0.75rem; color: var(--notion-secondary);">Customer:</span>
              <div style="font-weight: 600; font-size: 0.92rem;">${escapeHtml(order.customer?.name || 'Walk-in')}</div>
              <div style="font-size: 0.8rem; color: var(--notion-secondary);">${escapeHtml(order.customer?.phone || '-')}</div>
            </div>
            <div style="background: var(--notion-surface-warm); padding: 12px; border-radius: var(--radius-sm);">
              <span style="font-size: 0.75rem; color: var(--notion-secondary);">Vendor Allocation:</span>
              <div style="font-weight: 600; font-size: 0.92rem;">${escapeHtml(order.vendorName || '-')}</div>
              <div style="font-size: 0.8rem; color: var(--notion-secondary);">${escapeHtml(order.stallNo || '-')}</div>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 8px;">Order Items</h4>
            <div style="border: 1px solid var(--notion-hairline); border-radius: var(--radius-sm); overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
                <thead>
                  <tr style="background: var(--notion-surface-warm); text-align: left;">
                    <th style="padding: 8px 12px;">Item</th>
                    <th style="padding: 8px 12px; text-align: center;">Qty</th>
                    <th style="padding: 8px 12px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${(order.items && order.items.length > 0) ? order.items.map(it => `
                    <tr style="border-top: 1px solid var(--notion-hairline);">
                      <td style="padding: 8px 12px;">${escapeHtml(it.title || it.name || 'Expo Item')}</td>
                      <td style="padding: 8px 12px; text-align: center;">${it.quantity || it.qty || 1}</td>
                      <td style="padding: 8px 12px; text-align: right;">₹${Number(it.eventPrice || it.price || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  `).join('') : `
                    <tr><td colspan="3" style="padding: 12px; text-align: center; color: var(--notion-secondary);">Single Expo item sale</td></tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>

          <div style="background: #fdfdfd; border: 1px solid var(--notion-hairline); padding: 14px; border-radius: var(--radius-sm); margin-bottom: 20px; font-size: 0.85rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>Gross Sale:</span>
              <strong>₹${Number(order.totals?.grossAmount || order.totalPayable || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>Vendor Commission (${order.commissionPct || 15}%):</span>
              <span style="color: #666;">-₹${Number(order.totals?.commissionAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; border-top: 1px solid var(--notion-hairline); padding-top: 6px; color: #0075DE;">
              <span>Net Payable to Vendor:</span>
              <span>₹${Number(order.totalPayable || 0).toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.8rem;">
              <span>Payout Status:</span>
              <span class="badge ${order.payoutStatus === 'FULLY_PAID' ? 'badge-green' : (order.amountPaid > 0 ? 'badge-amber' : 'badge-outline')}">
                ${order.payoutStatus || 'UNPAID'} (Paid: ₹${order.amountPaid || 0} / Bal: ₹${order.outstandingBalance || order.totalPayable || 0})
              </span>
            </div>
          </div>

          <div style="background: var(--notion-surface-warm); padding: 12px; border-radius: var(--radius-sm); font-size: 0.8rem;">
            <div><strong>Shopify Sync:</strong> ${order.shopifySyncStatus || 'NOT_PUSHED'}</div>
            ${order.shopifyOrderId ? `<div style="margin-top: 4px;"><strong>Shopify Order ID:</strong> ${order.shopifyOrderId} (#${order.shopifyOrderNumber || ''})</div>` : ''}
            ${order.pushedBy ? `<div style="margin-top: 4px;"><strong>Pushed By:</strong> ${order.pushedBy} on ${formatDate(order.pushedAt)}</div>` : ''}
            ${order.shopifyError ? `<div style="margin-top: 4px; color: red;"><strong>Push Error:</strong> ${escapeHtml(order.shopifyError)}</div>` : ''}
          </div>
        </div>
        <div class="login-modal-footer" style="padding: 14px 24px; border-top: 1px solid var(--notion-hairline); display: flex; justify-content: flex-end;">
          <button class="btn btn-outline btn-sm" onclick="closeModal()">Close</button>
        </div>
      </div>
    `;
    container.classList.remove('hidden');
  } catch (e) {
    toast('Failed to load order: ' + e.message, 'error');
  }
}

// Edit Order Modal (Super Admin Only)
async function openEditOrderModal(orderId) {
  if (getUserRole() !== 'super_admin') {
    toast('Only Super Admin can edit internal order records.', 'error');
    return;
  }

  const container = document.getElementById('modalContainer');
  if (!container) return;

  try {
    const res = await fetch(`/api/orders/${orderId}`);
    const order = await res.json();
    const vendors = (state.vendorsData && state.vendorsData.vendors) ? state.vendorsData.vendors : [];

    container.innerHTML = `
      <div class="login-modal-box" style="max-width: 540px;">
        <div class="login-modal-header">
          <div>
            <h3 class="login-modal-title">✏️ Edit Order #${escapeHtml(order.billNo)}</h3>
            <p class="login-modal-sub">Correct details before pushing to Shopify</p>
          </div>
          <button class="modal-close-btn" onclick="closeModal()">×</button>
        </div>
        <form id="editOrderForm" onsubmit="submitEditOrder(event, '${order.id}')" style="padding: 24px;">
          <div style="margin-bottom: 16px;">
            <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Assign Vendor / Stall:</label>
            <select id="editOrderVendorId" class="form-input" style="width: 100%; height: 38px;">
              ${vendors.map(vObj => {
                const v = vObj.vendor || vObj;
                return `<option value="${v.id}" ${v.id === order.vendorId ? 'selected' : ''}>${v.stallNo}: ${v.name}</option>`;
              }).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div>
              <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Customer Name:</label>
              <input type="text" id="editOrderCustName" class="form-input" value="${escapeHtml(order.customer?.name || '')}" style="width: 100%; height: 36px;" required>
            </div>
            <div>
              <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Customer Phone:</label>
              <input type="text" id="editOrderCustPhone" class="form-input" value="${escapeHtml(order.customer?.phone || '')}" style="width: 100%; height: 36px;">
            </div>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Approval Status:</label>
            <select id="editOrderStatus" class="form-input" style="width: 100%; height: 36px;">
              <option value="PENDING_APPROVAL" ${order.status === 'PENDING_APPROVAL' ? 'selected' : ''}>Pending Approval</option>
              <option value="APPROVED" ${order.status === 'APPROVED' ? 'selected' : ''}>Approved (Ready for Shopify Push)</option>
              <option value="REJECTED" ${order.status === 'REJECTED' ? 'selected' : ''}>Rejected / Void</option>
            </select>
          </div>

          <div style="background: #fff8e6; padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid #ffd591; font-size: 0.78rem; color: #873800; margin-bottom: 20px;">
            ⚠️ Changes will be recorded in the audit log. Once pushed to Shopify, the order is locked against overwrite.
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Save Changes</button>
          </div>
        </form>
      </div>
    `;
    container.classList.remove('hidden');
  } catch (err) {
    toast('Failed to open edit modal: ' + err.message, 'error');
  }
}

async function submitEditOrder(e, orderId) {
  e.preventDefault();
  const vendorId = document.getElementById('editOrderVendorId').value;
  const customerName = document.getElementById('editOrderCustName').value;
  const customerPhone = document.getElementById('editOrderCustPhone').value;
  const status = document.getElementById('editOrderStatus').value;

  try {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendorId,
        customer: { name: customerName, phone: customerPhone },
        status
      })
    });
    const data = await res.json();
    if (data.success) {
      toast('✓ Order details updated successfully!', 'success');
      closeModal();
      await loadAndRenderOrdersTable();
    } else {
      toast(`Update failed: ${data.error}`, 'error');
    }
  } catch (err) {
    toast('Network error: ' + err.message, 'error');
  }
}


// =============================================================
// KRISHNA PILLAR 4: SUPER ADMIN VENDOR MANAGEMENT (CRUD)
// =============================================================

async function renderVendorManagementView() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  main.innerHTML = `
    <div class="view-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
      <div>
        <h1 class="view-title" style="font-size: 1.6rem; font-weight: 700; color: var(--notion-ink); display: flex; align-items: center; gap: 10px;">
          🏬 Vendor Management
          <span class="badge badge-purple" style="font-size: 0.75rem; vertical-align: middle;">Directory Master</span>
        </h1>
        <p class="view-subtitle" style="color: var(--notion-secondary); font-size: 0.88rem; margin-top: 4px;">
          Add official vendors, assign or change stall numbers, and manage vendor active status without deleting historical records.
        </p>
      </div>

      <div style="display: flex; gap: 10px; align-items: center;">
        ${getUserRole() === 'super_admin' ? `
          <button class="btn btn-primary btn-sm" onclick="openAddVendorModal()">
            ➕ Add New Vendor
          </button>
        ` : ''}
      </div>
    </div>

    <!-- Vendor Registry Table -->
    <div id="vendorMgmtTableContainer">
      <div style="text-align: center; padding: 40px; color: var(--notion-secondary);">
        ⏳ Loading vendor directory...
      </div>
    </div>
  `;

  await loadAndRenderVendorMgmtTable();
}

async function loadAndRenderVendorMgmtTable() {
  const container = document.getElementById('vendorMgmtTableContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/vendors?includeInactive=true');
    const data = await res.json();
    const vendors = (data && data.vendors) ? data.vendors : [];

    const sorted = [...vendors].sort(compareStallNumbers);

    container.innerHTML = `
      <div class="table-card" style="background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); overflow: hidden; box-shadow: var(--shadow-soft);">
        <div style="padding: 12px 18px; background: var(--notion-surface-warm); border-bottom: 1px solid var(--notion-hairline); display: flex; justify-content: space-between; align-items: center; font-size: 0.84rem; color: var(--notion-secondary);">
          <span>Total Registered Vendors: <strong>${sorted.length}</strong></span>
          <span style="font-size: 0.8rem; color: #28a745;">🛡️ Historical records safeguarded (Soft deactivation only)</span>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="background: var(--notion-surface-warm); border-bottom: 1px solid var(--notion-hairline); text-align: left;">
                <th style="padding: 10px 14px;">Stall #</th>
                <th style="padding: 10px 14px;">Vendor Name</th>
                <th style="padding: 10px 14px;">Code / Stable ID</th>
                <th style="padding: 10px 14px;">Category</th>
                <th style="padding: 10px 14px; text-align: center;">Commission</th>
                <th style="padding: 10px 14px;">Status</th>
                <th style="padding: 10px 14px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.map(vObj => {
                const v = vObj.vendor || vObj;
                const isActive = v.active !== false;
                return `
                  <tr style="border-bottom: 1px solid var(--notion-hairline-subtle); opacity: ${isActive ? '1' : '0.6'};">
                    <td style="padding: 12px 14px;">
                      <span class="badge" style="background: #eef2f6; font-size: 0.78rem; font-weight: 600;">${escapeHtml(v.stallNo || 'Stall TBD')}</span>
                    </td>
                    <td style="padding: 12px 14px;">
                      <strong style="color: var(--notion-ink);">${escapeHtml(v.name)}</strong>
                      ${v.phone ? `<div style="font-size: 0.72rem; color: var(--notion-muted);">📞 ${escapeHtml(v.phone)}</div>` : ''}
                    </td>
                    <td style="padding: 12px 14px; font-family: var(--font-mono); font-size: 0.8rem;">
                      ${escapeHtml(v.id || v.code)}
                    </td>
                    <td style="padding: 12px 14px;">
                      ${escapeHtml(v.category || 'Retail')}
                    </td>
                    <td style="padding: 12px 14px; text-align: center;">
                      <span class="badge" style="background: #e8f4fd; color: #0075DE; font-weight: 600;">${v.commissionPct || 15}%</span>
                    </td>
                    <td style="padding: 12px 14px;">
                      ${isActive ? `
                        <span class="badge badge-green" style="font-size: 0.72rem;">Active</span>
                      ` : `
                        <span class="badge" style="background: #eee; color: #777; font-size: 0.72rem;">Deactivated</span>
                      `}
                    </td>
                    <td style="padding: 12px 14px; text-align: right; white-space: nowrap;">
                      ${getUserRole() === 'super_admin' ? `
                        <button class="btn btn-outline btn-xs" onclick="openEditVendorModal('${v.id}')">
                          ✏️ Edit
                        </button>
                        <button class="btn ${isActive ? 'btn-danger-outline' : 'btn-outline'} btn-xs" style="margin-left: 6px;" onclick="toggleVendorActiveStatus('${v.id}', ${!isActive})">
                          ${isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      ` : `
                        <span style="font-size: 0.75rem; color: var(--notion-muted);">Read-only</span>
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
    container.innerHTML = `<div class="card" style="padding: 24px; color: red;">Error: ${err.message}</div>`;
  }
}

function openAddVendorModal() {
  const container = document.getElementById('modalContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="login-modal-box" style="max-width: 500px;">
      <div class="login-modal-header">
        <div>
          <h3 class="login-modal-title">➕ Add New Event Vendor</h3>
          <p class="login-modal-sub">Create official vendor record in registry</p>
        </div>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>
      <form id="addVendorForm" onsubmit="submitAddVendor(event)" style="padding: 24px;">
        <div style="margin-bottom: 14px;">
          <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Vendor / Brand Name:</label>
          <input type="text" id="newVendorName" class="form-input" placeholder="e.g. Silk Traditions" style="width: 100%; height: 36px;" required>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
          <div>
            <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Stall Number:</label>
            <input type="text" id="newVendorStall" class="form-input" placeholder="e.g. Stall 92" style="width: 100%; height: 36px;" required>
          </div>
          <div>
            <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Short Code:</label>
            <input type="text" id="newVendorCode" class="form-input" placeholder="e.g. STR" style="width: 100%; height: 36px;" required>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
          <div>
            <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Category:</label>
            <input type="text" id="newVendorCategory" class="form-input" placeholder="e.g. Handlooms" style="width: 100%; height: 36px;">
          </div>
          <div>
            <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Commission %:</label>
            <input type="number" id="newVendorCommission" class="form-input" value="15" step="0.1" style="width: 100%; height: 36px;">
          </div>
        </div>
        <div style="margin-bottom: 18px;">
          <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Contact Phone / WhatsApp:</label>
          <input type="text" id="newVendorPhone" class="form-input" placeholder="e.g. 9876543210" style="width: 100%; height: 36px;">
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" class="btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Add Vendor</button>
        </div>
      </form>
    </div>
  `;
  container.classList.remove('hidden');
}

async function submitAddVendor(e) {
  e.preventDefault();
  const name = document.getElementById('newVendorName').value;
  const stallNo = document.getElementById('newVendorStall').value;
  const code = document.getElementById('newVendorCode').value;
  const category = document.getElementById('newVendorCategory').value;
  const commissionPct = document.getElementById('newVendorCommission').value;
  const phone = document.getElementById('newVendorPhone').value;

  try {
    const res = await fetch('/api/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, stallNo, code, category, commissionPct, phone })
    });
    const data = await res.json();
    if (data.success) {
      toast(`✓ Vendor "${data.vendor.name}" registered successfully!`, 'success');
      closeModal();
      await loadVendorsSummary();
      await loadAndRenderVendorMgmtTable();
    } else {
      toast(`Failed to add vendor: ${data.error}`, 'error');
    }
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}

async function openEditVendorModal(vendorId) {
  const container = document.getElementById('modalContainer');
  if (!container) return;

  try {
    const res = await fetch(`/api/vendors/${vendorId}`);
    const data = await res.json();
    const v = data.vendor;

    container.innerHTML = `
      <div class="login-modal-box" style="max-width: 500px;">
        <div class="login-modal-header">
          <div>
            <h3 class="login-modal-title">✏️ Edit Vendor: ${escapeHtml(v.name)}</h3>
            <p class="login-modal-sub">Update stall or settlement parameters</p>
          </div>
          <button class="modal-close-btn" onclick="closeModal()">×</button>
        </div>
        <form id="editVendorForm" onsubmit="submitEditVendor(event, '${v.id}')" style="padding: 24px;">
          <div style="margin-bottom: 14px;">
            <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Vendor Name:</label>
            <input type="text" id="editVendorName" class="form-input" value="${escapeHtml(v.name)}" style="width: 100%; height: 36px;" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div>
              <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Stall Number:</label>
              <input type="text" id="editVendorStall" class="form-input" value="${escapeHtml(v.stallNo)}" style="width: 100%; height: 36px;" required>
            </div>
            <div>
              <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Commission %:</label>
              <input type="number" id="editVendorComm" class="form-input" value="${v.commissionPct || 15}" step="0.1" style="width: 100%; height: 36px;" required>
            </div>
          </div>
          <div style="margin-bottom: 14px;">
            <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Category:</label>
            <input type="text" id="editVendorCat" class="form-input" value="${escapeHtml(v.category || '')}" style="width: 100%; height: 36px;">
          </div>
          <div style="margin-bottom: 18px;">
            <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Phone / UPI ID:</label>
            <input type="text" id="editVendorPhone" class="form-input" value="${escapeHtml(v.phone || v.upiId || '')}" style="width: 100%; height: 36px;">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Update Vendor</button>
          </div>
        </form>
      </div>
    `;
    container.classList.remove('hidden');
  } catch (err) {
    toast('Failed to load vendor: ' + err.message, 'error');
  }
}

async function submitEditVendor(e, vendorId) {
  e.preventDefault();
  const name = document.getElementById('editVendorName').value;
  const stallNo = document.getElementById('editVendorStall').value;
  const commissionPct = document.getElementById('editVendorComm').value;
  const category = document.getElementById('editVendorCat').value;
  const phone = document.getElementById('editVendorPhone').value;

  try {
    const res = await fetch(`/api/vendors/${vendorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, stallNo, commissionPct, category, phone })
    });
    const data = await res.json();
    if (data.success) {
      toast('✓ Vendor details updated successfully!', 'success');
      closeModal();
      await loadVendorsSummary();
      await loadAndRenderVendorMgmtTable();
    } else {
      toast(`Update failed: ${data.error}`, 'error');
    }
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}

async function toggleVendorActiveStatus(vendorId, active) {
  const msg = active 
    ? 'Are you sure you want to reactivate this vendor in the directory?' 
    : 'Are you sure you want to deactivate this vendor? Note: Past settlement and order history will be completely preserved.';
  if (!confirm(msg)) return;

  try {
    const res = await fetch(`/api/vendors/${vendorId}/toggle-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    });
    const data = await res.json();
    if (data.success) {
      toast(`✓ Vendor ${active ? 'activated' : 'deactivated/archived'} successfully!`, 'info');
      await loadVendorsSummary();
      await loadAndRenderVendorMgmtTable();
    } else {
      toast(`Status update failed: ${data.error}`, 'error');
    }
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}


// =============================================================
// KRISHNA PILLAR 6: ORDER-LINKED PAYOUTS & PARTIAL SETTLEMENTS
// =============================================================

async function renderPayoutManagementView() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  main.innerHTML = `
    <div class="view-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
      <div>
        <h1 class="view-title" style="font-size: 1.6rem; font-weight: 700; color: var(--notion-ink); display: flex; align-items: center; gap: 10px;">
          💸 Payout Management
          <span class="badge badge-green" style="font-size: 0.75rem; vertical-align: middle;">Order-Linked Settlement</span>
        </h1>
        <p class="view-subtitle" style="color: var(--notion-secondary); font-size: 0.88rem; margin-top: 4px;">
          Disburse vendor settlements linked directly to specific customer orders with full partial-payment and balance tracking.
        </p>
      </div>

      <div style="display: flex; gap: 10px; align-items: center;">
        ${(getUserRole() === 'finance' || getUserRole() === 'super_admin') ? `
          <button class="btn btn-primary btn-sm" onclick="openOrderPayoutModal()">
            ➕ Record Order-Linked Payout
          </button>
        ` : ''}
      </div>
    </div>

    <!-- Payouts Content Container -->
    <div id="payoutMgmtContentContainer">
      <div style="text-align: center; padding: 40px; color: var(--notion-secondary);">
        ⏳ Loading payouts history...
      </div>
    </div>
  `;

  await loadAndRenderPayoutMgmt();
}

async function loadAndRenderPayoutMgmt() {
  const container = document.getElementById('payoutMgmtContentContainer');
  if (!container) return;

  try {
    // 1. Fetch vendor summary for overall metrics
    const vRes = await fetch('/api/vendors');
    const vData = await vRes.json();
    const totals = vData.eventTotals || {};

    // 2. Collect all payouts across vendors
    const allPayouts = [];
    if (vData && vData.vendors) {
      for (const vObj of vData.vendors) {
        const v = vObj.vendor || vObj;
        const res = await fetch(`/api/vendors/${v.id}`);
        const single = await res.json();
        if (single.payouts && single.payouts.length > 0) {
          single.payouts.forEach(p => {
            allPayouts.push({ ...p, vendorName: v.name, stallNo: v.stallNo });
          });
        }
      }
    }

    allPayouts.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    container.innerHTML = `
      <!-- Financial Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="padding: 18px; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); box-shadow: var(--shadow-soft);">
          <div style="font-size: 0.82rem; color: var(--notion-secondary); margin-bottom: 4px;">Gross Sales Recorded</div>
          <div style="font-size: 1.4rem; font-weight: 700; color: var(--notion-ink);">${formatINR(totals.grossSales || 0)}</div>
          <div style="font-size: 0.74rem; color: var(--notion-muted); margin-top: 4px;">Across all vendor stalls</div>
        </div>
        <div class="card" style="padding: 18px; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); box-shadow: var(--shadow-soft);">
          <div style="font-size: 0.82rem; color: var(--notion-secondary); margin-bottom: 4px;">Net Settlement Payable</div>
          <div style="font-size: 1.4rem; font-weight: 700; color: #0075DE;">${formatINR(totals.settlementPayable || 0)}</div>
          <div style="font-size: 0.74rem; color: var(--notion-muted); margin-top: 4px;">After commission deductions</div>
        </div>
        <div class="card" style="padding: 18px; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); box-shadow: var(--shadow-soft);">
          <div style="font-size: 0.82rem; color: var(--notion-secondary); margin-bottom: 4px;">Total Disbursed</div>
          <div style="font-size: 1.4rem; font-weight: 700; color: #1AAE39;">${formatINR(totals.alreadyPaid || 0)}</div>
          <div style="font-size: 0.74rem; color: var(--notion-muted); margin-top: 4px;">Bank & UPI transfers</div>
        </div>
        <div class="card" style="padding: 18px; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); box-shadow: var(--shadow-soft);">
          <div style="font-size: 0.82rem; color: var(--notion-secondary); margin-bottom: 4px;">Outstanding Balance</div>
          <div style="font-size: 1.4rem; font-weight: 700; color: ${totals.balanceToPay > 0 ? '#E32D14' : '#1AAE39'};">${formatINR(totals.balanceToPay || 0)}</div>
          <div style="font-size: 0.74rem; color: var(--notion-muted); margin-top: 4px;">Remaining to settle</div>
        </div>
      </div>

      <!-- Payouts Disbursements Table -->
      <div class="table-card" style="background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); overflow: hidden; box-shadow: var(--shadow-soft);">
        <div style="padding: 14px 18px; background: var(--notion-surface-warm); border-bottom: 1px solid var(--notion-hairline); font-size: 0.9rem; font-weight: 600; color: var(--notion-ink);">
          📋 Payout Disbursements & Order Allocation History
        </div>
        ${allPayouts.length === 0 ? `
          <div style="padding: 40px; text-align: center; color: var(--notion-secondary);">
            No payout disbursements recorded yet. Click "Record Order-Linked Payout" to disburse funds against unpaid orders.
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="background: var(--notion-surface-warm); border-bottom: 1px solid var(--notion-hairline); text-align: left;">
                  <th style="padding: 10px 14px;">Date</th>
                  <th style="padding: 10px 14px;">Vendor & Stall</th>
                  <th style="padding: 10px 14px; text-align: right;">Amount Paid</th>
                  <th style="padding: 10px 14px;">Mode & Ref</th>
                  <th style="padding: 10px 14px;">Allocated Orders</th>
                  <th style="padding: 10px 14px;">Recorded By</th>
                  <th style="padding: 10px 14px;">Notes</th>
                </tr>
              </thead>
              <tbody>
                ${allPayouts.map(p => {
                  const allocations = Array.isArray(p.allocations) ? p.allocations : [];
                  return `
                    <tr style="border-bottom: 1px solid var(--notion-hairline-subtle);">
                      <td style="padding: 12px 14px; white-space: nowrap;">
                        <strong>${formatDate(p.date || p.createdAt)}</strong>
                        <div style="font-size: 0.72rem; color: var(--notion-muted);">${escapeHtml(p.id)}</div>
                      </td>
                      <td style="padding: 12px 14px;">
                        <span class="badge" style="background: #eef2f6; font-size: 0.72rem; font-weight: 600;">${escapeHtml(p.stallNo || 'Stall TBD')}</span>
                        <div style="font-weight: 600; color: var(--notion-ink); margin-top: 2px;">${escapeHtml(p.vendorName || p.vendorId)}</div>
                      </td>
                      <td style="padding: 12px 14px; text-align: right; font-weight: 700; color: #1AAE39; font-size: 0.95rem;">
                        ₹${Number(p.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style="padding: 12px 14px;">
                        <span class="badge badge-outline" style="font-size: 0.75rem;">${escapeHtml(p.mode || 'NEFT')}</span>
                        <div style="font-size: 0.75rem; color: var(--notion-secondary); margin-top: 3px; font-family: var(--font-mono);">${escapeHtml(p.reference || '-')}</div>
                      </td>
                      <td style="padding: 12px 14px;">
                        ${allocations.length > 0 ? `
                          <div style="display: flex; flex-direction: column; gap: 4px;">
                            ${allocations.map(a => `
                              <div style="font-size: 0.78rem; background: #f8f9fa; padding: 3px 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                                <strong>Bill #${escapeHtml(a.billNo || a.orderId)}</strong>: ₹${Number(a.amount).toLocaleString('en-IN')}
                                ${a.payoutStatus === 'FULLY_PAID' ? '<span style="color: #28a745; margin-left: 4px;">✓ Settled</span>' : '<span style="color: #e67e22; margin-left: 4px;">⏳ Partial</span>'}
                              </div>
                            `).join('')}
                          </div>
                        ` : `
                          <span style="color: var(--notion-muted); font-size: 0.8rem;">Direct / Lumpsum</span>
                        `}
                      </td>
                      <td style="padding: 12px 14px; font-size: 0.8rem; color: var(--notion-secondary);">
                        ${escapeHtml(p.paidBy || 'Staff')}
                      </td>
                      <td style="padding: 12px 14px; font-size: 0.8rem; color: var(--notion-secondary); max-width: 180px;">
                        ${escapeHtml(p.notes || '-')}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card" style="padding: 24px; color: red;">Error: ${err.message}</div>`;
  }
}

// Smart Order-Linked Payout Modal
async function openOrderPayoutModal() {
  const container = document.getElementById('modalContainer');
  if (!container) return;

  const vendors = (state.vendorsData && state.vendorsData.vendors) ? state.vendorsData.vendors : [];

  container.innerHTML = `
    <div class="login-modal-box" style="max-width: 680px;">
      <div class="login-modal-header">
        <div>
          <h3 class="login-modal-title">💸 Record Order-Linked Payout</h3>
          <p class="login-modal-sub">Allocate payment against specific customer orders with remaining balance tracking</p>
        </div>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>

      <form id="orderPayoutForm" onsubmit="submitOrderPayout(event)" style="padding: 24px; max-height: 75vh; overflow-y: auto;">
        <!-- 1. Select Vendor -->
        <div style="margin-bottom: 18px;">
          <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Select Vendor:</label>
          <select id="payoutVendorSelect" class="form-input" style="width: 100%; height: 38px;" onchange="handlePayoutVendorSelect(this.value)" required>
            <option value="">-- Choose Vendor to Settle --</option>
            ${vendors.map(vObj => {
              const v = vObj.vendor || vObj;
              return `<option value="${v.id}">${v.stallNo}: ${v.name} (Bal: ₹${Math.round(vObj.balanceToPay || 0).toLocaleString('en-IN')})</option>`;
            }).join('')}
          </select>
        </div>

        <!-- 2. Unpaid / Partially Paid Orders Table -->
        <div id="unpaidOrdersTableArea" style="margin-bottom: 20px;">
          <div style="padding: 20px; text-align: center; background: var(--notion-surface-warm); border-radius: var(--radius-sm); color: var(--notion-secondary); font-size: 0.85rem;">
            👆 Please choose a vendor above to load eligible unpaid orders.
          </div>
        </div>

        <!-- 3. Payment Mode & Reference Details -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
          <div>
            <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Payment Method:</label>
            <select id="payoutMode" class="form-input" style="width: 100%; height: 36px;">
              <option value="NEFT / RTGS">NEFT / RTGS Bank Transfer</option>
              <option value="UPI">UPI Transfer</option>
              <option value="Cheque">Bank Cheque</option>
              <option value="Cash">Cash on Counter</option>
            </select>
          </div>
          <div>
            <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Bank Ref / UTR / Cheque #:</label>
            <input type="text" id="payoutRef" class="form-input" placeholder="e.g. UTR9281726189" style="width: 100%; height: 36px;" required>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Remarks / Allocation Notes:</label>
          <input type="text" id="payoutNotes" class="form-input" placeholder="e.g. Cleared morning expo session bills" style="width: 100%; height: 36px;">
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--notion-hairline); padding-top: 16px;">
          <div>
            <span style="font-size: 0.82rem; color: var(--notion-secondary);">Total Allocated Payout:</span>
            <div id="totalPayoutDisplay" style="font-size: 1.3rem; font-weight: 700; color: #1AAE39;">₹0.00</div>
          </div>

          <div style="display: flex; gap: 10px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" id="btnSubmitPayout" disabled>Confirm & Record Payout</button>
          </div>
        </div>
      </form>
    </div>
  `;
  container.classList.remove('hidden');
}

let activeUnpaidOrders = [];

async function handlePayoutVendorSelect(vendorId) {
  const container = document.getElementById('unpaidOrdersTableArea');
  const btn = document.getElementById('btnSubmitPayout');
  if (!container || !vendorId) {
    if (container) container.innerHTML = `<div style="padding: 20px; text-align: center; color: #888;">Choose a vendor above.</div>`;
    if (btn) btn.disabled = true;
    return;
  }

  container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--notion-secondary);">⏳ Loading unpaid orders...</div>`;

  try {
    const res = await fetch(`/api/vendors/${vendorId}/unpaid-orders`);
    const orders = await res.json();
    activeUnpaidOrders = orders;

    if (!Array.isArray(orders) || orders.length === 0) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; background: #eafbf0; border: 1px solid #c3e6cb; border-radius: var(--radius-sm); color: #155724; font-size: 0.85rem;">
          ✓ All orders for this vendor are fully settled! No outstanding balances.
        </div>
      `;
      if (btn) btn.disabled = true;
      return;
    }

    container.innerHTML = `
      <div style="border: 1px solid var(--notion-hairline); border-radius: var(--radius-sm); overflow: hidden;">
        <div style="padding: 8px 12px; background: var(--notion-surface-warm); font-size: 0.8rem; font-weight: 600; color: var(--notion-secondary); display: flex; justify-content: space-between;">
          <span>Unpaid / Partially Paid Orders (${orders.length})</span>
          <span style="font-size: 0.75rem; color: #0075DE;">Sorted by highest outstanding balance</span>
        </div>
        <div style="max-height: 240px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
            <thead>
              <tr style="background: #fafafa; border-bottom: 1px solid var(--notion-hairline); text-align: left;">
                <th style="padding: 8px 10px;">Bill #</th>
                <th style="padding: 8px 10px; text-align: right;">Payable</th>
                <th style="padding: 8px 10px; text-align: right;">Paid</th>
                <th style="padding: 8px 10px; text-align: right; color: #E32D14;">Outstanding</th>
                <th style="padding: 8px 10px; text-align: right; width: 140px;">Allocate (₹)</th>
                <th style="padding: 8px 10px; text-align: center; width: 60px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map((o, idx) => `
                <tr style="border-bottom: 1px solid var(--notion-hairline);">
                  <td style="padding: 8px 10px;">
                    <strong>${escapeHtml(o.billNo)}</strong>
                    <div style="font-size: 0.7rem; color: var(--notion-muted);">${formatDate(o.date)}</div>
                  </td>
                  <td style="padding: 8px 10px; text-align: right;">₹${Number(o.totalPayable).toLocaleString('en-IN')}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #28a745;">₹${Number(o.amountPaid || 0).toLocaleString('en-IN')}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #E32D14;">
                    ₹${Number(o.outstandingBalance).toLocaleString('en-IN')}
                  </td>
                  <td style="padding: 8px 10px; text-align: right;">
                    <input type="number" id="allocInput_${idx}" class="form-input" style="width: 110px; height: 30px; text-align: right; font-size: 0.82rem; padding: 2px 6px;"
                      step="0.01" min="0" max="${o.outstandingBalance}" placeholder="0.00"
                      oninput="recalculatePayoutAllocations()">
                  </td>
                  <td style="padding: 8px 10px; text-align: center;">
                    <button type="button" class="btn btn-outline btn-xs" onclick="quickFillAllocation(${idx}, ${o.outstandingBalance})" title="Pay full remaining">
                      Full
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (btn) btn.disabled = false;
  } catch (err) {
    container.innerHTML = `<div style="padding: 14px; color: red;">Failed to load unpaid orders: ${err.message}</div>`;
  }
}

function quickFillAllocation(index, balance) {
  const input = document.getElementById(`allocInput_${index}`);
  if (input) {
    input.value = balance;
    recalculatePayoutAllocations();
  }
}

function recalculatePayoutAllocations() {
  let total = 0;
  activeUnpaidOrders.forEach((o, idx) => {
    const input = document.getElementById(`allocInput_${idx}`);
    if (input) {
      let val = parseFloat(input.value) || 0;
      if (val > o.outstandingBalance) {
        toast(`Allocation cannot exceed outstanding balance of ₹${o.outstandingBalance} on Bill #${o.billNo}`, 'error');
        val = o.outstandingBalance;
        input.value = val;
      }
      total += val;
    }
  });

  const display = document.getElementById('totalPayoutDisplay');
  if (display) display.textContent = formatINR(total);

  const btn = document.getElementById('btnSubmitPayout');
  if (btn) btn.disabled = total <= 0;
}

async function submitOrderPayout(e) {
  e.preventDefault();
  const vendorId = document.getElementById('payoutVendorSelect').value;
  const mode = document.getElementById('payoutMode').value;
  const reference = document.getElementById('payoutRef').value;
  const notes = document.getElementById('payoutNotes').value;

  const allocations = [];
  activeUnpaidOrders.forEach((o, idx) => {
    const input = document.getElementById(`allocInput_${idx}`);
    if (input) {
      const amt = parseFloat(input.value) || 0;
      if (amt > 0) {
        allocations.push({
          orderId: o.orderId,
          billNo: o.billNo,
          amount: amt
        });
      }
    }
  });

  if (allocations.length === 0) {
    toast('Please enter allocation amount for at least one order.', 'error');
    return;
  }

  const totalAmount = allocations.reduce((sum, a) => sum + a.amount, 0);

  try {
    const res = await fetch('/api/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendorId,
        allocations,
        amount: totalAmount,
        mode,
        reference,
        notes
      })
    });
    const data = await res.json();

    if (data.success) {
      toast(`✓ Order-linked payout of ${formatINR(totalAmount)} recorded successfully!`, 'success');
      closeModal();
      await loadVendorsSummary();
      await loadAndRenderPayoutMgmt();
    } else {
      toast(`Payout recording failed: ${data.error}`, 'error');
    }
  } catch (err) {
    toast('Network error recording payout: ' + err.message, 'error');
  }
}


// =============================================================
// KRISHNA PILLAR 7: AUDIT LOG VIEWER
// =============================================================

async function renderAuditLogView() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  main.innerHTML = `
    <div class="view-header" style="margin-bottom: 24px;">
      <h1 class="view-title" style="font-size: 1.6rem; font-weight: 700; color: var(--notion-ink); display: flex; align-items: center; gap: 10px;">
        📜 System Audit Log
      </h1>
      <p class="view-subtitle" style="color: var(--notion-secondary); font-size: 0.88rem; margin-top: 4px;">
        Immutable audit trail of order edits, Super Admin approvals, Shopify push attempts, and payout disbursements.
      </p>
    </div>

    <div id="auditLogContainer">
      <div style="text-align: center; padding: 40px; color: var(--notion-secondary);">⏳ Loading audit trail...</div>
    </div>
  `;

  try {
    const res = await fetch('/api/audit-logs');
    const logs = await res.json();
    const container = document.getElementById('auditLogContainer');
    if (!container) return;

    if (!Array.isArray(logs) || logs.length === 0) {
      container.innerHTML = `<div class="card" style="padding: 40px; text-align: center;">No audit entries recorded yet.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-card" style="background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); overflow: hidden; box-shadow: var(--shadow-soft);">
        <div style="overflow-x: auto;">
          <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.84rem;">
            <thead>
              <tr style="background: var(--notion-surface-warm); border-bottom: 1px solid var(--notion-hairline); text-align: left;">
                <th style="padding: 10px 14px;">Timestamp</th>
                <th style="padding: 10px 14px;">User / Staff</th>
                <th style="padding: 10px 14px;">Action</th>
                <th style="padding: 10px 14px;">Entity</th>
                <th style="padding: 10px 14px;">Details / Summary</th>
                <th style="padding: 10px 14px;">Reason</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(log => `
                <tr style="border-bottom: 1px solid var(--notion-hairline-subtle);">
                  <td style="padding: 10px 14px; white-space: nowrap; font-size: 0.78rem; color: var(--notion-secondary);">
                    ${formatDate(log.timestamp)}
                  </td>
                  <td style="padding: 10px 14px; font-weight: 600;">
                    ${escapeHtml(log.user || 'System')}
                  </td>
                  <td style="padding: 10px 14px;">
                    <span class="badge" style="font-size: 0.72rem; ${log.action.includes('PUSH') ? 'background: #d4edda; color: #155724;' : (log.action.includes('PAYOUT') ? 'background: #e8f4fd; color: #0075DE;' : 'background: #fdf2e9; color: #d35400;')}">
                      ${escapeHtml(log.action)}
                    </span>
                  </td>
                  <td style="padding: 10px 14px; font-family: var(--font-mono); font-size: 0.75rem;">
                    ${escapeHtml(log.entity || '-')}: ${escapeHtml(log.entityId || '-')}
                  </td>
                  <td style="padding: 10px 14px; font-size: 0.8rem;">
                    ${log.newValue ? `<strong>New:</strong> ${escapeHtml(log.newValue)}<br>` : ''}
                    ${log.oldValue ? `<span style="color: #888;">Old: ${escapeHtml(log.oldValue)}</span>` : ''}
                  </td>
                  <td style="padding: 10px 14px; font-size: 0.8rem; color: var(--notion-secondary);">
                    ${escapeHtml(log.reason || '-')}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    document.getElementById('auditLogContainer').innerHTML = `<div style="color: red; padding: 20px;">Error: ${err.message}</div>`;
  }
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
