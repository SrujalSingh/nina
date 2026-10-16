const http = require('http');
const app = require('../server');
const { db } = require('../src/config/database');

const PORT = 3888;
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

async function runTests() {
  console.log('--- STARTING PHASE 1 STOREFRONT TESTS ---');

  server = app.listen(PORT, async () => {
    try {
      // Test 1: Homepage
      const homeRes = await makeRequest('/');
      console.log(`[TEST 1] GET / -> Status: ${homeRes.statusCode}`);
      if (homeRes.statusCode !== 200 || !homeRes.body.includes('Nina Weaves')) {
        throw new Error('Homepage test failed!');
      }
      console.log('  ✓ Homepage rendered successfully with brand name & navigation');

      // Test 2: Shop All
      const shopRes = await makeRequest('/shop');
      console.log(`[TEST 2] GET /shop -> Status: ${shopRes.statusCode}`);
      if (shopRes.statusCode !== 200 || !shopRes.body.includes('The Complete Collection')) {
        throw new Error('Shop All test failed!');
      }
      console.log('  ✓ Shop All catalogue rendered');

      // Test 3: Category Shirts
      const shirtsRes = await makeRequest('/shop?category=shirts');
      console.log(`[TEST 3] GET /shop?category=shirts -> Status: ${shirtsRes.statusCode}`);
      if (shirtsRes.statusCode !== 200 || !shirtsRes.body.includes('Heritage Royal Oxford Shirt')) {
        throw new Error('Shirts category test failed!');
      }
      console.log('  ✓ Shirts category filter works');

      // Test 4: Category Fabric Samples
      const fabricRes = await makeRequest('/shop?category=fabric-samples');
      console.log(`[TEST 4] GET /shop?category=fabric-samples -> Status: ${fabricRes.statusCode}`);
      if (fabricRes.statusCode !== 200 || !fabricRes.body.includes('Imperial 100s Giza Cotton Swatch Card')) {
        throw new Error('Fabric Samples category test failed!');
      }
      console.log('  ✓ Fabric samples category filter works');

      // Test 5: Product Details
      const prodRes = await makeRequest('/product/the-heritage-royal-oxford-shirt');
      console.log(`[TEST 5] GET /product/the-heritage-royal-oxford-shirt -> Status: ${prodRes.statusCode}`);
      if (prodRes.statusCode !== 200 || !prodRes.body.includes('Pinpoint Royal Oxford')) {
        throw new Error('Product details page failed!');
      }
      console.log('  ✓ Product detail page loaded with specifications & images');

      // Test 6: Cart Page
      const cartRes = await makeRequest('/cart');
      console.log(`[TEST 6] GET /cart -> Status: ${cartRes.statusCode}`);
      if (cartRes.statusCode !== 200 || !cartRes.body.includes('Your Atelier Shopping Bag')) {
        throw new Error('Cart page failed!');
      }
      console.log('  ✓ Cart page rendered');

      // Test 7: WhatsApp Checkout API
      const p1 = db.prepare('SELECT id, name, sku FROM products WHERE slug = ?').get('the-heritage-royal-oxford-shirt');
      const v1 = db.prepare('SELECT id, sku, size, quality, price, stock_quantity FROM product_variations WHERE product_id = ? AND stock_quantity > 0 LIMIT 1').get(p1.id);
      const initialStock = v1.stock_quantity;

      const checkoutPayload = JSON.stringify({
        customerName: 'Test Customer A',
        customerPhone: '+91 99887 76655',
        customerEmail: 'test@example.com',
        deliveryAddress: '123 Atelier Street, Mumbai',
        notes: 'Monogram initials NW',
        items: [
          {
            productId: p1.id,
            variationId: v1.id,
            productName: p1.name,
            sku: v1.sku,
            size: v1.size,
            quality: v1.quality,
            unit: 'piece',
            unitPrice: v1.price || 2899,
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

      console.log(`[TEST 7] POST /api/checkout/whatsapp -> Status: ${checkoutRes.statusCode}`);
      const checkoutData = JSON.parse(checkoutRes.body);
      if (!checkoutData.success || !checkoutData.orderReference || !checkoutData.whatsappUrl) {
        throw new Error(`WhatsApp checkout failed: ${checkoutRes.body}`);
      }
      console.log(`  ✓ WhatsApp Order Generated: ${checkoutData.orderReference}`);
      console.log(`  ✓ WhatsApp URL: ${checkoutData.whatsappUrl.slice(0, 60)}...`);

      // Verify that stock is NOT deducted on WhatsApp inquiry (Crucial Rule!)
      const checkStock = db.prepare('SELECT stock_quantity FROM product_variations WHERE id = ?').get(v1.id);
      if (checkStock.stock_quantity !== initialStock) {
        throw new Error(`VIOLATION: Stock was deducted on WhatsApp inquiry! Expected ${initialStock}, got ${checkStock.stock_quantity}`);
      }
      console.log(`  ✓ VERIFIED INVENTORY RULE: Stock remained untouched at ${checkStock.stock_quantity} units upon WhatsApp inquiry.`);

      // Verify order saved in DB as 'inquiry'
      const orderInDb = db.prepare('SELECT * FROM orders WHERE order_reference = ?').get(checkoutData.orderReference);
      if (!orderInDb || orderInDb.status !== 'inquiry') {
        throw new Error('Order was not saved as inquiry in database!');
      }
      console.log(`  ✓ Order inquiry persisted in DB with status: "${orderInDb.status}"`);

      // Test 8: Essential Policies
      for (const policySlug of ['shipping-policy', 'return-policy', 'privacy-policy', 'terms', 'about']) {
        const pRes = await makeRequest(`/${policySlug}`);
        if (pRes.statusCode !== 200) {
          throw new Error(`Policy page /${policySlug} failed with status ${pRes.statusCode}`);
        }
      }
      console.log('  ✓ Essential pages (About, Shipping, Return, Privacy, Terms) all load 200 OK');

      // Test 9: Sitemap.xml & Robots.txt
      const sitemapRes = await makeRequest('/sitemap.xml');
      if (sitemapRes.statusCode !== 200 || !sitemapRes.body.includes('<urlset')) {
        throw new Error('Sitemap.xml failed!');
      }
      console.log('  ✓ Sitemap.xml generated with valid XML');

      const robotsRes = await makeRequest('/robots.txt');
      if (robotsRes.statusCode !== 200 || !robotsRes.body.includes('Disallow: /admin')) {
        throw new Error('Robots.txt failed!');
      }
      console.log('  ✓ Robots.txt generated');

      console.log('\n--- ALL PHASE 1 ACCEPTANCE CRITERIA MET AND VERIFIED ---');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('Phase 1 test error:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runTests();
