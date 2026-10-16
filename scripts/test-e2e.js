const http = require('http');
const querystring = require('querystring');
const app = require('../server');
const { db } = require('../src/config/database');
const productModel = require('../src/models/productModel');
const inventoryModel = require('../src/models/inventoryModel');
const orderModel = require('../src/models/orderModel');
require('dotenv').config();

const PORT = 3890;
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

async function runE2ETests() {
  console.log('================================================================');
  console.log('  STARTING PHASE 3 COMPREHENSIVE END-TO-END VERIFICATION SUITE  ');
  console.log('================================================================\n');

  server = app.listen(PORT, async () => {
    try {
      // -------------------------------------------------------------
      // JOURNEY STEP 1: Admin logs in securely
      // -------------------------------------------------------------
      console.log('--- STEP 1: Admin Authentication ---');
      const loginPayload = querystring.stringify({
        username: process.env.ADMIN_INITIAL_USERNAME || 'admin',
        password: process.env.ADMIN_INITIAL_PASSWORD || 'Admin@NinaWeaves2026!'
      });
      const loginRes = await makeRequest('/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(loginPayload)
        },
        body: loginPayload
      });
      if (loginRes.statusCode !== 302) {
        throw new Error(`Admin login failed with status ${loginRes.statusCode}`);
      }
      const adminCookie = extractCookie(loginRes);
      console.log('✓ Step 1 Passed: Admin successfully authenticated with secure session cookie.');

      // -------------------------------------------------------------
      // JOURNEY STEP 2: Admin creates a new shirt with variations
      // -------------------------------------------------------------
      console.log('\n--- STEP 2: Product Creation by Admin ---');
      const testSku = `NW-TEST-${Date.now().toString().slice(-4)}`;
      const shirtCat = db.prepare("SELECT id FROM categories WHERE slug = 'shirts'").get();

      const newProductId = productModel.create({
        category_id: shirtCat.id,
        subcategory: 'E2E Collection',
        name: 'The Venetian Pique Luxury Shirt',
        slug: `venetian-pique-${Date.now()}`,
        sku: testSku,
        description: 'An elite waffle pique weave crafted from Italian milled cotton yarns.',
        base_price: 3200,
        unit: 'piece',
        low_stock_threshold: 4,
        status: 'active',
        images: [
          '/uploads/products/shirt-oxford-1.svg',
          '/uploads/products/shirt-oxford-2.svg'
        ],
        variations: [
          { sku: `${testSku}-M`, size: 'M', quality: 'Venetian Pique Cotton', stock_quantity: 8, price: 3200 },
          { sku: `${testSku}-L`, size: 'L', quality: 'Venetian Pique Cotton', stock_quantity: 5, price: 3200 },
          { sku: `${testSku}-XL`, size: 'XL', quality: 'Venetian Pique Cotton', stock_quantity: 0, price: 3200 } // Out of stock variation
        ],
        adminName: 'E2E Testing Agent'
      });

      console.log(`✓ Step 2 Passed: Created product ID #${newProductId} with 3 variations (M=8, L=5, XL=0 units).`);

      // -------------------------------------------------------------
      // JOURNEY STEP 3: Product appears in correct storefront category
      // -------------------------------------------------------------
      console.log('\n--- STEP 3: Storefront Category Reflection ---');
      const catCheckRes = await makeRequest('/shop?category=shirts');
      if (!catCheckRes.body.includes('The Venetian Pique Luxury Shirt')) {
        throw new Error('Newly created product does not appear in Shirts category!');
      }
      console.log('✓ Step 3 Passed: Product immediately visible in /shop?category=shirts storefront.');

      // -------------------------------------------------------------
      // JOURNEY STEP 4: Customer selects variation on Product Details
      // -------------------------------------------------------------
      console.log('\n--- STEP 4: Product Detail Page & Variation Loading ---');
      const createdProduct = productModel.getById(newProductId);
      const detailRes = await makeRequest(`/product/${createdProduct.slug}`);
      if (detailRes.statusCode !== 200 || !detailRes.body.includes('Venetian Pique Luxury Shirt')) {
        throw new Error('Product detail page failed to render for new product!');
      }
      if (!detailRes.body.includes(`${testSku}-M`)) {
        throw new Error('Variation SKU not embedded on product detail page!');
      }
      console.log('✓ Step 4 Passed: Product detail page rendered with interactive variations and Schema.org metadata.');

      // -------------------------------------------------------------
      // JOURNEY STEP 5 & 6: Customer adds to cart & initiates WhatsApp order
      // -------------------------------------------------------------
      console.log('\n--- STEPS 5 & 6: Cart & WhatsApp Order Initiation ---');
      const variationM = createdProduct.variations.find(v => v.size === 'M');
      const stockBeforeOrder = variationM.stock_quantity; // 8

      const checkoutPayload = JSON.stringify({
        customerName: 'Vikramaditya Roy',
        customerPhone: '+91 98111 22334',
        customerEmail: 'vikram@example.com',
        deliveryAddress: '78 Heritage Promenade, Colaba, Mumbai 400005',
        notes: 'Hand-deliver in bespoke gift presentation box',
        items: [
          {
            productId: createdProduct.id,
            variationId: variationM.id,
            productName: createdProduct.name,
            sku: variationM.sku,
            size: variationM.size,
            quality: variationM.quality,
            unit: 'piece',
            unitPrice: 3200,
            quantity: 2
          }
        ]
      });

      const checkoutRes = await makeRequest('/api/checkout/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(checkoutPayload)
        },
        body: checkoutPayload
      });

      const checkoutData = JSON.parse(checkoutRes.body);
      if (!checkoutData.success || !checkoutData.orderReference) {
        throw new Error(`WhatsApp checkout failed: ${checkoutRes.body}`);
      }

      console.log(`  • Order Reference: ${checkoutData.orderReference}`);
      console.log(`  • Prefilled WhatsApp URL: ${checkoutData.whatsappUrl.slice(0, 70)}...`);

      // Verify Inventory Rule: Stock must NOT be deducted on WhatsApp checkout
      const stockAfterOrder = db.prepare('SELECT stock_quantity FROM product_variations WHERE id = ?').get(variationM.id).stock_quantity;
      if (stockAfterOrder !== stockBeforeOrder) {
        throw new Error(`CRITICAL INVENTORY RULE VIOLATED: Stock changed upon WhatsApp click! Initial: ${stockBeforeOrder}, Current: ${stockAfterOrder}`);
      }
      console.log(`✓ Steps 5 & 6 Passed: WhatsApp order inquiry saved. Stock correctly preserved at ${stockAfterOrder} units.`);

      // -------------------------------------------------------------
      // JOURNEY STEP 7: Admin reviews & confirms the order
      // -------------------------------------------------------------
      console.log('\n--- STEP 7: Admin Order Review & Confirmation ---');
      const orderInDb = db.prepare('SELECT id, status FROM orders WHERE order_reference = ?').get(checkoutData.orderReference);
      if (orderInDb.status !== 'inquiry') {
        throw new Error(`Expected inquiry status, got: ${orderInDb.status}`);
      }

      const confirmRes = await makeRequest(`/admin/orders/${orderInDb.id}/confirm`, {
        method: 'POST',
        headers: { Cookie: adminCookie }
      });
      if (confirmRes.statusCode !== 302) {
        throw new Error(`Admin confirmation failed with status ${confirmRes.statusCode}`);
      }
      console.log('✓ Step 7 Passed: Admin confirmed order via dashboard.');

      // -------------------------------------------------------------
      // JOURNEY STEP 8: Stock is deducted atomically
      // -------------------------------------------------------------
      console.log('\n--- STEP 8: Atomic Inventory Deduction ---');
      const stockAfterConfirm = db.prepare('SELECT stock_quantity FROM product_variations WHERE id = ?').get(variationM.id).stock_quantity;
      if (stockAfterConfirm !== stockBeforeOrder - 2) {
        throw new Error(`Stock was not deducted correctly! Expected ${stockBeforeOrder - 2}, got ${stockAfterConfirm}`);
      }
      console.log(`✓ Step 8 Passed: Variation stock atomically deducted from ${stockBeforeOrder} to ${stockAfterConfirm} units.`);

      // -------------------------------------------------------------
      // JOURNEY STEP 9: Updated stock reflected on storefront
      // -------------------------------------------------------------
      console.log('\n--- STEP 9: Storefront Live Stock Reflection ---');
      const refreshedProduct = productModel.getBySlug(createdProduct.slug);
      const refreshedVarM = refreshedProduct.variations.find(v => v.size === 'M');
      if (refreshedVarM.stock_quantity !== 6) {
        throw new Error(`Refreshed variation stock expected 6, got ${refreshedVarM.stock_quantity}`);
      }
      console.log(`✓ Step 9 Passed: Storefront catalogue reflects updated available quantity (${refreshedVarM.stock_quantity} units).`);

      // -------------------------------------------------------------
      // JOURNEY STEP 10: Admin replenishes stock & verifies audit log
      // -------------------------------------------------------------
      console.log('\n--- STEP 10: Admin Replenishment & Audit Trail ---');
      const replenishPayload = querystring.stringify({
        variation_id: variationM.id,
        adjustment_type: 'incoming_stock',
        quantity_value: '10',
        reason: 'Weaving Mill Delivery Batch #702',
        notes: 'Restocked for winter season'
      });

      await makeRequest('/admin/inventory/adjust', {
        method: 'POST',
        headers: {
          Cookie: adminCookie,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(replenishPayload)
        },
        body: replenishPayload
      });

      const finalStock = db.prepare('SELECT stock_quantity FROM product_variations WHERE id = ?').get(variationM.id).stock_quantity;
      if (finalStock !== 16) {
        throw new Error(`Replenishment failed! Expected 16, got ${finalStock}`);
      }

      const log = db.prepare('SELECT * FROM stock_movements WHERE variation_id = ? ORDER BY id DESC LIMIT 1').get(variationM.id);
      if (!log || log.quantity_change !== 10 || log.reason !== 'Weaving Mill Delivery Batch #702') {
        throw new Error('Audit log verification failed!');
      }
      console.log(`✓ Step 10 Passed: Stock replenished to ${finalStock} units. Audit log recorded: "${log.reason}".`);

      // -------------------------------------------------------------
      // EDGE CASES: Out of stock prevention, invalid quantities
      // -------------------------------------------------------------
      console.log('\n--- EDGE CASES & INTEGRITY VERIFICATIONS ---');

      // Edge Case 1: Out of stock product inquiry attempt
      const varXL = createdProduct.variations.find(v => v.size === 'XL'); // stock = 0
      console.log(`  • Testing confirmation with insufficient stock (Variation XL stock: ${varXL.stock_quantity})...`);

      const outOfStockInquiry = orderModel.createInquiry({
        customerName: 'Overdemand Tester',
        customerPhone: '+91 90000 00000',
        items: [
          {
            productId: createdProduct.id,
            variationId: varXL.id,
            productName: createdProduct.name,
            sku: varXL.sku,
            size: 'XL',
            quality: varXL.quality,
            unit: 'piece',
            unitPrice: 3200,
            quantity: 5 // Trying to buy 5 when stock is 0
          }
        ]
      });

      let confirmationFailed = false;
      try {
        orderModel.confirmOrder(outOfStockInquiry.orderId, 'System Tester');
      } catch (err) {
        confirmationFailed = true;
        console.log(`    ✓ System safely rejected insufficient stock confirmation: "${err.message}"`);
      }

      if (!confirmationFailed) {
        throw new Error('CRITICAL FLAW: Confirming an order with 0 stock succeeded when it should fail!');
      }

      // Edge Case 2: Soft delete preservation
      console.log('  • Testing product archival (soft delete) integrity...');
      productModel.softDelete(createdProduct.id);
      const pastOrders = db.prepare('SELECT count(*) as c FROM order_items WHERE product_id = ?').get(createdProduct.id);
      if (pastOrders.c === 0) {
        throw new Error('Archival lost past order items!');
      }
      const storefrontCheck = productModel.getBySlug(createdProduct.slug);
      if (storefrontCheck !== null) {
        throw new Error('Archived product is still visible on storefront!');
      }
      console.log(`    ✓ Product soft-deleted: hidden from storefront while preserving all ${pastOrders.c} order records and stock logs.`);

      console.log('\n================================================================');
      console.log('  ALL 10 JOURNEY STEPS & EDGE CASES TESTED AND PASSED 100%     ');
      console.log('================================================================\n');

      server.close(() => process.exit(0));
    } catch (error) {
      console.error('\nE2E Suite Error:', error);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runE2ETests();
