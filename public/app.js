function formatBillCopy(raw) {
  if (!raw) return '-';
  if (Array.isArray(raw)) return raw.map(formatBillCopy).filter(Boolean).join(', ');
  const str = String(raw).trim();
  const digits = str.replace(/^[^0-9]+/, '');
  return digits || str;
}
window.formatBillCopy = formatBillCopy;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

// Global fetch wrapper: always attach authenticated user identity to headers
const _nativeFetch = window.fetch;
window.fetch = function(url, options) {
  options = options || {};
  options.headers = options.headers || {};
  
  let activeUser = (typeof state !== 'undefined' && state.currentUser) ? state.currentUser : null;
  if (!activeUser) {
    try {
      const saved = localStorage.getItem('hp_session_user');
      if (saved) activeUser = JSON.parse(saved);
    } catch (e) {}
  }
  if (!activeUser) {
    activeUser = { id: 'usr_1', email: 'admin@halfpe.com', role: 'super_admin' };
  }

  const activeCityId = (typeof state !== 'undefined' && state.currentCityId) ? state.currentCityId : 'VIJ';
  if (options.headers instanceof Headers) {
    if (!options.headers.has('x-city-id')) options.headers.set('x-city-id', activeCityId);
    if (!options.headers.has('x-user-id')) options.headers.set('x-user-id', activeUser.id);
    if (!options.headers.has('x-user-email')) options.headers.set('x-user-email', activeUser.email || '');
    if (!options.headers.has('x-user-role')) options.headers.set('x-user-role', activeUser.role || '');
  } else {
    if (!options.headers['x-city-id']) options.headers['x-city-id'] = activeCityId;
    if (!options.headers['x-user-id']) options.headers['x-user-id'] = activeUser.id;
    if (!options.headers['x-user-email']) options.headers['x-user-email'] = activeUser.email || '';
    if (!options.headers['x-user-role']) options.headers['x-user-role'] = activeUser.role || '';
  }
  return _nativeFetch.call(this, url, options);
};

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
  isShopifySyncing: false,
  // Multi-City Architecture (A2)
  cities: [
    { id: 'vijayawada', name: 'Vijayawada Expo', venue: 'SVN Conventions, Poranki', dates: '8–11 Oct 2026', commissionPct: 15 },
    { id: 'hyderabad', name: 'Hyderabad Expo', venue: 'Hitex Exhibition Centre', dates: '15–18 Oct 2026', commissionPct: 15 },
    { id: 'visakhapatnam', name: 'Visakhapatnam Expo', venue: 'AU Convention Center', dates: '22–25 Oct 2026', commissionPct: 15 },
    { id: 'bengaluru', name: 'Bengaluru Expo', venue: 'Tripuravasini Palace Grounds', dates: '29 Oct–1 Nov 2026', commissionPct: 15 }
  ],
  currentCityId: 'vijayawada'
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
// Multi-City Controller & Dynamic City Switcher (A2)
// -------------------------------------------------------------
function initCitySelector() {
  try {
    const savedCities = localStorage.getItem('hp_saved_cities');
    if (savedCities) {
      const parsed = JSON.parse(savedCities);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.cities = parsed;
      }
    }
    const savedActive = localStorage.getItem('hp_active_city_id');
    if (savedActive && state.cities.some(c => c.id === savedActive)) {
      state.currentCityId = savedActive;
    }
  } catch (e) {}

  updateCityHeaderDisplay();
  renderCityDropdown();
}

function updateCityHeaderDisplay() {
  const current = state.cities.find(c => c.id === state.currentCityId) || state.cities[0];
  const nameEl = document.getElementById('currentEventCityName');
  const venueEl = document.getElementById('currentEventCityVenue');
  if (nameEl) nameEl.textContent = `Half Price Days — ${current.name}`;
  if (venueEl) venueEl.textContent = `${current.venue} (${current.dates})`;
}

function toggleCityDropdown(eOrForce) {
  if (eOrForce && eOrForce.stopPropagation) eOrForce.stopPropagation();
  const wrap = document.getElementById('eventCityDropdownWrap');
  const menu = document.getElementById('cityDropdownMenu');
  const btn = document.getElementById('btnEventCityDropdown');
  if (!menu || !wrap) return;

  const isOpen = (typeof eOrForce === 'boolean') ? !eOrForce : (menu.style.display !== 'none');
  if (isOpen) {
    menu.style.display = 'none';
    wrap.classList.remove('is-open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  } else {
    renderCityDropdown();
    menu.style.display = 'block';
    wrap.classList.add('is-open');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }
}

function renderCityDropdown() {
  const list = document.getElementById('cityDropdownList');
  if (!list) return;

  list.innerHTML = state.cities.map(c => `
    <div class="city-item ${c.id === state.currentCityId ? 'active' : ''}" onclick="switchCity('${c.id}')">
      <div>
        <div class="city-item-title">${escapeHtml(c.name)}</div>
        <div class="city-item-sub">${escapeHtml(c.venue)} · ${escapeHtml(c.dates)}</div>
      </div>
      ${c.id === state.currentCityId ? '<span class="city-item-check">✓ Active</span>' : ''}
    </div>
  `).join('');
}

function switchCity(cityId) {
  const target = state.cities.find(c => c.id === cityId);
  if (!target) return;

  state.currentCityId = cityId;
  try { localStorage.setItem('hp_active_city_id', cityId); } catch (e) {}

  updateCityHeaderDisplay();
  toggleCityDropdown(false);
  toast(`✓ Switched dashboard to ${target.name} (${target.venue})`, 'info');

  // Re-render active view for newly selected city context
  if (state.activeTab === 'overall') {
    renderOverallSettlementView();
  } else if (state.activeTab === 'vendors') {
    renderVendorsListView();
  } else if (state.activeTab === 'orders') {
    renderOrdersManagementView();
  } else {
    renderMain();
  }
}

function openAddCityModal() {
  const container = document.getElementById('modalContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="modal-dialog" style="max-width: 480px;">
      <div class="modal-header">
        <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
          <span>📍</span> <span>Add New Event City</span>
        </h3>
        <button type="button" class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <form onsubmit="submitAddCity(event)" style="padding: 20px;">
        <p style="font-size: 0.85rem; color: var(--notion-secondary); margin-top: 0; margin-bottom: 16px;">
          Create a new event city and venue for Half Price Days. The entire dashboard will immediately adapt to this new city's live data.
        </p>

        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 0.82rem; font-weight: 600; margin-bottom: 6px;">
            City / Event Title *
          </label>
          <input type="text" id="newCityName" class="form-input" placeholder="e.g. Chennai Expo or Pune Retail Expo" required style="width: 100%; height: 36px;">
        </div>

        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 0.82rem; font-weight: 600; margin-bottom: 6px;">
            Venue Address *
          </label>
          <input type="text" id="newCityVenue" class="form-input" placeholder="e.g. Chennai Trade Centre, Nandambakkam" required style="width: 100%; height: 36px;">
        </div>

        <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 12px; margin-bottom: 18px;">
          <div>
            <label style="display: block; font-size: 0.82rem; font-weight: 600; margin-bottom: 6px;">
              Event Dates *
            </label>
            <input type="text" id="newCityDates" class="form-input" placeholder="e.g. 5–8 Nov 2026" required style="width: 100%; height: 36px;">
          </div>
          <div>
            <label style="display: block; font-size: 0.82rem; font-weight: 600; margin-bottom: 6px;">
              Commission %
            </label>
            <input type="number" id="newCityCommission" class="form-input" value="15" min="1" max="100" style="width: 100%; height: 36px;">
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" class="btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Create & Switch City</button>
        </div>
      </form>
    </div>
  `;
  container.classList.remove('hidden');
}

function submitAddCity(e) {
  e.preventDefault();
  const name = document.getElementById('newCityName').value.trim();
  const venue = document.getElementById('newCityVenue').value.trim();
  const dates = document.getElementById('newCityDates').value.trim();
  const comm = parseFloat(document.getElementById('newCityCommission').value) || 15;

  if (!name || !venue || !dates) {
    toast('Please fill in all required city fields', 'error');
    return;
  }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `city_${Date.now()}`;
  const newCity = { id, name, venue, dates, commissionPct: comm };

  state.cities.push(newCity);
  try { localStorage.setItem('hp_saved_cities', JSON.stringify(state.cities)); } catch (err) {}

  closeModal();
  switchCity(id);
  toast(`✓ Created and switched to ${name}!`, 'success');
}

// -------------------------------------------------------------
// Real-Time Live Sync (Phase 1 / E7 via SSE)
// -------------------------------------------------------------
let liveSyncSource = null;
let liveSyncDebounceTimer = null;

function setupLiveSync() {
  if (typeof EventSource === 'undefined') {
    console.warn('[Live Sync] EventSource not supported by browser.');
    return;
  }
  if (liveSyncSource) {
    try { liveSyncSource.close(); } catch (e) {}
  }

  try {
    liveSyncSource = new EventSource('/api/events/stream');

    const updatePill = (connected) => {
      const dot = document.getElementById('liveSyncDot');
      const text = document.getElementById('liveSyncText');
      if (dot) {
        if (connected) {
          dot.classList.remove('disconnected');
        } else {
          dot.classList.add('disconnected');
        }
      }
      if (text) {
        text.textContent = connected ? 'Live Sync' : 'Reconnecting...';
      }
    };

    liveSyncSource.onopen = () => {
      console.log('[Live Sync] SSE connection established.');
      updatePill(true);
    };

    liveSyncSource.onerror = (err) => {
      console.warn('[Live Sync] SSE connection interrupted, browser will auto-reconnect...', err);
      updatePill(false);
    };

    liveSyncSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'CONNECTED' || data.type === 'HEARTBEAT') return;

        console.log('[Live Sync] Received real-time update:', data.type, data.payload);

        if (data.type === 'VENDOR_ADDED' && state.activeTab === 'vendors') {
          toast(`⚡ New vendor added: ${data.payload?.vendor?.name || 'Partner'}. Live synced!`, 'info');
        }

        // Smart Debounced Refresh based on active screen
        clearTimeout(liveSyncDebounceTimer);
        liveSyncDebounceTimer = setTimeout(async () => {
          if (!state.currentUser) return;

          // Always refresh vendors summary so totals & counts stay real-time
          if (data.type && data.type.startsWith('VENDOR')) {
            await loadVendorsSummary();
          }

          if (state.selectedVendorId) {
            await loadVendorDetail(state.selectedVendorId);
          } else if (state.activeTab === 'overall' || state.activeTab === 'vendors') {
            await loadVendorsSummary();
          } else if (state.activeTab === 'orders') {
            if (typeof renderOrdersManagementView === 'function') {
              renderOrdersManagementView();
            }
          } else if (state.activeTab === 'vendor_mgmt') {
            if (typeof renderVendorManagementView === 'function') {
              renderVendorManagementView();
            }
          } else if (state.activeTab === 'payout_mgmt') {
            if (typeof renderPayoutManagementView === 'function') {
              renderPayoutManagementView();
            }
          }
        }, 350);
      } catch (parseErr) {
        console.error('[Live Sync] Error parsing SSE payload:', parseErr);
      }
    };
  } catch (err) {
    console.warn('[Live Sync] Setup failed:', err);
  }
}

// -------------------------------------------------------------
// URL Hash Routing & Persistence (Enhancement 1)
// -------------------------------------------------------------
function syncRouteFromHash() {
  const hash = (window.location.hash || '').slice(1);
  if (!hash) return false;

  const [tabPart, queryPart] = hash.split('?');
  const tab = tabPart ? tabPart.trim() : '';
  const validTabs = ['overall', 'vendors', 'orders', 'vendor_mgmt', 'payout_mgmt', 'audit', 'team'];

  if (!validTabs.includes(tab)) return false;

  state.activeTab = tab;

  if (tab === 'vendors' && queryPart) {
    const params = new URLSearchParams(queryPart);
    const vId = params.get('vendorId');
    if (vId) {
      state.selectedVendorId = vId;
    } else {
      state.selectedVendorId = null;
    }
  } else {
    state.selectedVendorId = null;
  }

  // Sync nav tab active classes
  const tabIdMap = {
    overall: 'tabOverall',
    vendors: 'tabVendors',
    orders: 'tabOrders',
    vendor_mgmt: 'tabVendorMgmt',
    payout_mgmt: 'tabPayouts',
    audit: 'tabAudit',
    team: 'tabTeam'
  };
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const activeBtn = document.getElementById(tabIdMap[tab]);
  if (activeBtn) activeBtn.classList.add('active');

  return true;
}

window.addEventListener('hashchange', () => {
  if (!state.currentUser) return;
  if (syncRouteFromHash()) {
    if (state.selectedVendorId) {
      loadVendorDetail(state.selectedVendorId);
    } else {
      renderMain();
    }
  }
});

// -------------------------------------------------------------
// Universal CSV / Excel Export Engine (Enhancement 3 & 4)
// -------------------------------------------------------------
function downloadDataAsCSV(filename, headers, rows) {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map(r => r.map(escapeCell).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : (filename + '.csv'));
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function handleVendorLinkClick(event, vendorId) {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) {
    return; // Allow native browser behavior (open in new tab / window)
  }
  event.preventDefault();
  selectVendor(vendorId);
}

// 1. Overall Settlement CSV Export
async function exportOverallSettlementCSV() {
  try {
    toast('Preparing Overall Settlement CSV export...', 'info');
    let data = state.vendorsData;
    if (!data || !data.vendors) {
      const res = await fetch('/api/vendors');
      data = await res.json();
    }
    const vendors = (data && data.vendors) ? data.vendors : [];
    const eventTotals = (data && data.eventTotals) ? data.eventTotals : {};

    const headers = [
      'Stall No', 'Vendor Name', 'Seller ID / Code', 'Total Orders', 
      'Gross Sales (₹)', 'Total Returns (₹)', 'Net Sales (₹)', 
      'Commission %', 'Commission Amount (₹)', 'Settlement Payable (₹)', 
      'Already Paid (₹)', 'Balance to Pay (₹)', 'Status'
    ];

    const rows = vendors.map(vObj => {
      const v = (vObj && vObj.vendor) ? vObj.vendor : (vObj || {});
      return [
        v.stallNo || '-',
        v.name || '-',
        v.webkulSellerId || v.code || '-',
        vObj.ordersCount || 0,
        vObj.grossSales || 0,
        vObj.returnsAmount || 0,
        vObj.netSales || 0,
        (vObj.commissionPct || v.commissionPct || 15) + '%',
        vObj.commissionAmount || 0,
        vObj.settlementPayable || 0,
        vObj.alreadyPaid || 0,
        vObj.balanceToPay || 0,
        vObj.status || 'Open'
      ];
    });

    rows.push([
      'TOTALS', 'ALL VENDORS', '-', eventTotals.totalOrders || 0,
      eventTotals.grossSales || 0, eventTotals.totalReturns || 0, eventTotals.netSales || 0,
      '-', eventTotals.totalCommission || 0, eventTotals.settlementPayable || 0,
      eventTotals.alreadyPaid || 0, eventTotals.balanceToPay || 0, '-'
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    downloadDataAsCSV(`HalfPe_Overall_Settlement_Summary_${dateStr}`, headers, rows);
    toast('✓ Overall Settlement CSV exported successfully!', 'success');
  } catch (err) {
    toast('Export failed: ' + err.message, 'error');
  }
}

function exportVendorsCSV() {
  return exportOverallSettlementCSV();
}

// 2. Vendors Breakdown CSV Export (Filtered / Sorted)
function exportVendorsBreakdownCSV() {
  try {
    const filtered = getFilteredAndSortedVendors();
    if (filtered.length === 0) {
      toast('No vendors matching current filter to export.', 'error');
      return;
    }

    const headers = [
      'Stall No', 'Vendor Name', 'Seller ID / Code', 'Orders Count', 
      'Gross Sales (₹)', 'Returns (₹)', 'Net Sales (₹)', 
      'Commission %', 'Commission (₹)', 'Settlement Payable (₹)', 
      'Already Paid (₹)', 'Balance to Pay (₹)', 'Status'
    ];

    const rows = filtered.map(item => [
      item.vendor.stallNo || '-',
      item.vendor.name || '-',
      item.vendor.webkulSellerId || item.vendor.code || '-',
      item.ordersCount || 0,
      item.grossSales || 0,
      item.returnsAmount || 0,
      item.netSales || 0,
      (item.commissionPct || 15) + '%',
      item.commissionAmount || 0,
      item.settlementPayable || 0,
      item.alreadyPaid || 0,
      item.balanceToPay || 0,
      item.status || 'Open'
    ]);

    const totOrders = filtered.reduce((s, it) => s + (it.ordersCount || 0), 0);
    const totGross = filtered.reduce((s, it) => s + (it.grossSales || 0), 0);
    const totReturns = filtered.reduce((s, it) => s + (it.returnsAmount || 0), 0);
    const totNet = filtered.reduce((s, it) => s + (it.netSales || 0), 0);
    const totComm = filtered.reduce((s, it) => s + (it.commissionAmount || 0), 0);
    const totPayable = filtered.reduce((s, it) => s + (it.settlementPayable || 0), 0);
    const totPaid = filtered.reduce((s, it) => s + (it.alreadyPaid || 0), 0);
    const totBal = filtered.reduce((s, it) => s + (it.balanceToPay || 0), 0);

    rows.push([
      `TOTALS (${filtered.length} Vendors)`, 'FILTERED TOTALS', '-', totOrders,
      totGross, totReturns, totNet, '-', totComm, totPayable, totPaid, totBal, '-'
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    downloadDataAsCSV(`HalfPe_Vendors_Breakdown_${dateStr}`, headers, rows);
    toast(`✓ Exported ${filtered.length} vendors breakdown to CSV!`, 'success');
  } catch (err) {
    toast('Export failed: ' + err.message, 'error');
  }
}

// 3. Vendor Bills CSV Export (Single Vendor Drilldown)
async function exportVendorBillsCSV(vendorId) {
  try {
    const targetVendorId = vendorId || state.selectedVendorId;
    if (!targetVendorId) {
      toast('No vendor selected for bills export.', 'error');
      return;
    }

    toast('Preparing vendor bills export...', 'info');
    let vendorData = state.selectedVendorData;
    if (!vendorData || vendorData.vendor.id !== targetVendorId) {
      const res = await fetch(`/api/vendors/${encodeURIComponent(targetVendorId)}`);
      vendorData = await res.json();
    }

    const v = vendorData.vendor || {};
    const bills = vendorData.bills || vendorData.billRows || [];
    const commPct = v.commissionPct || 15;

    const headers = [
      'HalfPe Bill Copy No', 'Gross Amount (₹)', 'Commission %', 'Commission (₹)', 
      'Net Settlement (₹)', 'Payment Mode / Ref', 'Shopify Order Ref', 
      'Status', 'Customer Name', 'Customer Phone', 'Date (IST)', 'Stall No', 'Vendor Name'
    ];

    const rows = bills.map(b => {
      const amt = Number(b.billAmount || b.amount || 0);
      const commAmt = Math.round(amt * (commPct / 100) * 100) / 100;
      const settAmt = Math.round((amt - commAmt) * 100) / 100;
      return [
        b.billCopyNo || b.billNo || '-',
        amt,
        commPct + '%',
        commAmt,
        settAmt,
        (b.paymentMode || 'Cash') + (b.paymentOrderRef ? ` (${b.paymentOrderRef})` : ''),
        b.shopifyOrderId ? `#${b.shopifyOrderId}` : 'Pending',
        b.isVoid ? 'Voided' : (b.status || 'Active'),
        b.customerName || '-',
        b.customerPhone || '-',
        formatDate(b.createdAt || b.date),
        v.stallNo || '-',
        v.name || '-'
      ];
    });

    const cleanStall = (v.stallNo || 'Vendor').replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadDataAsCSV(`HalfPe_Bills_${cleanStall}_${dateStr}`, headers, rows);
    toast(`✓ Exported ${bills.length} bills for ${v.name}!`, 'success');
  } catch (err) {
    toast('Bills export failed: ' + err.message, 'error');
  }
}

// 4. Orders Management CSV Export
async function exportOrdersManagementCSV() {
  try {
    toast('Preparing Orders CSV export...', 'info');
    let orders = ordersManagementState.ordersList;
    if (!orders || orders.length === 0) {
      const res = await fetch('/api/orders');
      orders = await res.json();
    }

    const headers = [
      'Bill No', 'Date (IST)', 'Customer Name', 'Customer Phone', 'Stall No(s)', 
      'Vendor(s)', 'Gross Amount (₹)', 'Payable Amount (₹)', 'Payment Method', 
      'Payment ID / Ref', 'Internal Status', 'Shopify Order #', 'Shopify Sync Status'
    ];

    const rows = (orders || []).map(o => {
      let stalls = o.stallNo || '';
      let vendors = o.vendorName || '';
      if (Array.isArray(o.vendorAllocations) && o.vendorAllocations.length > 0) {
        stalls = o.vendorAllocations.map(a => a.stallNo).filter(Boolean).join('; ');
        vendors = o.vendorAllocations.map(a => a.vendorName).filter(Boolean).join('; ');
      }

      return [
        o.billNo || o.id,
        formatDate(o.createdAt),
        o.customer?.name || 'Walk-in',
        o.customer?.phone || '-',
        stalls || 'Stall TBD',
        vendors || 'Unassigned',
        o.totals?.grossAmount || 0,
        o.totals?.payable || o.totalPayable || 0,
        o.payment?.method || 'Prepaid',
        o.payment?.paymentId || '-',
        o.status || 'PENDING_APPROVAL',
        o.shopifyOrderNumber ? `#${o.shopifyOrderNumber}` : (o.shopifyOrderId ? `#${o.shopifyOrderId}` : 'Not Pushed'),
        o.shopifySyncStatus || 'PENDING'
      ];
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    downloadDataAsCSV(`HalfPe_Orders_Management_${dateStr}`, headers, rows);
    toast(`✓ Exported ${rows.length} internal orders to CSV!`, 'success');
  } catch (err) {
    toast('Orders export failed: ' + err.message, 'error');
  }
}

// 5. Payouts Management CSV Export
async function exportPayoutsManagementCSV() {
  try {
    toast('Preparing Payouts CSV export...', 'info');
    const res = await fetch('/api/payouts');
    const payouts = await res.json();

    const headers = [
      'Payout ID', 'Date (IST)', 'Stall No', 'Vendor Name', 'Amount (₹)', 
      'Payment Mode', 'Reference / UTR', 'Orders Count', 'Allocated Orders List', 
      'Notes', 'Disbursed By'
    ];

    const rows = (payouts || []).map(p => [
      p.id,
      formatDate(p.createdAt || p.date),
      p.vendorStall || p.stallNo || '-',
      p.vendorName || '-',
      p.amount || 0,
      p.mode || p.paymentMode || '-',
      p.reference || p.referenceNo || p.utr || '-',
      (p.allocations || p.allocatedOrderIds || []).length,
      (p.allocations || p.allocatedOrderIds || []).map(a => a.billNo || a.orderId || a).join('; '),
      p.notes || '',
      p.createdByName || p.createdBy || 'Finance'
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    downloadDataAsCSV(`HalfPe_Payouts_History_${dateStr}`, headers, rows);
    toast(`✓ Exported ${rows.length} payouts to CSV!`, 'success');
  } catch (err) {
    toast('Payouts export failed: ' + err.message, 'error');
  }
}

// 6. Vendor Directory CSV Export
async function exportVendorDirectoryCSV() {
  try {
    toast('Preparing Vendor Directory CSV export...', 'info');
    const res = await fetch('/api/vendors?includeInactive=true');
    const data = await res.json();
    const vendors = (data && data.vendors) ? data.vendors : [];

    const headers = [
      'Stall No', 'Vendor Name', 'Vendor Code / ID', 'Category', 'Commission %', 
      'Phone / UPI', 'Status', 'Total Orders', 'Gross Sales (₹)', 'Balance to Pay (₹)'
    ];

    const rows = vendors.map(vObj => {
      const v = vObj.vendor || vObj;
      const isActive = v.active !== false;
      return [
        v.stallNo || 'Stall TBD',
        v.name || '-',
        v.id || v.code || '-',
        v.category || 'Retail',
        (v.commissionPct || 15) + '%',
        v.phone || v.upiId || '-',
        isActive ? 'Active' : 'Deactivated',
        vObj.ordersCount || 0,
        vObj.grossSales || 0,
        vObj.balanceToPay || 0
      ];
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    downloadDataAsCSV(`HalfPe_Vendor_Directory_${dateStr}`, headers, rows);
    toast(`✓ Exported ${rows.length} directory vendors to CSV!`, 'success');
  } catch (err) {
    toast('Vendor Directory export failed: ' + err.message, 'error');
  }
}

// 7. Audit Log CSV Export
async function exportAuditLogCSV() {
  try {
    toast('Preparing Audit Log CSV export...', 'info');
    const res = await fetch('/api/audit-logs');
    const logs = await res.json();

    const headers = [
      'Timestamp (IST)', 'User / Staff', 'Action', 'Entity Type', 
      'Entity ID', 'Field Changed', 'Old Value', 'New Value', 'Reason / Notes'
    ];

    const rows = (logs || []).map(l => [
      formatDate(l.timestamp),
      l.user || 'System',
      l.action || '-',
      l.entity || '-',
      l.entityId || '-',
      l.field || '-',
      l.oldValue || '-',
      l.newValue || '-',
      l.reason || '-'
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    downloadDataAsCSV(`HalfPe_System_Audit_Log_${dateStr}`, headers, rows);
    toast(`✓ Exported ${rows.length} audit entries to CSV!`, 'success');
  } catch (err) {
    toast('Audit log export failed: ' + err.message, 'error');
  }
}

// 8. Team & Access CSV Export
async function exportTeamAccessCSV() {
  try {
    toast('Preparing Team & Access CSV export...', 'info');
    const res = await fetch('/api/users');
    const users = await res.json();

    const headers = [
      'User ID', 'Full Name', 'Email Address', 'Designation', 'Assigned Role', 
      'Scopes Count', 'Active Scopes List', 'Status', 'Linked Vendor ID'
    ];

    const rows = (users || []).map(u => [
      u.id,
      u.name,
      u.email,
      u.designation || 'Staff',
      u.role || 'Admin',
      (u.scopes || []).length,
      (u.scopes || []).join('; '),
      u.active !== false ? 'Active' : 'Deactivated',
      u.vendorId || '-'
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    downloadDataAsCSV(`HalfPe_Team_Access_Directory_${dateStr}`, headers, rows);
    toast(`✓ Exported ${rows.length} team members to CSV!`, 'success');
  } catch (err) {
    toast('Team export failed: ' + err.message, 'error');
  }
}

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
async function init() {
  // 1. Restore persistent user session if available (Enable multiple sessions across tabs/browsers)
  try {
    const saved = localStorage.getItem('hp_session_user');
    if (saved) {
      state.currentUser = JSON.parse(saved);
    } else {
      // Default auto-login to Super Admin so any new tab or fresh window is seamlessly authenticated
      state.currentUser = DEFAULT_USER;
      try { localStorage.setItem('hp_session_user', JSON.stringify(DEFAULT_USER)); } catch (e) {}
    }
  } catch (e) {
    console.warn('Could not read saved session:', e);
    state.currentUser = DEFAULT_USER;
  }

  // 2. Setup real-time live sync
  setupLiveSync();

  // 3. Fetch system users & active role
  await fetchUsers();
  updateUserChipUI();

  // 4. Check Shopify connection status
  await checkShopifyStatus();

  // 5. Load initial data with URL hash route restoration
  // Requirement: "When page is refreshed it should stay in the consolidated page"
  if (state.currentUser) {
    await loadVendorsSummary();
    const restored = syncRouteFromHash();
    if (restored && state.selectedVendorId) {
      await loadVendorDetail(state.selectedVendorId);
    } else {
      // Default to Consolidated Overall Settlement page on fresh load or refresh
      if (!restored || window.location.hash === '' || window.location.hash === '#overall') {
        state.activeTab = 'overall';
        state.selectedVendorId = null;
      }
      renderMain();
    }
  } else {
    renderMain();
  }

  // 6. Setup modal click outside to dismiss
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

  // 9. Initialize City Selector & Header (A2)
  initCitySelector();

  // Close city dropdown on outside click
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('eventCityDropdownWrap');
    if (wrap && !wrap.contains(e.target)) {
      toggleCityDropdown(false);
    }
  });

  // 10. Global exports for onclick handlers
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
  window.setOrderStatusFilter = setOrderStatusFilter;
  window.setOrderShopifyFilter = setOrderShopifyFilter;
  window.toggleSelectOrder = toggleSelectOrder;
  window.toggleSelectAllOrders = toggleSelectAllOrders;
  window.pushSingleOrderToShopify = pushSingleOrderToShopify;
  window.rejectSingleOrder = rejectSingleOrder;
  window.simulatePosOrder = simulatePosOrder;
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
  window.showPayoutVendorSuggest = showPayoutVendorSuggest;
  window.filterPayoutVendorSuggest = filterPayoutVendorSuggest;
  window.selectPayoutVendor = selectPayoutVendor;
  window.clearSelectedPayoutVendor = clearSelectedPayoutVendor;
  window.handlePayoutVendorSelect = handlePayoutVendorSelect;
  window.toggleSelectAllPayoutOrders = toggleSelectAllPayoutOrders;
  window.handleOrderPayoutCheckChange = handleOrderPayoutCheckChange;
  window.handleAllocInputTyped = handleAllocInputTyped;
  window.quickFillAllocation = quickFillAllocation;
  window.recalculatePayoutAllocations = recalculatePayoutAllocations;
  window.submitOrderPayout = submitOrderPayout;
  window.renderAuditLogView = renderAuditLogView;
  window.renderTeamAccessView = renderTeamAccessView;
  window.handleTeamSearch = handleTeamSearch;
  window.setTeamRoleFilter = setTeamRoleFilter;
  window.openCreateUserModal = openCreateUserModal;
  window.submitCreateUser = submitCreateUser;
  window.openEditUserModal = openEditUserModal;
  window.submitEditUser = submitEditUser;
  window.openChangePasswordModal = openChangePasswordModal;
  window.submitChangePassword = submitChangePassword;
  window.toggleUserActiveStatus = toggleUserActiveStatus;
  window.handleRoleTemplateChange = handleRoleTemplateChange;
  window.toggleAllScopesCheckboxes = toggleAllScopesCheckboxes;
  window.copyTextToClipboard = copyTextToClipboard;
  window.downloadDataAsCSV = downloadDataAsCSV;
  window.handleVendorLinkClick = handleVendorLinkClick;
  window.exportOverallSettlementCSV = exportOverallSettlementCSV;
  window.exportVendorsCSV = exportVendorsCSV;
  window.exportVendorsBreakdownCSV = exportVendorsBreakdownCSV;
  window.exportVendorBillsCSV = exportVendorBillsCSV;
  window.exportOrdersManagementCSV = exportOrdersManagementCSV;
  window.exportPayoutsManagementCSV = exportPayoutsManagementCSV;
  window.exportVendorDirectoryCSV = exportVendorDirectoryCSV;
  window.exportAuditLogCSV = exportAuditLogCSV;
  window.exportTeamAccessCSV = exportTeamAccessCSV;
  window.toggleSelectVendorRow = toggleSelectVendorRow;
  window.toggleSelectAllVendors = toggleSelectAllVendors;
  window.clearVendorSelection = clearVendorSelection;
  window.executeBulkVendorAction = executeBulkVendorAction;
  window.openBulkImportVendorsModal = openBulkImportVendorsModal;
  window.handleVendorCsvFileUpload = handleVendorCsvFileUpload;
  window.downloadVendorImportTemplate = downloadVendorImportTemplate;
  window.submitBulkImportVendors = submitBulkImportVendors;
  window.toggleCityDropdown = toggleCityDropdown;
  window.switchCity = switchCity;
  window.openAddCityModal = openAddCityModal;
  window.submitAddCity = submitAddCity;
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
  const canManageTeam = u.role === 'super_admin' || hasScope('user_management');

  container.innerHTML = `
    <div class="login-modal-box" style="max-width: 440px;">
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
            <div style="font-weight: 700; font-size: 1.15rem; color: var(--text-primary);">${escapeHtml(u.name)}</div>
            <div style="color: var(--text-muted); font-size: 0.85rem;">${escapeHtml(u.email)}</div>
          </div>
        </div>
        <div style="margin-bottom: 16px; padding: 12px; background: rgba(0, 0, 0, 0.03); border: 1px solid var(--notion-hairline); border-radius: 8px;">
          <div style="font-size: 0.72rem; color: var(--notion-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Designation</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: var(--notion-ink); margin-bottom: 10px;">${escapeHtml(u.designation || 'Staff Member')}</div>
          
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.72rem; color: var(--notion-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Assigned Role</div>
              <span class="badge" style="font-size: 0.78rem; padding: 3px 8px; background: var(--notion-primary-tint); color: var(--notion-primary); font-weight: 600;">${(u.role || 'Admin').toUpperCase()}</span>
            </div>
            <div>
              <div style="font-size: 0.72rem; color: var(--notion-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Active Scopes</div>
              <span class="badge" style="font-size: 0.78rem; padding: 3px 8px; background: #e8f5e9; color: #2e7d32; font-weight: 600;">${u.role === 'super_admin' ? 'Full Access (All)' : (u.scopes ? u.scopes.length + ' Scopes' : 'Standard')}</span>
            </div>
          </div>
        </div>

        ${canManageTeam ? `
          <button class="btn btn-primary btn-block" style="padding: 10px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="closeModal(); switchMainTab('team');">
            <span>👥</span> <strong>Manage Team & Access Control</strong>
          </button>
        ` : ''}

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
function switchMainTab(tab, updateHash = true) {
  state.activeTab = tab;
  state.selectedVendorId = null;

  if (updateHash && window.location.hash !== '#' + tab) {
    try {
      history.pushState(null, '', '#' + tab);
    } catch (e) {
      window.location.hash = '#' + tab;
    }
  }

  const tabIdMap = {
    overall: 'tabOverall',
    vendors: 'tabVendors',
    orders: 'tabOrders',
    vendor_mgmt: 'tabVendorMgmt',
    payout_mgmt: 'tabPayouts',
    audit: 'tabAudit',
    team: 'tabTeam'
  };

  const drawerIdMap = {
    overall: 'mDrawerOverall',
    vendors: 'mDrawerVendors',
    orders: 'mDrawerOrders',
    vendor_mgmt: 'mDrawerVendorMgmt',
    payout_mgmt: 'mDrawerPayouts',
    audit: 'mDrawerAudit',
    team: 'mDrawerTeam'
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

function hasScope(scope) {
  if (!state.currentUser) return false;
  if (state.currentUser.role === 'super_admin') return true;
  const scopes = state.currentUser.scopes || [];
  return scopes.includes(scope);
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

  if (!isAuth) return;

  const setElVisible = (id, visible) => {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? '' : 'none';
  };

  setElVisible('tabOverall', hasScope('overall_settlement'));
  setElVisible('mDrawerOverall', hasScope('overall_settlement'));

  setElVisible('tabVendors', hasScope('vendor_wise'));
  setElVisible('mDrawerVendors', hasScope('vendor_wise'));

  setElVisible('tabOrders', hasScope('orders_management'));
  setElVisible('mDrawerOrders', hasScope('orders_management'));

  setElVisible('tabVendorMgmt', hasScope('vendor_management'));
  setElVisible('mDrawerVendorMgmt', hasScope('vendor_management'));

  setElVisible('tabPayouts', hasScope('payout_management'));
  setElVisible('mDrawerPayouts', hasScope('payout_management'));

  setElVisible('tabAudit', hasScope('audit_log'));
  setElVisible('mDrawerAudit', hasScope('audit_log'));

  const canManageTeam = state.currentUser.role === 'super_admin' || hasScope('user_management');
  setElVisible('tabTeam', canManageTeam);
  setElVisible('mDrawerTeam', canManageTeam);

  // Auto-redirect if active tab is forbidden for current user's scopes
  const tabScopeMap = {
    overall: 'overall_settlement',
    vendors: 'vendor_wise',
    orders: 'orders_management',
    vendor_mgmt: 'vendor_management',
    payout_mgmt: 'payout_management',
    audit: 'audit_log',
    team: 'user_management'
  };

  const currentTabScope = tabScopeMap[state.activeTab];
  if (currentTabScope && !hasScope(currentTabScope)) {
    const permittedTab = Object.keys(tabScopeMap).find(t => hasScope(tabScopeMap[t])) || 'vendors';
    state.activeTab = permittedTab;
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
  } else if (state.activeTab === 'team') {
    renderTeamAccessView();
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
        <!-- Export moved to consolidated Export dropdown in nav bar per BUG-23 -->
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
        <span class="summary-card-value" style="color: var(--notion-red);">${Number(eventTotals.totalReturns) > 0 ? '-' : ''}${formatINR(eventTotals.totalReturns)}</span>
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
  const vendorLink = `#vendors?vendorId=${encodeURIComponent(item.vendor.id)}`;
  return `
    <tr>
      <td>
        <a href="${vendorLink}" onclick="handleVendorLinkClick(event, '${item.vendor.id}')" style="text-decoration: none; color: inherit; cursor: pointer;">
          <strong style="color: var(--notion-primary); font-weight: 600;">${escapeHtml(item.vendor.stallNo)}</strong>
        </a>
      </td>
      <td>
        <a href="${vendorLink}" onclick="handleVendorLinkClick(event, '${item.vendor.id}')" style="text-decoration: none; color: inherit; cursor: pointer;">
          <div style="font-weight: 600; color: var(--notion-ink);">${escapeHtml(item.vendor.name)}</div>
          <div style="font-size: 0.72rem; color: var(--notion-muted);">${escapeHtml(item.vendor.webkulSellerId || '')}</div>
        </a>
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
        <a href="${vendorLink}" class="btn btn-primary btn-sm btn-view-details" onclick="handleVendorLinkClick(event, '${item.vendor.id}')" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center;">
          View Details →
        </a>
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
        <span class="summary-card-value" style="color: var(--notion-red);">${Number(eventTotals.totalReturns) > 0 ? '-' : ''}${formatINR(eventTotals.totalReturns)}</span>
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
          <button class="btn btn-outline btn-sm" onclick="exportVendorsBreakdownCSV()">
            📥 Export Excel / CSV
          </button>
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
              <td style="color: #F87171;">${Number(eventTotals.totalReturns) > 0 ? '-' : ''}${formatINR(eventTotals.totalReturns)}</td>
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
async function selectVendor(vendorId, updateHash = true) {
  state.selectedVendorId = vendorId;
  state.vendorDetailSubTab = 'bills';
  state.vendorFilterGroupA = 'all';
  state.vendorFilterGroupB = 'all';

  if (updateHash) {
    const targetHash = '#vendors?vendorId=' + encodeURIComponent(vendorId);
    if (window.location.hash !== targetHash) {
      try {
        history.pushState(null, '', targetHash);
      } catch (e) {
        window.location.hash = targetHash;
      }
    }
  }

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

function closeVendorDetail(updateHash = true) {
  state.selectedVendorId = null;
  state.vendorFilterGroupA = 'all';
  state.vendorFilterGroupB = 'all';

  if (updateHash && window.location.hash !== '#vendors') {
    try {
      history.pushState(null, '', '#vendors');
    } catch (e) {
      window.location.hash = '#vendors';
    }
  }

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
        <button class="btn btn-outline btn-sm" onclick="exportVendorBillsCSV('${v.id}')">
          📥 Export Bills CSV
        </button>
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
  // Requirement: Segregate pushed and unpushed orders into separate sections
  const pushedBills = bills.filter(b => b.shopifyOrderId || b.source === 'Shopify');
  const pendingBills = bills.filter(b => !b.shopifyOrderId && b.source !== 'Shopify');

  const pushedTotal = pushedBills.reduce((s, b) => s + (b.isVoid ? 0 : Number(b.billAmount || 0)), 0);
  const pendingTotal = pendingBills.reduce((s, b) => s + (b.isVoid ? 0 : Number(b.billAmount || 0)), 0);

  const renderBillsTable = (list, isPushedSection) => {
    if (list.length === 0) {
      return `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.85rem; background: #fafafa; border-radius: 6px; border: 1px dashed var(--notion-hairline);">
          ${isPushedSection ? 'No approved bills pushed to Shopify yet.' : 'No pending staged bills. All bills are pushed or cleared!'}
        </div>
      `;
    }

    return `
      <div class="table-responsive" style="margin-bottom: 24px;">
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="min-width: 130px;">Bill-Book No.</th>
              <th style="min-width: 110px; text-align: right;">Amount (₹)</th>
              <th>Payment Mode / Ref</th>
              <th>Shopify Order Ref</th>
              <th>Status</th>
              <th>Customer Details</th>
              <th>Date & Time (IST)</th>
              <th>Source</th>
              <th>Last Edited By</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(b => `
              <tr class="${b.isVoid ? 'row-voided' : ''}">
                <td>
                  <strong style="color: #4338CA; font-family: var(--font-mono); font-size: 0.88rem;">${escapeHtml(b.billCopyNo)}</strong>
                  ${b.mismatchFlag ? '<span class="badge badge-mismatch">MISMATCH</span>' : ''}
                </td>
                <td class="font-mono" style="text-align: right; font-weight: 700; color: #111827; font-size: 0.9rem;">
                  ${formatINR(b.billAmount)}
                </td>
                <td>
                  <span class="badge ${b.paymentMode && b.paymentMode.toLowerCase().includes('cash') ? 'badge-status-open' : 'badge-status-settled'}">
                    ${escapeHtml(b.paymentMode || 'Prepaid')}
                  </span>
                  <div style="font-family: var(--font-mono); font-size: 0.72rem; color: #64748B; margin-top: 2px;">
                    ${escapeHtml(b.paymentOrderRef || '-')}
                  </div>
                </td>
                <td>
                  ${b.shopifyOrderId ? `
                    <span style="font-family: var(--font-mono); color: #0284C7; font-weight: 600;">#${escapeHtml(String(b.shopifyOrderId))}</span>
                  ` : `<span class="badge" style="background: #fff3cd; color: #856404; font-size: 0.72rem;">Pending Push</span>`}
                </td>
                <td class="no-strike">
                  <span class="badge ${
                    b.status === 'Paid' ? 'badge-status-paid' :
                    (b.status && b.status.includes('Returned')) ? 'badge-status-partly' : 'badge-status-voided'
                  }">
                    ${b.status || 'Active'}
                  </span>
                  ${b.voidReason ? `<div style="font-size: 0.7rem; color: #F87171;">Reason: ${escapeHtml(b.voidReason)}</div>` : ''}
                </td>
                <td>
                  <div>${escapeHtml(b.customerName || 'Walk-in')}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
                    📱 ${escapeHtml(b.mobile || '-')}
                    ${(getUserRole() === 'super_admin' && b.rawMobile && b.mobile && b.mobile.includes('XXXXXX')) ? `
                      <button class="btn btn-outline btn-sm" style="padding: 1px 4px; font-size: 0.65rem;" onclick="unmaskPhone('${b.id}')">Unmask</button>
                    ` : ''}
                  </div>
                </td>
                <td style="font-size: 0.78rem;">
                  🕒 ${formatDate(b.createdAt || b.date)}
                </td>
                <td class="no-strike">
                  <span class="badge ${
                    b.source === 'Shopify' ? 'badge-source-shopify' :
                    b.source === 'Auto' ? 'badge-source-auto' :
                    b.source === 'Manual' ? 'badge-source-manual' : 'badge-source-edited'
                  }">
                    ${b.source || 'POS'}
                  </span>
                </td>
                <td style="font-size: 0.75rem; color: var(--text-muted);">
                  ${b.lastEditedBy ? `${b.lastEditedBy}<br><span style="font-size: 0.68rem;">${formatDate(b.lastEditedAt)}</span>` : '-'}
                </td>
                <td class="no-strike" style="text-align: right;">
                  ${!b.isVoid && (getUserRole() === 'super_admin' || getUserRole() === 'billing_staff') ? `
                    <div style="display: inline-flex; gap: 6px;">
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
    `;
  };

  return `
    <div class="panel">
      <!-- Section 1: Approved & Pushed to Shopify -->
      <div style="margin-bottom: 24px;">
        <div class="panel-header" style="background: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 8px 8px 0 0; padding: 12px 18px; margin-bottom: 0;">
          <div class="panel-title-group" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div>
              <h3 class="panel-title" style="color: #2e7d32; display: flex; align-items: center; gap: 8px; margin: 0;">
                <span>✅</span> Approved & Pushed to Shopify
                <span class="badge" style="background: #2e7d32; color: #fff; font-size: 0.75rem;">${pushedBills.length} Bills</span>
              </h3>
              <span style="font-size: 0.78rem; color: #388e3c;">
                Live in Shopify admin and synchronized with Overall Settlement.
              </span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.75rem; color: #388e3c; text-transform: uppercase; font-weight: 600;">Pushed Total:</span>
              <div style="font-size: 1.15rem; font-weight: 700; color: #1b5e20;">₹${pushedTotal.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
        ${renderBillsTable(pushedBills, true)}
      </div>

      <!-- Section 2: Pending / Staged Bills -->
      <div>
        <div class="panel-header" style="background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px 8px 0 0; padding: 12px 18px; margin-bottom: 0;">
          <div class="panel-title-group" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div>
              <h3 class="panel-title" style="color: #b78103; display: flex; align-items: center; gap: 8px; margin: 0;">
                <span>⏳</span> Pending / Staged Bills (Pre-Shopify)
                <span class="badge" style="background: #f57f17; color: #fff; font-size: 0.75rem;">${pendingBills.length} Bills</span>
              </h3>
              <span style="font-size: 0.78rem; color: #8d6e63;">
                Awaiting Super Admin review &amp; approval in Orders Management before pushing to Shopify.
              </span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.75rem; color: #8d6e63; text-transform: uppercase; font-weight: 600;">Pending Total:</span>
              <div style="font-size: 1.15rem; font-weight: 700; color: #e65100;">₹${pendingTotal.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
        ${renderBillsTable(pendingBills, false)}
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
            <label class="form-label required">Payment Method</label>
            <select id="payMode" class="form-select" required>
              <option value="IMPS">IMPS</option>
              <option value="Bank NEFT/RTGS">Bank NEFT/RTGS</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash Payout">Cash Payout</option>
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
      <div style="text-align: right; margin-bottom: 12px; display: flex; justify-content: flex-end; gap: 8px;">
        <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
        <button class="print-btn" style="background: #10B981;" onclick="if (window.opener && window.opener.exportVendorBillsCSV) { window.opener.exportVendorBillsCSV('${v.id}'); } else { window.print(); }">📥 Export Excel / CSV</button>
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
            <th style="text-align: right;">Gross Amount</th>
            <th style="text-align: right;">Commission (${v.commissionPct}%)</th>
            <th style="text-align: right;">Net Settlement</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${d.bills.map(b => {
            const bAmt = Number(b.billAmount || 0);
            const bComm = Math.round(bAmt * (v.commissionPct / 100) * 100) / 100;
            const bSett = Math.round((bAmt - bComm) * 100) / 100;
            return `
            <tr style="${b.isVoid ? 'text-decoration: line-through; color: #888;' : ''}">
              <td><strong>${escapeHtml(b.billCopyNo)}</strong></td>
              <td>${escapeHtml(b.paymentOrderRef || '-')}</td>
              <td>${formatDate(b.createdAt)}</td>
              <td>${escapeHtml(b.paymentMode)}</td>
              <td>${escapeHtml(b.customerName)}</td>
              <td style="text-align: right;">₹${bAmt.toLocaleString('en-IN')}</td>
              <td style="text-align: right; color: #4F46E5;">₹${bComm.toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-weight: 700; color: #059669;">₹${bSett.toLocaleString('en-IN')}</td>
              <td>${escapeHtml(b.status)}</td>
            </tr>
          `;}).join('')}
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

  try {
    main.innerHTML = `
      <div class="view-header" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 class="view-title" style="font-size: 1.6rem; font-weight: 700; color: var(--notion-ink); display: flex; align-items: center; gap: 10px; margin: 0 0 4px 0;">
            📦 Orders Management & Approval
            <span class="badge badge-blue" style="font-size: 0.75rem; vertical-align: middle;">Pre-Shopify Staging</span>
          </h1>
          <p class="view-subtitle" style="color: var(--notion-secondary); font-size: 0.88rem; margin: 0;">
            All orders from the Vijayawada billing counter stage here first. Super Admin can review, edit details, and manually or bulk-approve them into Shopify.
          </p>
        </div>

          ${(getUserRole() === 'super_admin' && state.devMode) ? `
            <button class="btn btn-outline btn-sm" onclick="simulatePosOrder()" title="Simulate a new customer order from POS for testing">
              ➕ Simulate POS Order
            </button>
          ` : ''}
          ${getUserRole() === 'super_admin' ? `
            <button class="btn btn-primary btn-sm" id="btnBulkApproveTop" onclick="bulkPushApprovedOrders()" style="background: #008060; border-color: #008060;">
              🚀 Bulk Approve & Push to Shopify
            </button>
          ` : ''}
          <!-- Export moved to consolidated Export dropdown in nav bar per BUG-23 -->
          <button class="btn btn-outline btn-sm" onclick="renderOrdersManagementView()">
            🔄 Refresh Orders
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards for Orders Management -->
      <div id="ordersKpiCardsContainer" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div class="summary-card" style="padding: 14px 18px;">
          <span class="summary-card-label">Total Staged Orders <span>📦</span></span>
          <span class="summary-card-value" id="kpiTotalOrders">0</span>
          <span class="summary-card-sub">Recorded in HalfPe DB</span>
        </div>
        <div class="summary-card" style="padding: 14px 18px; border-left: 3px solid #D99B00;">
          <span class="summary-card-label">Awaiting Approval <span>⏳</span></span>
          <span class="summary-card-value" style="color: #D99B00;" id="kpiPendingApproval">0</span>
          <span class="summary-card-sub" id="kpiPendingValue">₹0.00 value</span>
        </div>
        <div class="summary-card" style="padding: 14px 18px; border-left: 3px solid #008060;">
          <span class="summary-card-label">Approved & Pushed <span>✅</span></span>
          <span class="summary-card-value" style="color: #008060;" id="kpiApprovedOrders">0</span>
          <span class="summary-card-sub">Live in Shopify & Settlement</span>
        </div>
        <div class="summary-card" style="padding: 14px 18px; border-left: 3px solid #D97706;">
          <span class="summary-card-label">Push Failed (Needs Retry) <span>⚠️</span></span>
          <span class="summary-card-value" style="color: #D97706;" id="kpiFailedOrders">0</span>
          <span class="summary-card-sub">Shopify sync error</span>
        </div>
        <div class="summary-card" style="padding: 14px 18px; border-left: 3px solid #C4122F;">
          <span class="summary-card-label">Rejected <span>❌</span></span>
          <span class="summary-card-value" style="color: #C4122F;" id="kpiRejectedOrders">0</span>
          <span class="summary-card-sub">Declined orders</span>
        </div>
      </div>

      <!-- Orders Filter & Search Toolbar -->
      <div class="card" style="padding: 14px 18px; margin-bottom: 20px; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); box-shadow: var(--shadow-soft);">
        <div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
          <div style="display: flex; gap: 10px; flex-grow: 1; max-width: 440px;">
            <input type="text" id="orderSearchInput" class="form-input" placeholder="🔍 Search Bill #, Customer, Phone, Stall, Vendor..." 
              value="${escapeHtml(ordersManagementState.search)}" oninput="handleOrderSearch(this.value)" style="width: 100%; height: 36px;">
          </div>

          <!-- Status Filter Tabs -->
          <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
            <span style="font-size: 0.82rem; font-weight: 600; color: var(--notion-secondary); margin-right: 4px;">Status:</span>
            <button class="btn btn-xs ${ordersManagementState.statusFilter === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="setOrderStatusFilter('all')">All</button>
            <button class="btn btn-xs ${ordersManagementState.statusFilter === 'PENDING_APPROVAL' ? 'btn-primary' : 'btn-outline'}" onclick="setOrderStatusFilter('PENDING_APPROVAL')">⏳ Pending Approval</button>
            <button class="btn btn-xs ${ordersManagementState.statusFilter === 'APPROVED' ? 'btn-primary' : 'btn-outline'}" onclick="setOrderStatusFilter('APPROVED')">✅ Approved</button>
            <button class="btn btn-xs ${ordersManagementState.statusFilter === 'REJECTED' ? 'btn-primary' : 'btn-outline'}" onclick="setOrderStatusFilter('REJECTED')">❌ Rejected</button>
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
  } catch (err) {
    main.innerHTML = `<div class="card" style="padding: 30px; color: red;">Error rendering Orders Management: ${err.message}</div>`;
  }
}

async function loadAndRenderOrdersTable() {
  const container = document.getElementById('ordersTableContainer');
  if (!container) return;

  try {
    const params = new URLSearchParams();
    if (state.startDate) params.append('startDate', state.startDate);
    if (state.endDate) params.append('endDate', state.endDate);
    if (ordersManagementState.search) params.append('search', ordersManagementState.search);
    if (ordersManagementState.statusFilter !== 'all') params.append('status', ordersManagementState.statusFilter);
    if (ordersManagementState.shopifyFilter !== 'all') params.append('shopifySyncStatus', ordersManagementState.shopifyFilter);
    if (state.selectedGlobalVendor && state.selectedGlobalVendor !== 'all') params.append('vendorId', state.selectedGlobalVendor);

    const res = await fetch(`/api/orders?${params.toString()}`);
    const orders = await res.json();
    ordersManagementState.ordersList = orders;

    // Update KPI counters
    const allRes = await fetch('/api/orders');
    const allOrders = await allRes.json();
    if (Array.isArray(allOrders)) {
      const pending = allOrders.filter(o => o.status === 'PENDING_APPROVAL' || (!o.status && !o.shopifyOrderId));
      const approved = allOrders.filter(o => o.status === 'APPROVED' || o.shopifySyncStatus === 'PUSHED');
      const failed = allOrders.filter(o => o.shopifySyncStatus === 'FAILED');
      const rejected = allOrders.filter(o => o.status === 'REJECTED');
      const pendingVal = pending.reduce((sum, o) => sum + Number(o.totals?.payable || o.totalPayable || 0), 0);

      const kpiTotal = document.getElementById('kpiTotalOrders');
      if (kpiTotal) kpiTotal.textContent = allOrders.length;
      const kpiPend = document.getElementById('kpiPendingApproval');
      if (kpiPend) kpiPend.textContent = pending.length;
      const kpiPendVal = document.getElementById('kpiPendingValue');
      if (kpiPendVal) kpiPendVal.textContent = `₹${pendingVal.toLocaleString('en-IN')} value`;
      const kpiAppr = document.getElementById('kpiApprovedOrders');
      if (kpiAppr) kpiAppr.textContent = approved.length;
      const kpiFailed = document.getElementById('kpiFailedOrders');
      if (kpiFailed) kpiFailed.textContent = failed.length;
      const kpiRej = document.getElementById('kpiRejectedOrders');
      if (kpiRej) kpiRej.textContent = rejected.length;

      const bulkBtn = document.getElementById('btnBulkApproveTop');
      if (bulkBtn) {
        const selCount = ordersManagementState.selectedOrderIds.size;
        if (selCount > 0) {
          bulkBtn.textContent = `🚀 Bulk Approve Selected (${selCount})`;
        } else if (pending.length > 0) {
          bulkBtn.textContent = `🚀 Bulk Approve All Pending (${pending.length})`;
        } else {
          bulkBtn.textContent = `🚀 Bulk Approve to Shopify`;
        }
      }
    }

    if (!Array.isArray(orders) || orders.length === 0) {
      container.innerHTML = `
        <div class="card" style="padding: 48px; text-align: center; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline);">
          <div style="font-size: 2.2rem; margin-bottom: 12px;">📦</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--notion-ink);">No Internal Orders Found</h3>
          <p style="color: var(--notion-secondary); font-size: 0.88rem; max-width: 440px; margin: 8px auto 16px;">
            Orders recorded through the payment page will appear here for Super Admin approval before being pushed to Shopify.
          </p>
          ${getUserRole() === 'super_admin' ? `
            <button class="btn btn-primary btn-sm" onclick="simulatePosOrder()" style="background: #008060; border-color: #008060;">
              ➕ Simulate Test Order From POS Billing Desk
            </button>
          ` : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-card" style="background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); overflow: hidden; box-shadow: var(--shadow-soft);">
        <div style="padding: 12px 18px; background: var(--notion-surface-warm); border-bottom: 1px solid var(--notion-hairline); display: flex; justify-content: space-between; align-items: center; font-size: 0.84rem; color: var(--notion-secondary);">
          <span>Showing <strong>${orders.length}</strong> internal orders in view</span>
          ${getUserRole() === 'super_admin' ? `
            <span style="font-size: 0.8rem; color: #008060; font-weight: 600;">⚡ Approving an order creates it in Shopify & updates Overall Settlement</span>
          ` : ''}
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="background: var(--notion-surface-warm); border-bottom: 1px solid var(--notion-hairline); text-align: left;">
                <th style="padding: 10px 14px; width: 36px;">
                  <input type="checkbox" onchange="toggleSelectAllOrders(this.checked)" title="Select all unpushed">
                </th>
                <th style="padding: 10px 14px;">HalfPe Bill Copy Number</th>
                <th style="padding: 10px 14px;">Customer</th>
                <th style="padding: 10px 14px;">Stall & Vendor</th>
                <th style="padding: 10px 14px;">Items</th>
                <th style="padding: 10px 14px; text-align: right; min-width: 115px; white-space: nowrap;">Gross Sale</th>
                <th style="padding: 10px 14px; text-align: right; min-width: 115px; white-space: nowrap;">Net Payable</th>
                <th style="padding: 10px 14px;">Payment</th>
                <th style="padding: 10px 14px;">Approval Status</th>
                <th style="padding: 10px 14px;">Shopify Status</th>
                <th style="padding: 10px 14px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => {
                const isApproved = o.status === 'APPROVED';
                const isRejected = o.status === 'REJECTED';
                const isPushed = o.shopifySyncStatus === 'PUSHED';
                const isFailed = o.shopifySyncStatus === 'FAILED';
                const gross = o.totals?.grossAmount || o.totals?.payable || o.totalPayable || 0;
                const net = o.totalPayable || gross;
                const itemsCount = (o.items && o.items.length) || 1;
                const firstItemTitle = o.items?.[0]?.name || o.items?.[0]?.title || 'Expo Item';
                
                // Requirement: Only pure bill number without any prefix (e.g. 8569 or 6418)
                const rawBill = String(o.billNo || o.id);
                const cleanBillNo = rawBill.replace(/^(HPD-[A-Z0-9]+-\d+-|HP-VIJ-|HPD-VIJ-|HPD-|VIJ-|ord_\d+_[a-z0-9]+_|ord_\d+_)/i, '');

                return `
                  <tr style="border-bottom: 1px solid var(--notion-hairline-subtle); transition: background 0.15s; ${isRejected ? 'opacity: 0.6; background: #fafafa;' : ''}" onmouseover="this.style.background='#faf9f8'" onmouseout="this.style.background='${isRejected ? '#fafafa' : 'transparent'}'">
                    <td style="padding: 12px 14px;">
                      <input type="checkbox" ${isApproved || isRejected ? 'disabled' : ''} value="${o.id}" 
                        ${ordersManagementState.selectedOrderIds.has(o.id) ? 'checked' : ''}
                        onchange="toggleSelectOrder('${o.id}', this.checked)">
                    </td>
                    <td style="padding: 12px 14px;">
                      <strong style="color: var(--notion-ink); font-family: var(--font-mono); font-size: 0.95rem;">${escapeHtml(cleanBillNo)}</strong>
                      <div style="font-size: 0.72rem; color: var(--notion-muted); margin-top: 2px;">🕒 ${formatDate(o.createdAt || o.date)}</div>
                    </td>
                    <td style="padding: 12px 14px;">
                      <div style="font-weight: 600; color: var(--notion-ink);">${escapeHtml(o.customer?.name || 'Walk-in')}</div>
                      <div style="font-size: 0.75rem; color: var(--notion-secondary);">${escapeHtml(o.customer?.phone || '-')}</div>
                    </td>
                    <td style="padding: 12px 14px;">
                      <span class="badge" style="background: #eef2f6; font-size: 0.72rem; font-weight: 600;">${escapeHtml(o.stallNo || 'Stall TBD')}</span>
                      <div style="font-size: 0.8rem; color: var(--notion-ink); margin-top: 2px;">${escapeHtml(o.vendorName || 'Unassigned')}</div>
                    </td>
                    <td style="padding: 12px 14px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      <span title="${escapeHtml(firstItemTitle)}">${escapeHtml(firstItemTitle)}</span>
                      ${itemsCount > 1 ? `<span class="badge badge-outline" style="font-size: 0.68rem; margin-left: 2px;">+${itemsCount - 1}</span>` : ''}
                    </td>
                    <td style="padding: 12px 14px; text-align: right; font-weight: 600; min-width: 115px; white-space: nowrap;">
                      ₹${Number(gross).toLocaleString('en-IN')}
                    </td>
                    <td style="padding: 12px 14px; text-align: right; font-weight: 600; color: #0075DE; min-width: 115px; white-space: nowrap;">
                      ₹${Number(net).toLocaleString('en-IN')}
                    </td>
                    <td style="padding: 12px 14px;">
                      <div style="font-size: 0.78rem; font-weight: 500;">${escapeHtml(o.payment?.method || 'Prepaid')}</div>
                      <div style="font-size: 0.7rem; color: var(--notion-muted); font-family: var(--font-mono);">${escapeHtml(o.payment?.paymentId ? String(o.payment.paymentId).slice(-8) : '-')}</div>
                    </td>
                    <td style="padding: 12px 14px;">
                      ${isApproved ? `
                        <span class="badge" style="background: #d4edda; color: #155724; font-size: 0.74rem; font-weight: 600;">
                          ✅ Approved
                        </span>
                      ` : isRejected ? `
                        <span class="badge" style="background: #f8d7da; color: #721c24; font-size: 0.74rem; font-weight: 600;" title="${escapeHtml(o.rejectionReason || 'Rejected')}">
                          ❌ Rejected
                        </span>
                      ` : `
                        <span class="badge" style="background: #fff3cd; color: #856404; font-size: 0.74rem; font-weight: 600;">
                          ⏳ Pending Approval
                        </span>
                      `}
                    </td>
                    <td style="padding: 12px 14px;">
                      ${isPushed ? `
                        <span class="badge" style="background: #e8f4fd; color: #0075DE; font-size: 0.74rem; font-weight: 600;">
                          ✓ #${escapeHtml(String(o.shopifyOrderNumber || o.shopifyOrderId))}
                        </span>
                      ` : isFailed ? `
                        <span class="badge" style="background: #f8d7da; color: #721c24; font-size: 0.74rem; font-weight: 600;" title="${escapeHtml(o.shopifyError || 'Error')}">
                          ✕ Push Failed
                        </span>
                      ` : `
                        <span class="badge" style="background: #f0f0f0; color: #666; font-size: 0.74rem;">
                          Not Pushed
                        </span>
                      `}
                    </td>
                    <td style="padding: 12px 14px; text-align: right; white-space: nowrap;">
                      <div style="display: inline-flex; gap: 6px; align-items: center;">
                        <button class="btn btn-outline btn-xs" onclick="openViewOrderModal('${o.id}')" title="Inspect Order Details">
                          👁️ View
                        </button>
                        ${getUserRole() === 'super_admin' ? `
                          ${!isApproved && !isRejected ? `
                            <button class="btn btn-outline btn-xs" onclick="openEditOrderModal('${o.id}')" title="Edit Customer / Stall">
                              ✏️ Edit
                            </button>
                            <button class="btn btn-primary btn-xs" id="pushBtn_${o.id}" onclick="pushSingleOrderToShopify('${o.id}')" style="background: #008060; border-color: #008060;" title="Approve order & create in Shopify">
                              ✅ Approve & Push
                            </button>
                            <button class="btn btn-outline btn-xs" onclick="rejectSingleOrder('${o.id}')" style="color: #C4122F;" title="Reject this order">
                              ❌ Reject
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

function setOrderStatusFilter(status) {
  ordersManagementState.statusFilter = status;
  renderOrdersManagementView();
}

function setOrderShopifyFilter(status) {
  ordersManagementState.shopifyFilter = status;
  renderOrdersManagementView();
}

function toggleSelectOrder(id, checked) {
  if (checked) ordersManagementState.selectedOrderIds.add(id);
  else ordersManagementState.selectedOrderIds.delete(id);
  updateBulkButtonLabel();
}

function toggleSelectAllOrders(checked) {
  const checkboxes = document.querySelectorAll('#ordersTableContainer tbody input[type="checkbox"]:not([disabled])');
  checkboxes.forEach(cb => {
    cb.checked = checked;
    if (checked) ordersManagementState.selectedOrderIds.add(cb.value);
    else ordersManagementState.selectedOrderIds.delete(cb.value);
  });
  updateBulkButtonLabel();
}

function updateBulkButtonLabel() {
  const bulkBtn = document.getElementById('btnBulkApproveTop');
  if (!bulkBtn) return;
  const selCount = ordersManagementState.selectedOrderIds.size;
  if (selCount > 0) {
    bulkBtn.textContent = `🚀 Bulk Approve Selected (${selCount})`;
  } else {
    const pending = (ordersManagementState.ordersList || []).filter(o => o.status === 'PENDING_APPROVAL' || (!o.status && !o.shopifyOrderId));
    bulkBtn.textContent = pending.length > 0 ? `🚀 Bulk Approve All Pending (${pending.length})` : `🚀 Bulk Approve to Shopify`;
  }
}

// Push Single Order to Shopify (Approve Action)
async function pushSingleOrderToShopify(orderId) {
  if (getUserRole() !== 'super_admin') {
    toast('Access Denied: Only Super Admin can approve and push orders to Shopify.', 'error');
    return;
  }

  const btn = document.getElementById(`pushBtn_${orderId}`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Approving...';
  }

  toast('Approving order & pushing to Shopify Admin API...', 'info');

  try {
    const res = await fetch(`/api/orders/${orderId}/push-to-shopify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();

    if (data.success) {
      toast(`✓ Order #${data.order?.billNo || orderId} approved! Shopify Order #${data.shopifyOrderNumber} created and Overall Settlement updated.`, 'success');
      await loadAndRenderOrdersTable();
      await loadVendorsSummary(); // Sync overall settlement
    } else {
      toast(`Approval failed: ${data.error || 'Shopify API error'}`, 'error');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Retry Approve';
      }
    }
  } catch (err) {
    toast(`Network failure during approval: ${err.message}`, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Retry Approve';
    }
  }
}

// Reject Single Order
async function rejectSingleOrder(orderId) {
  if (getUserRole() !== 'super_admin') {
    toast('Access Denied: Only Super Admin can reject orders.', 'error');
    return;
  }
  const reason = prompt('Please enter the reason for rejecting this order (e.g. Canceled at stall, Duplicate bill):');
  if (!reason || !reason.trim()) return;

  try {
    const res = await fetch(`/api/orders/${orderId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() })
    });
    const data = await res.json();
    if (data.success) {
      toast('Order marked as Rejected.', 'success');
      await loadAndRenderOrdersTable();
      await loadVendorsSummary();
    } else {
      toast(data.error || 'Failed to reject order', 'error');
    }
  } catch (err) {
    toast('Error rejecting order: ' + err.message, 'error');
  }
}

// Simulate a Staging Order from POS
async function simulatePosOrder() {
  if (getUserRole() !== 'super_admin') {
    toast('Access Denied: Only Super Admin can simulate POS orders.', 'error');
    return;
  }
  toast('Simulating new customer bill from POS billing terminal...', 'info');
  try {
    const res = await fetch('/api/orders/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      toast(`✓ Staged new POS Bill #${data.order.billNo} for ₹${data.order.totals?.grossAmount}! Ready for approval.`, 'success');
      ordersManagementState.statusFilter = 'PENDING_APPROVAL';
      await renderOrdersManagementView();
    } else {
      toast(data.error || 'Simulation failed', 'error');
    }
  } catch (err) {
    toast('Simulation error: ' + err.message, 'error');
  }
}

// Bulk Push / Approve Orders
async function bulkPushApprovedOrders() {
  if (getUserRole() !== 'super_admin') {
    toast('Access Denied: Only Super Admin can execute bulk push.', 'error');
    return;
  }

  let ids = Array.from(ordersManagementState.selectedOrderIds);
  if (ids.length === 0) {
    // If none selected, default to all pending unpushed orders
    const pendingOrders = (ordersManagementState.ordersList || []).filter(o => o.status === 'PENDING_APPROVAL' || (!o.status && !o.shopifyOrderId));
    if (pendingOrders.length === 0) {
      toast('No pending orders available to approve.', 'info');
      return;
    }
    if (!confirm(`No individual orders selected. Do you want to approve and push all ${pendingOrders.length} pending orders to Shopify?`)) {
      return;
    }
    ids = pendingOrders.map(o => o.id);
  } else {
    if (!confirm(`Are you sure you want to approve and push ${ids.length} selected orders to Shopify?`)) {
      return;
    }
  }

  toast(`Approving and pushing ${ids.length} orders to Shopify...`, 'info');

  try {
    const res = await fetch('/api/orders/bulk-push-to-shopify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: ids })
    });
    const data = await res.json();

    if (data.success) {
      const successCount = data.results.filter(r => r.success).length;
      toast(`✓ Successfully approved and created ${successCount} of ${ids.length} orders in Shopify! Overall Settlement updated.`, 'success');
      ordersManagementState.selectedOrderIds.clear();
      await loadAndRenderOrdersTable();
      await loadVendorsSummary();
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
  const customerName = (document.getElementById('editOrderCustName').value || '').trim();
  const customerPhone = (document.getElementById('editOrderCustPhone').value || '').trim();
  const status = document.getElementById('editOrderStatus').value;

  if (!customerName) {
    toast('Customer name is required.', 'error');
    return;
  }

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
      toast('✓ Order updated successfully! Redirected to Orders view.', 'success');
      closeModal();
      switchMainTab('orders');
      await renderOrdersManagementView();
      await loadVendorsSummary();
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

const vendorMgmtSelectedIds = new Set();

async function renderVendorManagementView() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  main.innerHTML = `
    <div class="view-header" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
      <div>
        <h1 class="view-title" style="font-size: 1.6rem; font-weight: 700; color: var(--notion-ink); display: flex; align-items: center; gap: 10px;">
          🏬 Vendor Management
          <span class="badge badge-purple" style="font-size: 0.75rem; vertical-align: middle;">Directory Master</span>
        </h1>
        <p class="view-subtitle" style="color: var(--notion-secondary); font-size: 0.88rem; margin-top: 4px;">
          Add official vendors, assign stall numbers, bulk activate/deactivate, and bulk import vendors from Excel / CSV.
        </p>
      </div>

      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <button class="btn btn-outline btn-sm" onclick="exportVendorDirectoryCSV()">
          📥 Export Directory CSV
        </button>
        ${getUserRole() === 'super_admin' ? `
          <button class="btn btn-outline btn-sm" onclick="openBulkImportVendorsModal()" style="border-color: #10B981; color: #047857;">
            📊 Bulk Import (Excel / CSV)
          </button>
          <button class="btn btn-primary btn-sm" onclick="openAddVendorModal()">
            ➕ Add Single Vendor
          </button>
        ` : ''}
      </div>
    </div>

    <!-- Bulk Action Toolbar (Appears when 1 or more vendors selected) -->
    <div id="vendorBulkActionBar" style="display: none; padding: 12px 18px; margin-bottom: 16px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: var(--radius-md); box-shadow: var(--shadow-soft); justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 0.88rem; font-weight: 700; color: #3730a3;" id="vendorBulkSelectedCount">0 Vendors Selected</span>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <button class="btn btn-outline btn-xs" style="background:#fff; color:#15803d; border-color:#86efac;" onclick="executeBulkVendorAction('activate')">
          ✅ Bulk Activate
        </button>
        <button class="btn btn-outline btn-xs" style="background:#fff; color:#b91c1c; border-color:#fca5a5;" onclick="executeBulkVendorAction('deactivate')">
          🚫 Bulk Deactivate
        </button>
        <button class="btn btn-outline btn-xs" style="background:#fff; color:#4338ca; border-color:#a5b4fc;" onclick="executeBulkVendorAction('update_commission')">
          📊 Update Commission %
        </button>
        <button class="btn btn-outline btn-xs" style="background:#fff;" onclick="clearVendorSelection()">
          ✕ Clear
        </button>
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
          <span style="font-size: 0.8rem; color: #28a745;">🛡️ Bulk actions & Excel sheet imports enabled</span>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="background: var(--notion-surface-warm); border-bottom: 1px solid var(--notion-hairline); text-align: left;">
                <th style="padding: 10px 14px; width: 36px;">
                  <input type="checkbox" id="selectAllVendors" onchange="toggleSelectAllVendors(this.checked)" title="Select all vendors">
                </th>
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
                const isChecked = vendorMgmtSelectedIds.has(v.id);
                return `
                  <tr style="border-bottom: 1px solid var(--notion-hairline-subtle); opacity: ${isActive ? '1' : '0.6'}; background: ${isChecked ? '#f5f3ff' : 'transparent'};">
                    <td style="padding: 12px 14px;">
                      <input type="checkbox" value="${v.id}" class="vendor-row-check" ${isChecked ? 'checked' : ''} onchange="toggleSelectVendorRow('${v.id}', this.checked)">
                    </td>
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

    updateVendorBulkActionBar();
  } catch (err) {
    container.innerHTML = `<div class="card" style="padding: 24px; color: red;">Error: ${err.message}</div>`;
  }
}

function toggleSelectVendorRow(id, checked) {
  if (checked) vendorMgmtSelectedIds.add(id);
  else vendorMgmtSelectedIds.delete(id);
  updateVendorBulkActionBar();
}

function toggleSelectAllVendors(checked) {
  const checkboxes = document.querySelectorAll('#vendorMgmtTableContainer input.vendor-row-check');
  checkboxes.forEach(cb => {
    cb.checked = checked;
    if (checked) vendorMgmtSelectedIds.add(cb.value);
    else vendorMgmtSelectedIds.delete(cb.value);
  });
  updateVendorBulkActionBar();
}

function clearVendorSelection() {
  vendorMgmtSelectedIds.clear();
  const selectAll = document.getElementById('selectAllVendors');
  if (selectAll) selectAll.checked = false;
  document.querySelectorAll('#vendorMgmtTableContainer input.vendor-row-check').forEach(cb => cb.checked = false);
  updateVendorBulkActionBar();
}

function updateVendorBulkActionBar() {
  const bar = document.getElementById('vendorBulkActionBar');
  const countEl = document.getElementById('vendorBulkSelectedCount');
  if (!bar) return;
  const count = vendorMgmtSelectedIds.size;
  if (count > 0) {
    bar.style.display = 'flex';
    if (countEl) countEl.textContent = `${count} Vendor${count > 1 ? 's' : ''} Selected`;
  } else {
    bar.style.display = 'none';
  }
}

async function executeBulkVendorAction(action) {
  const ids = Array.from(vendorMgmtSelectedIds);
  if (ids.length === 0) {
    toast('No vendors selected.', 'error');
    return;
  }

  let commissionPct = undefined;
  if (action === 'update_commission') {
    const input = prompt(`Enter new Commission % to apply to all ${ids.length} selected vendors:`, '15');
    if (input === null) return;
    commissionPct = parseFloat(input);
    if (isNaN(commissionPct) || commissionPct < 0 || commissionPct > 100) {
      toast('Invalid commission rate entered.', 'error');
      return;
    }
  } else {
    const actionWord = action === 'activate' ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${actionWord} ${ids.length} selected vendors?`)) {
      return;
    }
  }

  toast(`Applying bulk ${action} across ${ids.length} vendors...`, 'info');

  try {
    const res = await fetch('/api/vendors/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, vendorIds: ids, commissionPct })
    });
    const data = await res.json();
    if (data.success) {
      toast(`✓ Successfully updated ${data.updatedCount} vendors!`, 'success');
      clearVendorSelection();
      await loadAndRenderVendorMgmtTable();
      await loadVendorsSummary();
    } else {
      toast(`Bulk action failed: ${data.error}`, 'error');
    }
  } catch (err) {
    toast('Network error during bulk action: ' + err.message, 'error');
  }
}

// Bulk Import Vendors Modal (F2)
function openBulkImportVendorsModal() {
  const container = document.getElementById('modalContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="login-modal-box" style="max-width: 620px;">
      <div class="login-modal-header">
        <div>
          <h3 class="login-modal-title">📊 Bulk Import Vendors (Excel / CSV)</h3>
          <p class="login-modal-sub">Add or update multiple vendors at once from spreadsheet data</p>
        </div>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>

      <div style="padding: 24px;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: var(--radius-sm); font-size: 0.83rem; color: #166534; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>Expected Columns:</strong><br>
            <code>StallNo, VendorName, Code, Category, CommissionPct, Phone</code>
          </div>
          <button type="button" class="btn btn-outline btn-xs" style="background:#fff;" onclick="downloadVendorImportTemplate()">
            📥 Download Template
          </button>
        </div>

        <form id="bulkVendorForm" onsubmit="submitBulkImportVendors(event)">
          <div style="margin-bottom: 14px;">
            <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">
              Paste CSV or Tab-Separated Data from Excel:
            </label>
            <textarea id="bulkVendorData" class="form-input" rows="8" placeholder="StallNo, VendorName, Code, Category, CommissionPct, Phone&#10;Stall 01, Artisan Silks, ART01, Apparel, 15, 9876543210&#10;Stall 02, Spice Hub, SPH02, Food, 15, 9123456789" style="width: 100%; font-family: var(--font-mono); font-size: 0.82rem; padding: 10px;" required></textarea>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label class="btn btn-outline btn-xs" style="cursor: pointer;">
              📁 Upload .csv File
              <input type="file" accept=".csv,.txt" style="display:none;" onchange="handleVendorCsvFileUpload(event)">
            </label>

            <div style="display: flex; gap: 10px;">
              <button type="button" class="btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm" id="btnSubmitBulkImport" style="background: #10B981; border-color: #10B981;">
                🚀 Start Import
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
  container.classList.remove('hidden');
}

function handleVendorCsvFileUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    const ta = document.getElementById('bulkVendorData');
    if (ta) ta.value = evt.target.result;
    toast(`✓ Loaded file: ${file.name}`, 'info');
  };
  reader.readAsText(file);
}

function downloadVendorImportTemplate() {
  const headers = ['StallNo', 'VendorName', 'Code', 'Category', 'CommissionPct', 'Phone'];
  const sampleRows = [
    ['Stall 101', 'Heritage Sarees', 'HER101', 'Apparel', '15', '9876543210'],
    ['Stall 102', 'Krishna Crafts', 'KRI102', 'Handicrafts', '15', '9876543211'],
    ['Stall 103', 'Amaravati Spices', 'AMA103', 'FMCG', '15', '9876543212']
  ];
  downloadDataAsCSV('HalfPe_Vendor_Import_Template', headers, sampleRows);
}

async function submitBulkImportVendors(e) {
  e.preventDefault();
  const text = (document.getElementById('bulkVendorData').value || '').trim();
  if (!text) {
    toast('Please paste data or upload a CSV file.', 'error');
    return;
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    toast('No data lines found.', 'error');
    return;
  }

  // Parse lines (support comma or tab)
  const isHeader = lines[0].toLowerCase().includes('stall') || lines[0].toLowerCase().includes('vendor');
  const dataLines = isHeader ? lines.slice(1) : lines;

  const vendorsToImport = [];
  dataLines.forEach(line => {
    // split by comma or tab (handles basic CSV)
    const cols = line.includes('\t') ? line.split('\t') : line.split(',');
    const clean = cols.map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (clean.length >= 2) {
      vendorsToImport.push({
        stallNo: clean[0] || 'Stall TBD',
        name: clean[1] || 'Partner Vendor',
        code: clean[2] || '',
        category: clean[3] || 'Retail',
        commissionPct: clean[4] ? parseFloat(clean[4]) : 15,
        phone: clean[5] || ''
      });
    }
  });

  if (vendorsToImport.length === 0) {
    toast('No valid vendor rows detected. Check columns format.', 'error');
    return;
  }

  const btn = document.getElementById('btnSubmitBulkImport');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Importing...';
  }

  try {
    const res = await fetch('/api/vendors/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendors: vendorsToImport })
    });
    const data = await res.json();
    if (data.success) {
      toast(`✓ Successfully imported ${data.count} vendors into the directory!`, 'success');
      closeModal();
      await loadAndRenderVendorMgmtTable();
      await loadVendorsSummary();
    } else {
      toast(`Import failed: ${data.error}`, 'error');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🚀 Start Import';
      }
    }
  } catch (err) {
    toast('Import network error: ' + err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🚀 Start Import';
    }
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
        <button class="btn btn-outline btn-sm" onclick="exportPayoutsManagementCSV()">
          📥 Export Payouts CSV
        </button>
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
    const [vRes, pRes] = await Promise.all([
      fetch('/api/vendors'),
      fetch('/api/payouts')
    ]);
    const vData = await vRes.json();
    const totals = vData.eventTotals || {};
    const allPayouts = await pRes.json();

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
// Smart Order-Linked Payout Modal (E5 + E6)
async function openOrderPayoutModal() {
  const container = document.getElementById('modalContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="login-modal-box" style="max-width: 720px;">
      <div class="login-modal-header">
        <div>
          <h3 class="login-modal-title">💸 Record Order-Linked Payout</h3>
          <p class="login-modal-sub">Search vendor, multi-select orders, and allocate payment with real-time balance tracking</p>
        </div>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>

      <form id="orderPayoutForm" onsubmit="submitOrderPayout(event)" style="padding: 24px; max-height: 75vh; overflow-y: auto;">
        <!-- 1. Searchable Vendor Selector (Enhancement 5) -->
        <div style="margin-bottom: 18px; position: relative;">
          <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">
            Select Vendor (Search by Stall # or Vendor Name):
          </label>
          <div style="position: relative;">
            <input 
              type="text" 
              id="payoutVendorSearchInput" 
              class="form-input" 
              placeholder="🔍 Search vendor by stall # (e.g. 101) or vendor name..." 
              autocomplete="off"
              style="width: 100%; height: 38px; padding-right: 32px;"
              oninput="filterPayoutVendorSuggest(this.value)"
              onfocus="showPayoutVendorSuggest(true)"
            />
            <button 
              type="button" 
              id="clearPayoutVendorBtn" 
              style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 16px; cursor: pointer; color: #888; display: none;"
              onclick="clearSelectedPayoutVendor()"
            >×</button>
          </div>
          <input type="hidden" id="payoutVendorSelect" required>

          <!-- Suggestions Dropdown -->
          <div 
            id="payoutVendorSuggestList" 
            style="position: absolute; top: calc(100% + 4px); left: 0; right: 0; max-height: 220px; overflow-y: auto; background: var(--notion-surface, #ffffff); border: 1px solid var(--notion-hairline, #e2e8f0); border-radius: var(--radius-sm, 6px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15); z-index: 9999; display: none;"
          >
          </div>
        </div>

        <!-- 2. Unpaid / Partially Paid Orders Table with Selection Matrix (Enhancement 6) -->
        <div id="unpaidOrdersTableArea" style="margin-bottom: 20px;">
          <div style="padding: 20px; text-align: center; background: var(--notion-surface-warm); border-radius: var(--radius-sm); color: var(--notion-secondary); font-size: 0.85rem;">
            👆 Please select a vendor above to load eligible unpaid orders.
          </div>
        </div>

        <!-- 3. Payment Mode & Reference Details (Enhancement 6: Bank NEFT/RTGS, IMPS, Bank Transfer, Cash Payout) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
          <div>
            <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Payment Method:</label>
            <select id="payoutMode" class="form-input" style="width: 100%; height: 36px;">
              <option value="Bank NEFT/RTGS">Bank NEFT/RTGS</option>
              <option value="IMPS">IMPS</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash Payout">Cash Payout</option>
            </select>
          </div>
          <div>
            <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Bank Ref / UTR #:</label>
            <input type="text" id="payoutRef" class="form-input" placeholder="e.g. UTR9281726189 / IMPS20261027" style="width: 100%; height: 36px;" required>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="font-weight: 600; font-size: 0.84rem; display: block; margin-bottom: 6px;">Remarks / Allocation Notes:</label>
          <input type="text" id="payoutNotes" class="form-input" placeholder="e.g. Cleared morning expo session bills" style="width: 100%; height: 36px;">
        </div>

        <!-- Dynamic Calculation Badge & Submission -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--notion-hairline); padding-top: 16px;">
          <div>
            <span style="font-size: 0.82rem; color: var(--notion-secondary);">Total Selected Amount:</span>
            <div id="totalPayoutDisplay" style="font-size: 1.15rem; font-weight: 700; color: #1AAE39;">₹0.00 (0 Orders selected)</div>
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

  // Pre-populate suggestions
  filterPayoutVendorSuggest('');
}

// E5: Auto-suggest & Searchable Vendor Selector
function showPayoutVendorSuggest(show) {
  const list = document.getElementById('payoutVendorSuggestList');
  if (list) list.style.display = show ? 'block' : 'none';
}

function filterPayoutVendorSuggest(query) {
  const list = document.getElementById('payoutVendorSuggestList');
  if (!list) return;

  const vendors = (state.vendorsData && state.vendorsData.vendors) ? state.vendorsData.vendors : [];
  const q = String(query || '').toLowerCase().trim();

  const filtered = vendors.filter(vObj => {
    const v = vObj.vendor || vObj;
    if (!q) return true;
    return (v.name && v.name.toLowerCase().includes(q)) ||
           (v.stallNo && String(v.stallNo).toLowerCase().includes(q));
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div style="padding: 10px 14px; color: var(--notion-muted); font-size: 0.82rem;">No matching vendors found for "${escapeHtml(q)}".</div>`;
    list.style.display = 'block';
    return;
  }

  list.innerHTML = filtered.map(vObj => {
    const v = vObj.vendor || vObj;
    const bal = Math.round(vObj.balanceToPay || 0);
    const safeName = escapeHtml(v.name).replace(/'/g, "\\'");
    const safeStall = escapeHtml(v.stallNo).replace(/'/g, "\\'");
    return `
      <div 
        style="padding: 9px 12px; cursor: pointer; border-bottom: 1px solid var(--notion-hairline); display: flex; justify-content: space-between; align-items: center; font-size: 0.83rem;"
        onmouseover="this.style.background='var(--notion-surface-warm)'"
        onmouseout="this.style.background='transparent'"
        onclick="selectPayoutVendor('${v.id}', '${safeStall}', '${safeName}')"
      >
        <div>
          <strong>${escapeHtml(v.stallNo)}:</strong> ${escapeHtml(v.name)}
        </div>
        <div style="font-weight: 600; color: ${bal > 0 ? '#E32D14' : '#28a745'};">
          Bal: ${formatINR(bal)}
        </div>
      </div>
    `;
  }).join('');

  list.style.display = 'block';
}

function selectPayoutVendor(vendorId, stallNo, name) {
  const searchInput = document.getElementById('payoutVendorSearchInput');
  const hiddenInput = document.getElementById('payoutVendorSelect');
  const clearBtn = document.getElementById('clearPayoutVendorBtn');
  const list = document.getElementById('payoutVendorSuggestList');

  if (searchInput) searchInput.value = `${stallNo}: ${name}`;
  if (hiddenInput) hiddenInput.value = vendorId;
  if (clearBtn) clearBtn.style.display = 'block';
  if (list) list.style.display = 'none';

  handlePayoutVendorSelect(vendorId);
}

function clearSelectedPayoutVendor() {
  const searchInput = document.getElementById('payoutVendorSearchInput');
  const hiddenInput = document.getElementById('payoutVendorSelect');
  const clearBtn = document.getElementById('clearPayoutVendorBtn');
  const tableArea = document.getElementById('unpaidOrdersTableArea');
  const btn = document.getElementById('btnSubmitPayout');

  if (searchInput) searchInput.value = '';
  if (hiddenInput) hiddenInput.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  if (tableArea) tableArea.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--notion-secondary);">👆 Please select a vendor above to load eligible unpaid orders.</div>`;
  if (btn) btn.disabled = true;

  activeUnpaidOrders = [];
  recalculatePayoutAllocations();
}

let activeUnpaidOrders = [];

// E6: Selection Matrix & Unpaid Orders
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
      recalculatePayoutAllocations();
      return;
    }

    container.innerHTML = `
      <div style="border: 1px solid var(--notion-hairline); border-radius: var(--radius-sm); overflow: hidden;">
        <div style="padding: 8px 12px; background: var(--notion-surface-warm); font-size: 0.8rem; font-weight: 600; color: var(--notion-secondary); display: flex; justify-content: space-between; align-items: center;">
          <span>Unpaid / Partially Paid Orders (${orders.length})</span>
          <span style="font-size: 0.75rem; color: #0075DE;">Click "Select All" or choose individual orders</span>
        </div>
                <div style="max-height: 280px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
            <thead>
              <tr style="background: #fafafa; border-bottom: 1px solid var(--notion-hairline); text-align: left;">
                <th style="padding: 8px 10px; width: 36px; text-align: center;">
                  <input type="checkbox" id="selectAllPayoutOrders" onchange="toggleSelectAllPayoutOrders(this.checked)" title="Select All Unpaid Orders">
                </th>
                <th style="padding: 8px 10px;">Bill copy no.</th>
                <th style="padding: 8px 10px; text-align: right;">Total amount</th>
                <th style="padding: 8px 10px; text-align: right;">Commission</th>
                <th style="padding: 8px 10px; text-align: right;">Payable</th>
                <th style="padding: 8px 10px; text-align: right;">Paid</th>
                <th style="padding: 8px 10px; text-align: right; color: #E32D14;">Outstanding</th>
                <th style="padding: 8px 10px; text-align: right; width: 110px;">Allocate (₹)</th>
                <th style="padding: 8px 10px; text-align: center; width: 55px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map((o, idx) => `
                <tr style="border-bottom: 1px solid var(--notion-hairline);">
                  <td style="padding: 8px 10px; text-align: center;">
                    <input 
                      type="checkbox" 
                      class="order-payout-check" 
                      id="payoutCheck_${idx}" 
                      onchange="handleOrderPayoutCheckChange(${idx}, this.checked)"
                    >
                  </td>
                  <td style="padding: 8px 10px;" title="${escapeHtml(o.systemRef || o.billNo)}">
                    <strong>${escapeHtml(formatBillCopy(o.billCopyDisplay || o.billNo))}</strong>
                    <div style="font-size: 0.7rem; color: var(--notion-muted);">${formatDate(o.createdAt || o.date)}</div>
                  </td>
                  <td style="padding: 8px 10px; text-align: right;">₹${Number(o.grossAmount || o.totalPayable).toLocaleString('en-IN')}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #D97706;">₹${Number(o.commissionAmount || 0).toLocaleString('en-IN')}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 600;">₹${Number(o.totalPayable).toLocaleString('en-IN')}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #28a745;">₹${Number(o.amountPaid || 0).toLocaleString('en-IN')}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #E32D14;">
                    ₹${Number(o.outstandingBalance).toLocaleString('en-IN')}
                  </td>
                  <td style="padding: 8px 10px; text-align: right;">
                    <input type="number" id="allocInput_${idx}" class="form-input" style="width: 100px; height: 30px; text-align: right; font-size: 0.82rem; padding: 2px 6px;"
                      step="0.01" min="0" max="${o.outstandingBalance}" placeholder="0.00"
                      oninput="handleAllocInputTyped(${idx})">
                  </td>
                  <td style="padding: 8px 10px; text-align: center;">
                    <button type="button" class="btn btn-outline btn-xs" onclick="quickFillAllocation(${idx}, ${o.outstandingBalance})" title="Pay full remaining">
                      Full
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot style="background: var(--notion-surface-warm); border-top: 2px solid var(--notion-hairline); font-weight: 700; font-size: 0.8rem;">
              <tr>
                <td colspan="2" style="padding: 8px 10px;" id="payoutFooterSelectionCount">All listed (${orders.length})</td>
                <td style="padding: 8px 10px; text-align: right;" id="payoutFooterGross">₹0.00</td>
                <td style="padding: 8px 10px; text-align: right; color: #D97706;" id="payoutFooterComm">₹0.00</td>
                <td style="padding: 8px 10px; text-align: right;" id="payoutFooterPayable">₹0.00</td>
                <td colspan="2"></td>
                <td style="padding: 8px 10px; text-align: right; color: #1AAE39;" id="payoutFooterAllocated">₹0.00</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div></div>
    `;

    recalculatePayoutAllocations();
  } catch (err) {
    container.innerHTML = `<div style="padding: 14px; color: red;">Failed to load unpaid orders: ${err.message}</div>`;
  }
}

// E6: Checkbox and Selection Matrix Handlers
function toggleSelectAllPayoutOrders(checked) {
  activeUnpaidOrders.forEach((o, idx) => {
    const chk = document.getElementById(`payoutCheck_${idx}`);
    const input = document.getElementById(`allocInput_${idx}`);
    if (chk) chk.checked = checked;
    if (input) input.value = checked ? o.outstandingBalance : '';
  });
  recalculatePayoutAllocations();
}

function handleOrderPayoutCheckChange(idx, checked) {
  const o = activeUnpaidOrders[idx];
  const input = document.getElementById(`allocInput_${idx}`);
  if (input && o) {
    input.value = checked ? o.outstandingBalance : '';
  }
  updateSelectAllCheckboxState();
  recalculatePayoutAllocations();
}

function handleAllocInputTyped(idx) {
  const o = activeUnpaidOrders[idx];
  const input = document.getElementById(`allocInput_${idx}`);
  const chk = document.getElementById(`payoutCheck_${idx}`);
  if (input && o) {
    const val = parseFloat(input.value) || 0;
    if (chk) chk.checked = val > 0;
  }
  updateSelectAllCheckboxState();
  recalculatePayoutAllocations();
}

function updateSelectAllCheckboxState() {
  const selectAll = document.getElementById('selectAllPayoutOrders');
  if (!selectAll || activeUnpaidOrders.length === 0) return;

  let checkedCount = 0;
  activeUnpaidOrders.forEach((_, idx) => {
    const chk = document.getElementById(`payoutCheck_${idx}`);
    if (chk && chk.checked) checkedCount++;
  });

  if (checkedCount === 0) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
  } else if (checkedCount === activeUnpaidOrders.length) {
    selectAll.checked = true;
    selectAll.indeterminate = false;
  } else {
    selectAll.checked = false;
    selectAll.indeterminate = true;
  }
}

function quickFillAllocation(index, balance) {
  const input = document.getElementById(`allocInput_${index}`);
  const chk = document.getElementById(`payoutCheck_${index}`);
  if (input) input.value = balance;
  if (chk) chk.checked = true;
  updateSelectAllCheckboxState();
  recalculatePayoutAllocations();
}

function recalculatePayoutAllocations() {
  let total = 0;
  let count = 0;

  activeUnpaidOrders.forEach((o, idx) => {
    const input = document.getElementById(`allocInput_${idx}`);
    if (input) {
      let val = parseFloat(input.value) || 0;
      if (val > o.outstandingBalance) {
        toast(`Allocation cannot exceed outstanding balance of ₹${o.outstandingBalance} on Bill #${o.billNo}`, 'error');
        val = o.outstandingBalance;
        input.value = val;
      }
      if (val > 0) {
        total += val;
        count++;
      }
    }
  });

  const display = document.getElementById('totalPayoutDisplay');
  if (display) {
    display.textContent = `${formatINR(total)} (${count} Order${count === 1 ? '' : 's'} selected)`;
  }

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
      await renderPayoutManagementView();
    } else {
      toast(data.error || 'Failed to record payout', 'error');
    }
  } catch (err) {
    toast('Error recording payout: ' + err.message, 'error');
  }
}


// =============================================================
// KRISHNA PILLAR 7: AUDIT LOG VIEWER
// =============================================================

async function renderAuditLogView() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  main.innerHTML = `
    <div class="view-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
      <div>
        <h1 class="view-title" style="font-size: 1.6rem; font-weight: 700; color: var(--notion-ink); display: flex; align-items: center; gap: 10px;">
          📜 System Audit Log
        </h1>
        <p class="view-subtitle" style="color: var(--notion-secondary); font-size: 0.88rem; margin-top: 4px;">
          Immutable audit trail of order edits, Super Admin approvals, Shopify push attempts, and payout disbursements.
        </p>
      </div>
      <div>
        <button class="btn btn-outline btn-sm" onclick="exportAuditLogCSV()">
          📥 Export Audit Log CSV
        </button>
      </div>
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
// Team & Access Control Module (Super Admin Portal)
// -------------------------------------------------------------
state.teamUsers = [];
state.allScopes = [];
state.teamSearchQuery = '';
state.teamRoleFilter = 'all';

async function fetchTeamScopes() {
  if (state.allScopes && state.allScopes.length > 0) return state.allScopes;
  try {
    const res = await fetch('/api/auth/scopes');
    const data = await res.json();
    if (data.scopes && Array.isArray(data.scopes)) {
      state.allScopes = data.scopes;
      return data.scopes;
    }
  } catch (e) {
    console.warn('Failed to load scopes:', e);
  }
  return [];
}

async function fetchTeamUsers() {
  try {
    const adminU = state.currentUser || { id: 'usr_1', email: 'admin@halfpe.com' };
    const res = await fetch('/api/users', {
      headers: {
        'x-user-id': adminU.id || 'usr_1',
        'x-user-email': adminU.email || 'admin@halfpe.com'
      }
    });
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data && data.users && Array.isArray(data.users) ? data.users : []);
    state.teamUsers = list;
    return list;
  } catch (e) {
    console.error('Failed to load team users:', e);
  }
  return [];
}

function renderTeamAccessView() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  const canManage = state.currentUser && (state.currentUser.role === 'super_admin' || hasScope('user_management'));
  if (!canManage) {
    main.innerHTML = `
      <div style="padding: 60px 20px; text-align: center; max-width: 600px; margin: 0 auto;">
        <div style="font-size: 3rem; margin-bottom: 16px;">🔒</div>
        <h2 style="font-size: 1.4rem; font-weight: 700; margin-bottom: 8px;">Access Restricted</h2>
        <p style="color: var(--notion-secondary); font-size: 0.95rem; margin-bottom: 24px;">
          Only Super Admin Krishna or authorized team managers have permission to create credentials and manage access scopes.
        </p>
        <button class="btn btn-outline" onclick="switchMainTab('overall')">Return to Overall Settlement</button>
      </div>
    `;
    return;
  }

  main.innerHTML = `
    <div class="team-management-view" style="padding: 24px 32px; max-width: 1400px; margin: 0 auto;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <h1 style="font-size: 1.6rem; font-weight: 700; margin: 0;">👥 Team & Access Control</h1>
            <span class="badge" style="background: var(--notion-primary-tint); color: var(--notion-primary); font-weight: 600; padding: 4px 10px; font-size: 0.78rem;">
              Super Admin Portal
            </span>
          </div>
          <p style="color: var(--notion-secondary); font-size: 0.9rem; margin-top: 6px; max-width: 800px; line-height: 1.5;">
            Create user credentials, generate passwords, assign designations & control granular permission scopes. Newly provisioned credentials activate immediately with 0 delay.
          </p>
        </div>
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-outline" onclick="exportTeamAccessCSV()" style="padding: 10px 14px; font-size: 0.88rem;">
            📥 Export Team CSV
          </button>
          <button class="btn btn-primary" onclick="openCreateUserModal()" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; font-weight: 600; box-shadow: var(--shadow-soft);">
            <span style="font-size: 1.1rem;">➕</span> <span>Create User & Share Access</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="padding: 18px 20px; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); box-shadow: var(--shadow-soft);">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--notion-secondary); font-weight: 600; letter-spacing: 0.04em;">Total User Accounts</div>
          <div id="kpiTeamTotal" style="font-size: 1.8rem; font-weight: 700; color: var(--notion-ink); margin-top: 6px;">-</div>
          <div style="font-size: 0.75rem; color: var(--notion-muted); margin-top: 4px;">Registered on Settlement Engine</div>
        </div>

        <div class="card" style="padding: 18px 20px; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); box-shadow: var(--shadow-soft);">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: #1AAE39; font-weight: 600; letter-spacing: 0.04em;">Active Credentials</div>
          <div id="kpiTeamActive" style="font-size: 1.8rem; font-weight: 700; color: #1AAE39; margin-top: 6px;">-</div>
          <div style="font-size: 0.75rem; color: var(--notion-muted); margin-top: 4px;">Can log in immediately</div>
        </div>

        <div class="card" style="padding: 18px 20px; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); box-shadow: var(--shadow-soft);">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--notion-primary); font-weight: 600; letter-spacing: 0.04em;">Super Admins</div>
          <div id="kpiTeamAdmins" style="font-size: 1.8rem; font-weight: 700; color: var(--notion-primary); margin-top: 6px;">-</div>
          <div style="font-size: 0.75rem; color: var(--notion-muted); margin-top: 4px;">Full system authority</div>
        </div>

        <div class="card" style="padding: 18px 20px; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); box-shadow: var(--shadow-soft);">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: #E89D01; font-weight: 600; letter-spacing: 0.04em;">Scoped Staff & Vendors</div>
          <div id="kpiTeamScoped" style="font-size: 1.8rem; font-weight: 700; color: #E89D01; margin-top: 6px;">-</div>
          <div style="font-size: 0.75rem; color: var(--notion-muted); margin-top: 4px;">Role-restricted scopes</div>
        </div>
      </div>

      <!-- Search & Filters Toolbar -->
      <div style="background: #fff; border: 1px solid var(--notion-hairline); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; box-shadow: var(--shadow-soft);">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; max-width: 420px; min-width: 260px;">
          <span style="font-size: 1rem; opacity: 0.6;">🔍</span>
          <input type="text" id="teamSearchInput" class="form-input" placeholder="Search by name, email, designation..." 
            value="${escapeHtml(state.teamSearchQuery)}"
            oninput="handleTeamSearch(this.value)" 
            style="margin: 0; width: 100%; font-size: 0.88rem; padding: 8px 12px;" />
        </div>

        <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;" id="teamRoleFilterGroup">
          <span style="font-size: 0.78rem; color: var(--notion-secondary); margin-right: 4px;">Filter:</span>
          <button class="btn btn-xs ${state.teamRoleFilter === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="setTeamRoleFilter('all')">All</button>
          <button class="btn btn-xs ${state.teamRoleFilter === 'super_admin' ? 'btn-primary' : 'btn-outline'}" onclick="setTeamRoleFilter('super_admin')">Super Admin</button>
          <button class="btn btn-xs ${state.teamRoleFilter === 'finance' ? 'btn-primary' : 'btn-outline'}" onclick="setTeamRoleFilter('finance')">Finance</button>
          <button class="btn btn-xs ${state.teamRoleFilter === 'billing_staff' ? 'btn-primary' : 'btn-outline'}" onclick="setTeamRoleFilter('billing_staff')">Billing Staff</button>
          <button class="btn btn-xs ${state.teamRoleFilter === 'vendor' ? 'btn-primary' : 'btn-outline'}" onclick="setTeamRoleFilter('vendor')">Vendor Stalls</button>
        </div>
      </div>

      <!-- Table Container -->
      <div id="teamTableContainer">
        <div style="text-align: center; padding: 40px; color: var(--notion-secondary);">⏳ Loading team members & credentials...</div>
      </div>
    </div>
  `;

  loadAndRenderTeamTable();
}

async function loadAndRenderTeamTable() {
  const container = document.getElementById('teamTableContainer');
  if (!container) return;

  const [users, scopes] = await Promise.all([fetchTeamUsers(), fetchTeamScopes()]);

  // Update KPIs
  const totalCount = users.length;
  const activeCount = users.filter(u => u.active !== false).length;
  const adminCount = users.filter(u => u.role === 'super_admin').length;
  const scopedCount = totalCount - adminCount;

  const kpiTotal = document.getElementById('kpiTeamTotal');
  const kpiActive = document.getElementById('kpiTeamActive');
  const kpiAdmins = document.getElementById('kpiTeamAdmins');
  const kpiScoped = document.getElementById('kpiTeamScoped');
  if (kpiTotal) kpiTotal.textContent = totalCount;
  if (kpiActive) kpiActive.textContent = activeCount;
  if (kpiAdmins) kpiAdmins.textContent = adminCount;
  if (kpiScoped) kpiScoped.textContent = scopedCount;

  // Filter users
  let filtered = [...users];
  if (state.teamRoleFilter !== 'all') {
    filtered = filtered.filter(u => u.role === state.teamRoleFilter);
  }
  if (state.teamSearchQuery && state.teamSearchQuery.trim()) {
    const q = state.teamSearchQuery.toLowerCase().trim();
    filtered = filtered.filter(u => 
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.designation && u.designation.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="card" style="padding: 40px; text-align: center; background: #fff; border: 1px solid var(--notion-hairline); border-radius: var(--radius-md);">
        <div style="font-size: 2rem; margin-bottom: 10px;">🔍</div>
        <div style="font-weight: 600; font-size: 1rem; color: var(--notion-ink);">No matching users found</div>
        <div style="color: var(--notion-secondary); font-size: 0.85rem; margin-top: 4px;">Try adjusting your search query or role filter.</div>
      </div>
    `;
    return;
  }

  const scopeMap = {};
  scopes.forEach(s => { scopeMap[s.id] = s.label; });

  container.innerHTML = `
    <div class="table-card" style="background: #fff; border-radius: var(--radius-md); border: 1px solid var(--notion-hairline); overflow: hidden; box-shadow: var(--shadow-soft);">
      <div style="overflow-x: auto;">
        <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="background: var(--notion-surface-warm); border-bottom: 1px solid var(--notion-hairline); text-align: left;">
              <th style="padding: 12px 16px; font-weight: 600; color: var(--notion-secondary); font-size: 0.75rem; text-transform: uppercase;">User & Credentials</th>
              <th style="padding: 12px 16px; font-weight: 600; color: var(--notion-secondary); font-size: 0.75rem; text-transform: uppercase;">Designation</th>
              <th style="padding: 12px 16px; font-weight: 600; color: var(--notion-secondary); font-size: 0.75rem; text-transform: uppercase;">Role</th>
              <th style="padding: 12px 16px; font-weight: 600; color: var(--notion-secondary); font-size: 0.75rem; text-transform: uppercase;">Granted Permissions (Scopes)</th>
              <th style="padding: 12px 16px; font-weight: 600; color: var(--notion-secondary); font-size: 0.75rem; text-transform: uppercase; text-align: center;">Status</th>
              <th style="padding: 12px 16px; font-weight: 600; color: var(--notion-secondary); font-size: 0.75rem; text-transform: uppercase; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(u => {
              const initial = (u.name || 'U').trim().charAt(0).toUpperCase();
              const isSuper = u.role === 'super_admin';
              const isActive = u.active !== false;
              const scopesList = u.scopes || [];

              return `
                <tr style="border-bottom: 1px solid var(--notion-hairline-subtle); ${!isActive ? 'opacity: 0.6; background: rgba(0,0,0,0.01);' : ''}">
                  <!-- User & Credentials -->
                  <td style="padding: 12px 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div class="user-avatar-circle" style="width: 38px; height: 38px; font-size: 1rem; flex-shrink: 0; background: ${isSuper ? 'var(--notion-primary-tint)' : 'var(--notion-surface-warm)'}; color: ${isSuper ? 'var(--notion-primary)' : 'var(--notion-ink)'}; border: 1px solid var(--notion-hairline);">
                        ${initial}
                      </div>
                      <div>
                        <div style="font-weight: 600; font-size: 0.92rem; color: var(--notion-ink);">
                          ${escapeHtml(u.name)}
                          ${isSuper ? '<span style="font-size: 0.7rem; margin-left: 4px;" title="Super Administrator">👑</span>' : ''}
                        </div>
                        <div style="color: var(--notion-secondary); font-size: 0.8rem; font-family: var(--font-mono);">
                          ${escapeHtml(u.email)}
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Designation -->
                  <td style="padding: 12px 16px;">
                    <div style="font-weight: 600; color: var(--notion-ink); font-size: 0.88rem;">
                      ${escapeHtml(u.designation || 'Staff Member')}
                    </div>
                    ${u.vendorId ? `<div style="font-size: 0.75rem; color: var(--notion-secondary);">Stall: ${escapeHtml(u.vendorId)}</div>` : ''}
                  </td>

                  <!-- Role -->
                  <td style="padding: 12px 16px;">
                    <span class="badge" style="font-size: 0.72rem; padding: 3px 8px; font-weight: 600; ${
                      isSuper ? 'background: #e6f3fe; color: #0075DE;' :
                      u.role === 'finance' ? 'background: #fdf2e9; color: #d35400;' :
                      u.role === 'billing_staff' ? 'background: #e8f5e9; color: #2e7d32;' :
                      u.role === 'vendor' ? 'background: #f3e8fd; color: #7c3aed;' :
                      'background: var(--notion-surface-warm); color: var(--notion-secondary);'
                    }">
                      ${(u.role || 'Staff').replace('_', ' ').toUpperCase()}
                    </span>
                  </td>

                  <!-- Granted Scopes -->
                  <td style="padding: 12px 16px; max-width: 380px;">
                    ${isSuper ? `
                      <span class="badge" style="background: #e8f5e9; color: #2e7d32; font-size: 0.75rem; padding: 4px 8px; font-weight: 600;">
                        🌟 All Permissions Granted (Full Access)
                      </span>
                    ` : (
                      scopesList.length > 0 ? `
                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                          ${scopesList.map(sId => `
                            <span class="badge" style="font-size: 0.7rem; padding: 2px 6px; background: rgba(0, 117, 222, 0.08); color: var(--notion-primary); font-weight: 500;">
                              ${escapeHtml(scopeMap[sId] || sId)}
                            </span>
                          `).join('')}
                        </div>
                      ` : `
                        <span style="font-size: 0.75rem; color: var(--notion-muted); font-style: italic;">No scopes assigned</span>
                      `
                    )}
                  </td>

                  <!-- Status -->
                  <td style="padding: 12px 16px; text-align: center;">
                    <span class="badge" style="font-size: 0.75rem; padding: 3px 10px; font-weight: 600; ${isActive ? 'background: #e8f5e9; color: #2e7d32;' : 'background: #fde8e8; color: #c81e1e;'}">
                      ${isActive ? '✅ Active' : '⛔ Suspended'}
                    </span>
                  </td>

                  <!-- Actions -->
                  <td style="padding: 12px 16px; text-align: right; white-space: nowrap;">
                    <div style="display: inline-flex; gap: 6px; align-items: center;">
                      <button class="btn btn-outline btn-xs" onclick="openEditUserModal('${u.id}')" title="Edit Scopes & Designation">
                        ✏️ Edit
                      </button>
                      <button class="btn btn-outline btn-xs" onclick="openChangePasswordModal('${u.id}')" title="Set New Password">
                        🔑 Password
                      </button>
                      ${u.id !== 'usr_1' ? `
                        <button class="btn btn-xs ${isActive ? 'btn-danger-outline' : 'btn-primary'}" 
                          onclick="toggleUserActiveStatus('${u.id}', ${isActive})" 
                          title="${isActive ? 'Suspend User Access' : 'Activate User Access'}">
                          ${isActive ? 'Suspend' : 'Activate'}
                        </button>
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
}

function handleTeamSearch(val) {
  state.teamSearchQuery = val || '';
  loadAndRenderTeamTable();
}

function setTeamRoleFilter(role) {
  state.teamRoleFilter = role || 'all';
  const group = document.getElementById('teamRoleFilterGroup');
  if (group) {
    group.querySelectorAll('button').forEach(btn => {
      btn.className = 'btn btn-xs btn-outline';
    });
    const activeBtn = group.querySelector(`[onclick="setTeamRoleFilter('${role}')"]`);
    if (activeBtn) activeBtn.className = 'btn btn-xs btn-primary';
  }
  loadAndRenderTeamTable();
}

// -------------------------------------------------------------
// Create User Modal (Krishna provisions credentials & scopes)
// -------------------------------------------------------------
async function openCreateUserModal() {
  const container = document.getElementById('modalContainer');
  if (!container) return;

  const scopes = await fetchTeamScopes();
  const vendors = (state.vendorsData && state.vendorsData.vendors) ? state.vendorsData.vendors : [];

  // Generate suggested strong password
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const defaultPass = `HalfPe@${randNum}`;

  container.innerHTML = `
    <div class="modal-dialog" style="max-width: 680px; max-height: 90vh; display: flex; flex-direction: column;">
      <div class="modal-header">
        <div>
          <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <span>➕</span> <span>Create User & Share Access</span>
          </h3>
          <p style="font-size: 0.8rem; color: var(--notion-secondary); margin-top: 2px;">
            Super Admin Portal: Setup login credentials, assign designation, and select custom scopes.
          </p>
        </div>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>

      <form onsubmit="submitCreateUser(event)" style="display: flex; flex-direction: column; overflow-y: auto; flex: 1;">
        <div class="modal-body" style="padding: 20px 24px;">

          <!-- Row 1: Name & Designation -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Full Name</label>
              <input type="text" id="newUserName" class="form-input" placeholder="e.g. Siddhartha Sharma" required />
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Designation / Job Title</label>
              <input type="text" id="newUserDesignation" class="form-input" placeholder="e.g. Operations Manager" required />
            </div>
          </div>

          <!-- Row 2: Email & Password -->
          <div style="display: grid; grid-template-columns: 1.1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Email ID (Login Username)</label>
              <input type="email" id="newUserEmail" class="form-input" placeholder="e.g. user@halfpe.com" required autocomplete="off" />
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label required" style="display: flex; justify-content: space-between;">
                <span>Set Password</span>
                <span style="font-size: 0.72rem; color: var(--notion-primary); cursor: pointer;" onclick="document.getElementById('newUserPassword').value = 'HalfPe@' + Math.floor(1000 + Math.random() * 9000)">🎲 New Random</span>
              </label>
              <div style="position: relative;">
                <input type="text" id="newUserPassword" class="form-input" value="${defaultPass}" required style="font-family: var(--font-mono); padding-right: 36px;" />
              </div>
            </div>
          </div>

          <!-- Row 3: Role Preset & Optional Vendor -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; background: rgba(0,0,0,0.02); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--notion-hairline);">
            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Role Template Preset</label>
              <select id="newUserRole" class="form-select" onchange="handleRoleTemplateChange(this.value)" required>
                <option value="custom">🛠️ Custom Access (Pick Scopes Below)</option>
                <option value="super_admin">👑 Super Admin (Full Access to Everything)</option>
                <option value="finance">💼 Finance & Accounts (Settlement + Payouts + Reports)</option>
                <option value="billing_staff">🧾 Billing Staff (Orders + POS Simulation)</option>
                <option value="auditor">📜 Auditor (Read-only Settlement + Audit Logs)</option>
                <option value="vendor">🏪 Vendor Stall (Stall-isolated View)</option>
              </select>
            </div>
            <div class="form-group" id="newUserVendorWrap" style="margin: 0; display: none;">
              <label class="form-label">Linked Vendor Stall</label>
              <select id="newUserVendorId" class="form-select">
                <option value="">-- Select Vendor Stall --</option>
                ${vendors.map(v => `<option value="${v.vendorId}">${escapeHtml(v.vendorName)} (${v.stallNumber || v.vendorId})</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Section: Granular Permissions (Scopes) -->
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <label class="form-label" style="margin: 0; font-weight: 700; font-size: 0.9rem; color: var(--notion-ink);">
                🛡️ Granular Permissions & Scopes Checklist
              </label>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-xs btn-outline" onclick="toggleAllScopesCheckboxes(true)">Select All</button>
                <button type="button" class="btn btn-xs btn-outline" onclick="toggleAllScopesCheckboxes(false)">Clear All</button>
              </div>
            </div>
            <span class="form-helper" style="display: block; margin-bottom: 12px;">
              Only the selected modules will be visible in the navigation and accessible to this user upon logging in.
            </span>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-height: 240px; overflow-y: auto; padding: 4px;">
              ${scopes.map(s => `
                <label style="display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; background: #fff; border: 1px solid var(--notion-hairline); border-radius: 6px; cursor: pointer; transition: all 0.15s ease;" class="scope-checkbox-label">
                  <input type="checkbox" name="userScopeCheckbox" value="${s.id}" style="margin-top: 3px; accent-color: var(--notion-primary);" />
                  <div>
                    <div style="font-weight: 600; font-size: 0.82rem; color: var(--notion-ink);">${escapeHtml(s.label)}</div>
                    <div style="font-size: 0.72rem; color: var(--notion-secondary); line-height: 1.3;">${escapeHtml(s.desc)}</div>
                  </div>
                </label>
              `).join('')}
            </div>
          </div>

        </div>

        <div class="modal-footer" style="background: var(--notion-surface-warm); border-top: 1px solid var(--notion-hairline); padding: 14px 24px; display: flex; justify-content: space-between; align-items: center;">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
            <span>🚀</span> <strong>Create User & Activate Immediately</strong>
          </button>
        </div>
      </form>
    </div>
  `;

  container.classList.remove('hidden');
}

function handleRoleTemplateChange(role) {
  const vendorWrap = document.getElementById('newUserVendorWrap');
  if (vendorWrap) {
    vendorWrap.style.display = role === 'vendor' ? 'block' : 'none';
  }

  const roleScopeMap = {
    super_admin: ['overall_settlement', 'vendor_wise', 'orders_management', 'orders_approval', 'vendor_management', 'payout_management', 'audit_log', 'user_management', 'export_reports', 'simulate_orders'],
    finance: ['overall_settlement', 'vendor_wise', 'payout_management', 'audit_log', 'export_reports'],
    billing_staff: ['orders_management', 'simulate_orders'],
    auditor: ['overall_settlement', 'vendor_wise', 'audit_log', 'export_reports'],
    vendor: ['vendor_wise']
  };

  const targetScopes = roleScopeMap[role];
  if (targetScopes) {
    document.querySelectorAll('input[name="userScopeCheckbox"]').forEach(cb => {
      cb.checked = targetScopes.includes(cb.value);
    });
  }
}

function toggleAllScopesCheckboxes(check) {
  document.querySelectorAll('input[name="userScopeCheckbox"]').forEach(cb => {
    cb.checked = check;
  });
}

async function submitCreateUser(e) {
  e.preventDefault();
  const name = document.getElementById('newUserName').value.trim();
  const designation = document.getElementById('newUserDesignation').value.trim();
  const email = document.getElementById('newUserEmail').value.trim();
  const password = document.getElementById('newUserPassword').value.trim();
  const role = document.getElementById('newUserRole').value;
  const vendorId = document.getElementById('newUserVendorId') ? document.getElementById('newUserVendorId').value : null;

  const checkedScopes = Array.from(document.querySelectorAll('input[name="userScopeCheckbox"]:checked')).map(cb => cb.value);

  if (!email || !password || !name) {
    alert('Please fill out Name, Email, and Password.');
    return;
  }

  try {
    const adminU = state.currentUser || { id: 'usr_1', email: 'admin@halfpe.com' };
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': adminU.id || 'usr_1',
        'x-user-email': adminU.email || 'admin@halfpe.com'
      },
      body: JSON.stringify({
        adminUserId: adminU.id || 'usr_1',
        adminUserEmail: adminU.email || 'admin@halfpe.com',
        name,
        designation,
        email,
        password,
        role: role === 'custom' ? 'staff' : role,
        scopes: checkedScopes,
        vendorId
      })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      alert(data.error || 'Failed to create user');
      return;
    }

    toast(`✓ User ${name} created successfully!`, 'success');

    // Show credential share dialog
    openCredentialShareDialog({
      name,
      email,
      password,
      designation,
      role: role.toUpperCase(),
      scopesCount: checkedScopes.length
    });

    await loadAndRenderTeamTable();
  } catch (err) {
    toast('Error creating user: ' + err.message, 'error');
  }
}

function openCredentialShareDialog({ name, email, password, designation, role, scopesCount }) {
  const container = document.getElementById('modalContainer');
  if (!container) return;

  const loginUrl = window.location.origin;
  const copyText = `HalfPe Settlement Portal Access
---------------------------------
Name: ${name}
Designation: ${designation}
Role: ${role}
Email: ${email}
Password: ${password}
Login URL: ${loginUrl}
Scopes: ${scopesCount} active permissions`;

  container.innerHTML = `
    <div class="modal-dialog" style="max-width: 520px;">
      <div class="modal-header" style="background: #e8f5e9;">
        <div>
          <h3 class="modal-title" style="color: #2e7d32; display: flex; align-items: center; gap: 8px;">
            <span>✅</span> <span>Credentials Created & Active</span>
          </h3>
          <p style="font-size: 0.8rem; color: #1b5e20; margin-top: 2px;">
            User account is live immediately! Copy and share these credentials with the team member.
          </p>
        </div>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>

      <div class="modal-body" style="padding: 20px 24px;">
        <div style="background: var(--notion-surface-warm); border: 1px solid var(--notion-hairline); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 0.75rem; color: var(--notion-secondary); text-transform: uppercase;">User Name:</span>
            <strong style="font-size: 0.88rem; color: var(--notion-ink);">${escapeHtml(name)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 0.75rem; color: var(--notion-secondary); text-transform: uppercase;">Designation:</span>
            <strong style="font-size: 0.88rem; color: var(--notion-primary);">${escapeHtml(designation)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 0.75rem; color: var(--notion-secondary); text-transform: uppercase;">Email / Username:</span>
            <code style="font-size: 0.88rem; color: #0075DE; font-weight: 700;">${escapeHtml(email)}</code>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 0.75rem; color: var(--notion-secondary); text-transform: uppercase;">Password:</span>
            <code style="font-size: 0.95rem; color: #1AAE39; font-weight: 700; background: #fff; padding: 2px 8px; border-radius: 4px; border: 1px solid var(--notion-hairline);">${escapeHtml(password)}</code>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 0.75rem; color: var(--notion-secondary); text-transform: uppercase;">Login URL:</span>
            <span style="font-size: 0.8rem; color: var(--notion-secondary);">${loginUrl}</span>
          </div>
        </div>

        <button class="btn btn-primary btn-block" style="padding: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="copyTextToClipboard(\`${escapeHtml(copyText)}\`)">
          <span>📋</span> <span>Copy Full Credentials to Clipboard</span>
        </button>
      </div>

      <div class="modal-footer" style="padding: 12px 24px;">
        <button type="button" class="btn btn-outline btn-block" onclick="closeModal()">Done</button>
      </div>
    </div>
  `;

  container.classList.remove('hidden');
}

// -------------------------------------------------------------
// Edit User Modal (Edit designation, role, & granular scopes)
// -------------------------------------------------------------
async function openEditUserModal(userId) {
  const user = (state.teamUsers || []).find(u => u.id === userId);
  if (!user) {
    toast('User not found', 'error');
    return;
  }

  const container = document.getElementById('modalContainer');
  if (!container) return;

  const scopes = await fetchTeamScopes();
  const vendors = (state.vendorsData && state.vendorsData.vendors) ? state.vendorsData.vendors : [];
  const userScopes = user.scopes || [];

  container.innerHTML = `
    <div class="modal-dialog" style="max-width: 680px; max-height: 90vh; display: flex; flex-direction: column;">
      <div class="modal-header">
        <div>
          <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <span>✏️</span> <span>Edit User: ${escapeHtml(user.name)}</span>
          </h3>
          <p style="font-size: 0.8rem; color: var(--notion-secondary); margin-top: 2px;">
            Update designation, role, or granular access scopes.
          </p>
        </div>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>

      <form onsubmit="submitEditUser(event, '${user.id}')" style="display: flex; flex-direction: column; overflow-y: auto; flex: 1;">
        <div class="modal-body" style="padding: 20px 24px;">

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Full Name</label>
              <input type="text" id="editUserName" class="form-input" value="${escapeHtml(user.name)}" required />
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Designation / Job Title</label>
              <input type="text" id="editUserDesignation" class="form-input" value="${escapeHtml(user.designation || '')}" placeholder="e.g. Finance Head" required />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Email Address (Read-only)</label>
              <input type="email" class="form-input" value="${escapeHtml(user.email)}" disabled style="background: rgba(0,0,0,0.03); color: var(--notion-secondary);" />
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Assigned Role</label>
              <select id="editUserRole" class="form-select" onchange="handleEditRoleChange(this.value)">
                <option value="super_admin" ${user.role === 'super_admin' ? 'selected' : ''}>👑 Super Admin</option>
                <option value="finance" ${user.role === 'finance' ? 'selected' : ''}>💼 Finance & Accounts</option>
                <option value="billing_staff" ${user.role === 'billing_staff' ? 'selected' : ''}>🧾 Billing Staff</option>
                <option value="auditor" ${user.role === 'auditor' ? 'selected' : ''}>📜 Auditor</option>
                <option value="vendor" ${user.role === 'vendor' ? 'selected' : ''}>🏪 Vendor Stall</option>
                <option value="staff" ${(!['super_admin','finance','billing_staff','auditor','vendor'].includes(user.role)) ? 'selected' : ''}>🛠️ Custom Scoped Staff</option>
              </select>
            </div>
          </div>

          <!-- Section: Granular Permissions Checklist -->
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <label class="form-label" style="margin: 0; font-weight: 700; font-size: 0.9rem; color: var(--notion-ink);">
                🛡️ Assigned Scopes Checklist
              </label>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-xs btn-outline" onclick="toggleAllEditScopes(true)">Select All</button>
                <button type="button" class="btn btn-xs btn-outline" onclick="toggleAllEditScopes(false)">Clear All</button>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-height: 240px; overflow-y: auto; padding: 4px;">
              ${scopes.map(s => {
                const checked = user.role === 'super_admin' || userScopes.includes(s.id);
                return `
                  <label style="display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; background: #fff; border: 1px solid var(--notion-hairline); border-radius: 6px; cursor: pointer;">
                    <input type="checkbox" name="editUserScopeCheckbox" value="${s.id}" ${checked ? 'checked' : ''} style="margin-top: 3px; accent-color: var(--notion-primary);" />
                    <div>
                      <div style="font-weight: 600; font-size: 0.82rem; color: var(--notion-ink);">${escapeHtml(s.label)}</div>
                      <div style="font-size: 0.72rem; color: var(--notion-secondary); line-height: 1.3;">${escapeHtml(s.desc)}</div>
                    </div>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

        </div>

        <div class="modal-footer" style="background: var(--notion-surface-warm); border-top: 1px solid var(--notion-hairline); padding: 14px 24px; display: flex; justify-content: space-between; align-items: center;">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  `;

  container.classList.remove('hidden');
}

function toggleAllEditScopes(check) {
  document.querySelectorAll('input[name="editUserScopeCheckbox"]').forEach(cb => {
    cb.checked = check;
  });
}

function handleEditRoleChange(role) {
  if (role === 'super_admin') {
    toggleAllEditScopes(true);
  }
}

async function submitEditUser(e, userId) {
  e.preventDefault();
  const name = document.getElementById('editUserName').value.trim();
  const designation = document.getElementById('editUserDesignation').value.trim();
  const role = document.getElementById('editUserRole').value;
  const checkedScopes = Array.from(document.querySelectorAll('input[name="editUserScopeCheckbox"]:checked')).map(cb => cb.value);

  try {
    const adminU = state.currentUser || { id: 'usr_1', email: 'admin@halfpe.com' };
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': adminU.id || 'usr_1',
        'x-user-email': adminU.email || 'admin@halfpe.com'
      },
      body: JSON.stringify({
        adminUserId: adminU.id || 'usr_1',
        adminUserEmail: adminU.email || 'admin@halfpe.com',
        name,
        designation,
        role,
        scopes: checkedScopes
      })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      alert(data.error || 'Failed to update user');
      return;
    }

    toast('User permissions and designation updated successfully!', 'success');
    closeModal();

    // If current user was edited, update local state
    if (state.currentUser && state.currentUser.id === userId) {
      state.currentUser = data.user;
      try {
        localStorage.setItem('hp_session_user', JSON.stringify(data.user));
      } catch (e) {}
      updateUserChipUI();
      updateNavigationVisibility();
    }

    await loadAndRenderTeamTable();
  } catch (err) {
    toast('Error updating user: ' + err.message, 'error');
  }
}

// -------------------------------------------------------------
// Change / Reset Password Modal
// -------------------------------------------------------------
function openChangePasswordModal(userId) {
  const user = (state.teamUsers || []).find(u => u.id === userId);
  if (!user) {
    toast('User not found', 'error');
    return;
  }

  const container = document.getElementById('modalContainer');
  if (!container) return;

  const randNum = Math.floor(1000 + Math.random() * 9000);
  const defaultPass = `HalfPe@${randNum}`;

  container.innerHTML = `
    <div class="modal-dialog" style="max-width: 440px;">
      <div class="modal-header">
        <div>
          <h3 class="modal-title">🔑 Set New Password</h3>
          <p style="font-size: 0.8rem; color: var(--notion-secondary); margin-top: 2px;">
            User: <strong>${escapeHtml(user.name)}</strong> (${escapeHtml(user.email)})
          </p>
        </div>
        <button class="modal-close-btn" onclick="closeModal()">×</button>
      </div>

      <form onsubmit="submitChangePassword(event, '${user.id}')">
        <div class="modal-body" style="padding: 20px 24px;">
          <div class="form-group">
            <label class="form-label required" style="display: flex; justify-content: space-between;">
              <span>New Password</span>
              <span style="font-size: 0.72rem; color: var(--notion-primary); cursor: pointer;" onclick="document.getElementById('resetNewPassword').value = 'HalfPe@' + Math.floor(1000 + Math.random() * 9000)">🎲 Random</span>
            </label>
            <input type="text" id="resetNewPassword" class="form-input" value="${defaultPass}" required style="font-family: var(--font-mono); font-size: 1rem;" />
            <span class="form-helper">The new password will be immediately active for this user account.</span>
          </div>
        </div>

        <div class="modal-footer" style="padding: 14px 24px; display: flex; justify-content: space-between;">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Update Password Now</button>
        </div>
      </form>
    </div>
  `;

  container.classList.remove('hidden');
}

async function submitChangePassword(e, userId) {
  e.preventDefault();
  const password = document.getElementById('resetNewPassword').value.trim();
  if (!password) {
    alert('Please provide a password.');
    return;
  }

  try {
    const adminU = state.currentUser || { id: 'usr_1', email: 'admin@halfpe.com' };
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': adminU.id || 'usr_1',
        'x-user-email': adminU.email || 'admin@halfpe.com'
      },
      body: JSON.stringify({
        adminUserId: adminU.id || 'usr_1',
        adminUserEmail: adminU.email || 'admin@halfpe.com',
        password
      })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      alert(data.error || 'Failed to update password');
      return;
    }

    toast('Password changed! New credentials are live immediately.', 'success');
    closeModal();
    await loadAndRenderTeamTable();
  } catch (err) {
    toast('Error updating password: ' + err.message, 'error');
  }
}

// -------------------------------------------------------------
// Toggle User Active / Suspended
// -------------------------------------------------------------
async function toggleUserActiveStatus(userId, currentActive) {
  if (userId === 'usr_1') {
    alert('Primary Super Admin Krishna cannot be suspended.');
    return;
  }
  if (state.currentUser && state.currentUser.id === userId) {
    alert('You cannot suspend your own active login session.');
    return;
  }

  const action = currentActive ? 'suspend' : 'activate';
  if (!confirm(`Are you sure you want to ${action} this user account?`)) {
    return;
  }

  try {
    const adminU = state.currentUser || { id: 'usr_1', email: 'admin@halfpe.com' };
    const res = await fetch(`/api/users/${userId}/toggle-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': adminU.id || 'usr_1',
        'x-user-email': adminU.email || 'admin@halfpe.com'
      },
      body: JSON.stringify({
        adminUserId: adminU.id || 'usr_1',
        adminUserEmail: adminU.email || 'admin@halfpe.com',
        active: !currentActive
      })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      alert(data.error || `Failed to ${action} user`);
      return;
    }

    toast(`User account ${!currentActive ? 'activated' : 'suspended'} successfully!`, 'success');
    await loadAndRenderTeamTable();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}

function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      toast('✓ Credentials copied to clipboard!', 'success');
    }).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    toast('✓ Credentials copied to clipboard!', 'success');
  } catch (e) {
    toast('Failed to auto-copy. Please copy manually.', 'error');
  }
  document.body.removeChild(ta);
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

// -------------------------------------------------------------
// Universal Export Engine & Dropdown Handler (BUG-23)
// -------------------------------------------------------------
function toggleExportDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('exportDropdownMenu');
  if (!menu) return;
  const isHidden = menu.style.display === 'none';
  menu.style.display = isHidden ? 'block' : 'none';
  
  if (isHidden) {
    const closeHandler = (evt) => {
      const wrap = document.getElementById('navExportDropdownWrap');
      if (wrap && !wrap.contains(evt.target)) {
        menu.style.display = 'none';
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
  }
}
window.toggleExportDropdown = toggleExportDropdown;

async function triggerUniversalExport(dataset, format = 'csv') {
  const menu = document.getElementById('exportDropdownMenu');
  if (menu) menu.style.display = 'none';

  try {
    toast(`Preparing ${dataset} export in ${format.toUpperCase()}...`, 'info');
    const params = new URLSearchParams({
      format,
      cityId: state.currentCityId || 'VIJ'
    });
    if (state.startDate) params.append('startDate', state.startDate);
    if (state.endDate) params.append('endDate', state.endDate);
    if (state.selectedGlobalVendor && state.selectedGlobalVendor !== 'all') {
      params.append('vendorId', state.selectedGlobalVendor);
    }

    const res = await fetch(`/api/export/${dataset}?${params.toString()}`, {
      headers: { 'x-city-id': state.currentCityId || 'VIJ' }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(err.error || 'Server rejected export request');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    a.download = match ? match[1] : `${dataset}_${state.currentCityId || 'VIJ'}.${format === 'xlsx' ? 'csv' : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast(`✓ ${dataset} export downloaded successfully!`, 'success');
  } catch (err) {
    console.error('Universal export error:', err);
    toast(`Export error: ${err.message}`, 'error');
  }
}
window.triggerUniversalExport = triggerUniversalExport;

