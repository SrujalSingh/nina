const http = require('http');
const querystring = require('querystring');
const app = require('../server');
const { db } = require('../src/config/database');
require('dotenv').config();

const PORT = 3889;
let server;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: PORT,
      path: path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

function extractCookie(res) {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  return setCookie.map(c => c.split(';')[0]).join('; ');
}

async function runTests() {
  console.log('--- STARTING PHASE 2 ADMIN & INVENTORY TESTS ---');

  server = app.listen(PORT, async () => {
    try {
      // Test 1: Access control — Unauthenticated redirect
      const unauthRes = await makeRequest('/admin');
      console.log(`[TEST 1] GET /admin (Unauthenticated) -> Status: ${unauthRes.statusCode}, Location: ${unauthRes.headers.location}`);
      if (unauthRes.statusCode !== 302 || !unauthRes.headers.location.includes('/admin/login')) {
        throw new Error('Access control failed: unauthenticated user was not redirected to /admin/login!');
      }
      console.log('  ✓ Unauthenticated access safely redirected to login.');

      // Test 2: Invalid login
      const invalidBody = querystring.stringify({ username: 'admin', password: 'WrongPassword123' });
      const invalidRes = await makeRequest('/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(invalidBody)
        },
        body: invalidBody
      });
      console.log(`[TEST 2] POST /admin/login (Invalid creds) -> Status: ${invalidRes.statusCode}`);
      if (invalidRes.statusCode !== 401 || !invalidRes.body.includes('Invalid username or password')) {
        throw new Error('Invalid login check failed!');
      }
      console.log('  ✓ Invalid credentials correctly rejected with 401 status.');

      // Test 3: Successful admin login
      const validBody = querystring.stringify({
        username: process.env.ADMIN_INITIAL_USERNAME || 'admin',
        password: process.env.ADMIN_INITIAL_PASSWORD || 'Admin@NinaWeaves2026!'
      });
      const loginRes = await makeRequest('/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(validBody)
        },
        body: validBody
      });
      console.log(`[TEST 3] POST /admin/login (Valid creds) -> Status: ${loginRes.statusCode}, Location: ${loginRes.headers.location}`);
      if (loginRes.statusCode !== 302) {
        throw new Error(`Login failed with status: ${loginRes.statusCode}`);
      }
      const adminCookie = extractCookie(loginRes);
      if (!adminCookie) {
        throw new Error('No session cookie returned after successful login!');
      }
      console.log('  ✓ Admin logged in successfully with secure session cookie.');

      // Test 4: Admin Dashboard with Session
      const dashRes = await makeRequest('/admin/dashboard', {
        headers: { Cookie: adminCookie }
      });
      console.log(`[TEST 4] GET /admin/dashboard -> Status: ${dashRes.statusCode}`);
      if (dashRes.statusCode !== 200 || !dashRes.body.includes('Active Products') || !dashRes.body.includes('Units in Stock')) {
        throw new Error('Dashboard failed to render with summary metrics!');
      }
      console.log('  ✓ Admin dashboard rendered with live summary cards & stock indicators.');

      // Test 5: Dedicated Inventory Screen & Stock Adjustment
      const invRes = await makeRequest('/admin/inventory', {
        headers: { Cookie: adminCookie }
      });
      console.log(`[TEST 5A] GET /admin/inventory -> Status: ${invRes.statusCode}`);
      if (invRes.statusCode !== 200 || !invRes.body.includes('Inventory &amp; Stock Management')) {
        throw new Error('Inventory screen failed!');
      }

      // Perform atomic stock adjustment: Add incoming stock (+15 units)
      const testVariation = db.prepare('SELECT id, sku, stock_quantity, product_id FROM product_variations WHERE is_active = 1 LIMIT 1').get();
      const initialVarStock = testVariation.stock_quantity;

      const adjustBody = querystring.stringify({
        variation_id: testVariation.id,
        adjustment_type: 'incoming_stock',
        quantity_value: '15',
        reason: 'Shipment Receipt Test',
        notes: 'Verification batch from testing suite'
      });

      const adjustRes = await makeRequest('/admin/inventory/adjust', {
        method: 'POST',
        headers: {
          Cookie: adminCookie,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(adjustBody)
        },
        body: adjustBody
      });
      console.log(`[TEST 5B] POST /admin/inventory/adjust -> Status: ${adjustRes.statusCode}`);

      // Verify DB stock quantity
      const updatedVar = db.prepare('SELECT stock_quantity FROM product_variations WHERE id = ?').get(testVariation.id);
      if (updatedVar.stock_quantity !== initialVarStock + 15) {
        throw new Error(`Stock adjustment failed! Expected ${initialVarStock + 15}, got ${updatedVar.stock_quantity}`);
      }
      console.log(`  ✓ Stock successfully increased from ${initialVarStock} to ${updatedVar.stock_quantity}.`);

      // Verify stock_movements audit log
      const latestMovement = db.prepare('SELECT * FROM stock_movements WHERE variation_id = ? ORDER BY id DESC LIMIT 1').get(testVariation.id);
      if (!latestMovement || latestMovement.quantity_change !== 15 || latestMovement.reason !== 'Shipment Receipt Test') {
        throw new Error('Stock movement audit log not recorded accurately!');
      }
      console.log(`  ✓ Audit log verified: recorded +15 change by "${latestMovement.admin_name}".`);

      // Test 6: Order Confirmation & Atomic Stock Deduction Workflow
      // Create a test inquiry order first
      const orderModel = require('../src/models/orderModel');
      const testInquiry = orderModel.createInquiry({
        customerName: 'Sartorial Client',
        customerPhone: '+91 98888 12345',
        deliveryAddress: '456 Bespoke Lane, Bangalore',
        items: [
          {
            productId: testVariation.product_id,
            variationId: testVariation.id,
            productName: 'Test Shirt',
            sku: testVariation.sku,
            size: 'M',
            quality: 'Giza Cotton',
            unit: 'piece',
            unitPrice: 2999,
            quantity: 3
          }
        ]
      });

      const stockBeforeConfirm = db.prepare('SELECT stock_quantity FROM product_variations WHERE id = ?').get(testVariation.id).stock_quantity;

      // Admin confirms the order: POST /admin/orders/:id/confirm
      const confirmRes = await makeRequest(`/admin/orders/${testInquiry.orderId}/confirm`, {
        method: 'POST',
        headers: { Cookie: adminCookie }
      });
      console.log(`[TEST 6A] POST /admin/orders/${testInquiry.orderId}/confirm -> Status: ${confirmRes.statusCode}`);

      const stockAfterConfirm = db.prepare('SELECT stock_quantity FROM product_variations WHERE id = ?').get(testVariation.id).stock_quantity;
      if (stockAfterConfirm !== stockBeforeConfirm - 3) {
        throw new Error(`Stock deduction failed! Expected ${stockBeforeConfirm - 3}, got ${stockAfterConfirm}`);
      }
      console.log(`  ✓ Inventory atomically deducted by 3 units (from ${stockBeforeConfirm} to ${stockAfterConfirm}).`);

      const confirmedOrder = db.prepare('SELECT status FROM orders WHERE id = ?').get(testInquiry.orderId);
      if (confirmedOrder.status !== 'confirmed') {
        throw new Error(`Expected order status 'confirmed', got '${confirmedOrder.status}'`);
      }
      console.log('  ✓ Order status successfully transitioned to "confirmed".');

      // Test 7: Order Cancellation & Inventory Restoration Workflow
      const cancelBody = querystring.stringify({ cancel_reason: 'Client requested size adjustment' });
      const cancelRes = await makeRequest(`/admin/orders/${testInquiry.orderId}/cancel`, {
        method: 'POST',
        headers: {
          Cookie: adminCookie,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(cancelBody)
        },
        body: cancelBody
      });
      console.log(`[TEST 7] POST /admin/orders/${testInquiry.orderId}/cancel -> Status: ${cancelRes.statusCode}`);

      const stockAfterCancel = db.prepare('SELECT stock_quantity FROM product_variations WHERE id = ?').get(testVariation.id).stock_quantity;
      if (stockAfterCancel !== stockBeforeConfirm) {
        throw new Error(`Stock restoration failed! Expected restored stock ${stockBeforeConfirm}, got ${stockAfterCancel}`);
      }
      console.log(`  ✓ Cancelled order restored stock back to ${stockAfterCancel} units.`);

      // Test 8: Live Store Settings Update (WhatsApp number, announcement)
      const settingsBody = querystring.stringify({
        brand_name: 'Nina Weaves Atelier',
        brand_tagline: 'Handcrafted Luxury Shirts & Textiles',
        whatsapp_number: '919123456789',
        contact_phone: '+91 91234 56789',
        contact_email: 'atelier@nestbeans.com',
        contact_address: 'Nestbeans Atelier, Mumbai',
        currency: 'INR',
        currency_symbol: '₹',
        low_stock_threshold_default: '5'
      });

      const settingsRes = await makeRequest('/admin/settings', {
        method: 'POST',
        headers: {
          Cookie: adminCookie,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(settingsBody)
        },
        body: settingsBody
      });
      console.log(`[TEST 8A] POST /admin/settings -> Status: ${settingsRes.statusCode}`);

      // Verify that changes appear on the public storefront without restarting or changing code!
      const storefrontRes = await makeRequest('/');
      if (!storefrontRes.body.includes('919123456789')) {
        throw new Error('Public storefront did not reflect the updated WhatsApp number!');
      }
      console.log('  ✓ VERIFIED: Storefront immediately reflects the updated business WhatsApp number without code changes.');

      // Restore WhatsApp number to original for consistency
      const resetSettingsBody = querystring.stringify({
        brand_name: 'Nina Weaves',
        brand_tagline: 'Handcrafted Luxury Shirts & Bespoke Textiles',
        whatsapp_number: '919876543210',
        contact_phone: '+91 98765 43210',
        contact_email: 'contact@nestbeans.com',
        contact_address: 'Nestbeans Atelier, Heritage Quarter, Mumbai 400001, India',
        currency: 'INR',
        currency_symbol: '₹',
        low_stock_threshold_default: '5'
      });
      await makeRequest('/admin/settings', {
        method: 'POST',
        headers: {
          Cookie: adminCookie,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(resetSettingsBody)
        },
        body: resetSettingsBody
      });

      // Test 9: Logout
      const logoutRes = await makeRequest('/admin/logout', {
        headers: { Cookie: adminCookie }
      });
      console.log(`[TEST 9] GET /admin/logout -> Status: ${logoutRes.statusCode}`);
      const afterLogoutRes = await makeRequest('/admin/dashboard', {
        headers: { Cookie: adminCookie }
      });
      if (afterLogoutRes.statusCode !== 302 || !afterLogoutRes.headers.location.includes('/admin/login')) {
        throw new Error('Session was not cleared after logout!');
      }
      console.log('  ✓ Logout successful and session destroyed.');

      console.log('\n--- ALL PHASE 2 ACCEPTANCE CRITERIA MET AND VERIFIED ---');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('Phase 2 test error:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runTests();
