/**
 * Shopify Admin API Client for HalfPe Dashboard
 * 
 * Fetches orders from Shopify Admin API and maps them to 
 * Vijayawada event vendors for settlement calculations.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

class ShopifyClient {
  constructor({ storeUrl, accessToken, apiVersion }) {
    this.storeUrl = (storeUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.accessToken = accessToken || '';
    this.apiVersion = apiVersion || '2024-01';
    this.baseUrl = `https://${this.storeUrl}/admin/api/${this.apiVersion}`;
  }

  isConfigured() {
    return !!(
      this.storeUrl &&
      this.accessToken &&
      this.accessToken !== 'shpat_PASTE_YOUR_TOKEN_HERE' &&
      this.accessToken.length > 10
    );
  }

  /**
   * Loads all master vendors from page.vijaywada-s-event.json + event stalls
   */
  static loadVijayawadaVendorsMaster(templatePath) {
    const localPath = path.resolve(__dirname, 'vijaywada-event-template.json');
    const defaultPath = fs.existsSync(localPath) ? localPath : path.resolve(__dirname, '../../templates/page.vijaywada-s-event.json');
    const filePath = templatePath || defaultPath;
    let templateVendors = [];
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const cleanJson = raw.replace(/\/\*[\s\S]*?\*\//g, '');
        const parsed = JSON.parse(cleanJson);
        const blocks = (parsed.sections && parsed.sections.main && parsed.sections.main.blocks) || {};
        templateVendors = Object.values(blocks)
          .filter(b => b.type === 'stall' && b.settings && b.settings.vendor_name)
          .map(b => ({
            stall_no: b.settings.stall_no || 'TBD',
            vendor_name: b.settings.vendor_name.trim(),
            vendor_code: b.settings.vendor_code ? b.settings.vendor_code.trim() : b.settings.vendor_name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase(),
            category: b.settings.category || 'Retail'
          }));
      }
    } catch (e) {
      console.warn('[ShopifyClient] Could not read template JSON:', e.message);
    }

    // Additional live event vendors verified at SVN Conventions
    const extraVendors = [
      { stall_no: '73 & 74', vendor_name: 'Raza Silk estate', vendor_code: 'RSE', category: 'Silk Sarees' },
      { stall_no: '75', vendor_name: 'Satyabhama Studio', vendor_code: 'SBS', category: 'Designer Studio' },
      { stall_no: '76', vendor_name: 'STYLO14(Pranivsha)', vendor_code: 'STY14', category: 'Clothing' },
      { stall_no: '77', vendor_name: 'Kashmir goodwill', vendor_code: 'KGW', category: 'Shawls & Carpets' },
      { stall_no: '78', vendor_name: 'Lavanyatrendycollection', vendor_code: 'LTC', category: 'Clothing' },
      { stall_no: '79', vendor_name: 'Kalamkari Mandiram', vendor_code: 'KKM', category: 'Handlooms' },
      { stall_no: '85', vendor_name: 'Bansals ST 85', vendor_code: 'BS85', category: 'Clothing' },
      { stall_no: '87', vendor_name: 'PRUDHVI INNOVATIONS ST 87', vendor_code: 'PI87', category: 'Innovations' },
      { stall_no: '88', vendor_name: 'RBS fashion factory ST88', vendor_code: 'RBS88', category: 'Fashion' },
      { stall_no: '23', vendor_name: 'Srinidhi silks ST 23', vendor_code: 'SS23', category: 'Silks' }
    ];

    const combined = [...templateVendors];
    for (const ev of extraVendors) {
      if (!combined.some(v => v.vendor_name.toLowerCase() === ev.vendor_name.toLowerCase())) {
        combined.push(ev);
      }
    }
    return combined;
  }

  /**
   * Generic GET request to Shopify Admin API
   */
  async get(endpoint, params = {}) {
    const queryString = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve({ data: JSON.parse(data), headers: res.headers, statusCode: res.statusCode });
            } catch (e) {
              reject(new Error(`JSON parse error: ${e.message}`));
            }
          } else if (res.statusCode === 429) {
            // Rate limited — retry after delay
            const retryAfter = parseFloat(res.headers['retry-after'] || '2') * 1000;
            console.warn(`[Shopify] Rate limited. Retrying after ${retryAfter}ms...`);
            setTimeout(() => {
              this.get(endpoint, params).then(resolve).catch(reject);
            }, retryAfter);
          } else {
            reject(new Error(`Shopify API error ${res.statusCode}: ${data.substring(0, 500)}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Shopify API request timeout (30s)'));
      });
      req.end();
    });
  }

  /**
   * Fetch ALL orders with pagination (cursor-based using link header)
   * @param {Object} options
   * @param {string} options.createdAtMin - ISO date (e.g. '2026-10-06T00:00:00+05:30')
   * @param {string} options.createdAtMax - ISO date (optional)
   * @param {string} options.tag - Tag filter (default: 'VIJ-Event')
   * @param {number} options.limit - per-page limit (max 250)
   * @param {string} options.status - 'any', 'open', 'closed', 'cancelled'
   */
  async fetchAllOrders({ createdAtMin, createdAtMax, tag = 'VIJ-Event', limit = 250, status = 'any' } = {}) {
    if (!this.isConfigured()) {
      console.warn('[Shopify] Not configured. Skipping order fetch.');
      return [];
    }

    const allOrders = [];
    let hasMore = true;
    let params = {
      limit,
      status,
      tag: tag || undefined,
      created_at_min: createdAtMin || undefined,
      created_at_max: createdAtMax || undefined,
      fields: 'id,name,created_at,financial_status,gateway,total_price,subtotal_price,customer,phone,note_attributes,line_items,refunds,tags,note'
    };

    let pageCount = 0;
    const MAX_PAGES = 50; // Safety cap

    while (hasMore && pageCount < MAX_PAGES) {
      try {
        const { data, headers } = await this.get('/orders.json', params);
        const orders = data.orders || [];
        allOrders.push(...orders);
        pageCount++;

        console.log(`[Shopify] Page ${pageCount}: ${orders.length} orders (cumulative: ${allOrders.length})`);

        // Check for next page via Link header
        const linkHeader = headers['link'] || '';
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (nextMatch && orders.length === limit) {
          const nextUrl = new URL(nextMatch[1]);
          params = { page_info: nextUrl.searchParams.get('page_info'), limit };
          hasMore = true;
        } else {
          hasMore = false;
        }
      } catch (err) {
        console.error(`[Shopify] Error fetching orders page ${pageCount + 1}:`, err.message);
        hasMore = false;
      }
    }

    console.log(`[Shopify] Total orders fetched: ${allOrders.length}`);
    return allOrders;
  }

  /**
   * Process Shopify orders and map them to Vijayawada vendors
   * @param {Array} orders - Raw Shopify orders
   * @param {Array} vendorList - Vijayawada vendor list [{vendor_name, vendor_code, stall_no, category}]
   * @returns {Object} { billRows, returns, unmatchedVendors, syncStats }
   */
  processOrdersForVendors(orders, vendorList) {
    const billRows = [];
    const returns = [];
    const unmatchedVendors = new Set();
    const matchedVendors = new Set();
    let totalOrdersProcessed = 0;
    let totalLineItems = 0;
    let totalUnmatched = 0;

    // Build lookup map for fuzzy matching
    const vendorLookup = vendorList.map(v => ({
      ...v,
      nameLower: (v.vendor_name || '').toLowerCase().trim(),
      codeLower: (v.vendor_code || '').toLowerCase().trim()
    }));

    for (const order of orders) {
      totalOrdersProcessed++;
      const orderId = String(order.id);
      // Skip specific fake joke order 7410932088898
      if (orderId === '7410932088898') {
        continue;
      }

      const lineItems = order.line_items || [];
      const orderName = order.name || `#HP-${orderId.slice(-5)}`;
      const customerName = order.customer
        ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
        : 'Walk-in Customer';
      const mobile = (order.customer && order.customer.phone) || order.phone || '';
      const gateway = order.gateway || '';
      const paymentMode = (gateway.toLowerCase().includes('cash') || (order.tags && order.tags.includes('Pay-Cash'))) 
        ? 'Cash' 
        : (gateway || 'Razorpay Online');
      const createdAt = order.created_at;
      const financialStatus = order.financial_status || 'paid';

      // Extract Bill Copy Number from note_attributes or note
      let billCopyNo = 'HP-VIJ-' + orderId.slice(-5);
      if (Array.isArray(order.note_attributes)) {
        const attr = order.note_attributes.find(a =>
          a.name && (a.name.toLowerCase().includes('bill') || a.name.toLowerCase().includes('slip'))
        );
        if (attr && attr.value) billCopyNo = attr.value.trim().toUpperCase();
      } else if (order.note) {
        const noteMatch = order.note.match(/Bill\s*#?([A-Za-z0-9\-_]+)/i);
        if (noteMatch) billCopyNo = noteMatch[1].trim();
      }

      // Group line items by matched vendor
      const vendorGroups = {};

      for (const item of lineItems) {
        totalLineItems++;
        const itemVendor = (item.vendor || '').trim();
        const itemVendorLower = itemVendor.toLowerCase();

        // Fuzzy match against Vijayawada vendor list
        const matched = this.findMatchingVendor(itemVendorLower, vendorLookup);

        if (!matched) {
          if (itemVendor) unmatchedVendors.add(itemVendor);
          totalUnmatched++;
          continue;
        }

        matchedVendors.add(matched.vendor_code);

        const vendorKey = matched.vendor_code;
        if (!vendorGroups[vendorKey]) {
          vendorGroups[vendorKey] = {
            vendor: matched,
            totalAmount: 0,
            itemsCount: 0,
            items: []
          };
        }

        const linePrice = parseFloat(item.price || 0) * (item.quantity || 1);
        if (linePrice > 500000) {
          console.warn(`[Shopify Sync] Skipping unrealistic line item (₹${linePrice}) in order #${orderName}`);
          continue;
        }
        vendorGroups[vendorKey].totalAmount += linePrice;
        vendorGroups[vendorKey].itemsCount += (item.quantity || 1);
        vendorGroups[vendorKey].items.push(item);
      }

      // Create bill rows per vendor group
      const vendorKeys = Object.keys(vendorGroups);
      let suffix = 1;

      for (const vKey of vendorKeys) {
        const group = vendorGroups[vKey];
        const finalBillCopyNo = vendorKeys.length > 1 ? `${billCopyNo}-S${suffix}` : billCopyNo;
        const vendorId = `v_${group.vendor.vendor_code}`;

        const row = {
          id: `shopify_${orderId}_${vKey}`,
          eventId: 'HPD-VIJ-OCT2026',
          vendorId,
          billCopyNo: finalBillCopyNo,
          billAmount: Math.round(group.totalAmount * 100) / 100,
          paymentMode,
          paymentOrderRef: orderName,
          shopifyOrderId: orderId,
          customerName,
          mobile,
          source: 'Shopify',
          status: financialStatus === 'refunded' ? 'Refunded' : (financialStatus === 'partially_refunded' ? 'Partial Refund' : 'Paid'),
          isVoid: financialStatus === 'voided' || financialStatus === 'refunded',
          voidReason: financialStatus === 'voided' ? 'Voided in Shopify' : null,
          mismatchFlag: false,
          createdAt: createdAt,
          lastEditedBy: null,
          lastEditedAt: null
        };

        billRows.push(row);
        suffix++;
      }

      // Process refunds
      if (order.refunds && order.refunds.length > 0) {
        for (const refund of order.refunds) {
          const refundLineItems = refund.refund_line_items || [];
          for (const rli of refundLineItems) {
            const refundItem = lineItems.find(li => String(li.id) === String(rli.line_item_id));
            const refundVendor = refundItem ? (refundItem.vendor || '').trim().toLowerCase() : '';
            const matchedRefundVendor = refundVendor ? this.findMatchingVendor(refundVendor, vendorLookup) : null;

            if (matchedRefundVendor) {
              const vendorId = `v_${matchedRefundVendor.vendor_code}`;
              returns.push({
                id: `ret_shopify_${refund.id}_${rli.id || Date.now()}`,
                billRowId: `shopify_${orderId}_${matchedRefundVendor.vendor_code}`,
                billCopyNo: billCopyNo,
                vendorId,
                amount: Math.round(parseFloat(rli.subtotal || 0) * 100) / 100,
                reason: refund.note || 'Shopify refund',
                refundMode: 'Shopify Refund',
                date: refund.created_at || createdAt,
                approvedBy: 'Shopify (Auto)'
              });
            }
          }
        }
      }
    }

    return {
      billRows,
      returns,
      unmatchedVendors: Array.from(unmatchedVendors),
      syncStats: {
        totalOrders: totalOrdersProcessed,
        totalLineItems,
        matchedBillRows: billRows.length,
        matchedReturns: returns.length,
        unmatchedLineItems: totalUnmatched,
        matchedVendorCodes: Array.from(matchedVendors),
        unmatchedVendorNames: Array.from(unmatchedVendors)
      }
    };
  }

  /**
   * Fuzzy vendor matching
   * Priority: exact → includes → word overlap
   */
  findMatchingVendor(queryLower, vendorLookup) {
    if (!queryLower) return null;

    // Clean query from common noise like "ST 85", "(VIJ EVENT)", etc.
    const cleanQuery = queryLower.replace(/\(.*\)/g, '').replace(/st\s*\d+/g, '').trim();

    // 1. Exact match
    let match = vendorLookup.find(v => v.nameLower === queryLower || v.nameLower === cleanQuery);
    if (match) return match;

    // 2. Exact match on vendor code
    match = vendorLookup.find(v => v.codeLower === queryLower);
    if (match) return match;

    // 3. One includes the other
    match = vendorLookup.find(v =>
      v.nameLower.includes(cleanQuery) || cleanQuery.includes(v.nameLower)
    );
    if (match) return match;

    // 4. Word overlap (at least 2 words or 1 long unique word in common)
    const queryWords = cleanQuery.split(/[\s&,.\-_()]+/).filter(w => w.length > 2);
    let bestMatch = null;
    let bestOverlap = 0;

    for (const v of vendorLookup) {
      const vendorWords = v.nameLower.split(/[\s&,.\-_()]+/).filter(w => w.length > 2);
      const overlap = queryWords.filter(qw => vendorWords.some(vw => vw.includes(qw) || qw.includes(vw))).length;
      if (overlap >= 2 && overlap > bestOverlap) {
        bestOverlap = overlap;
        bestMatch = v;
      }
    }

    return bestMatch;
  }
}

module.exports = ShopifyClient;
