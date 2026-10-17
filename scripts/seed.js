const bcrypt = require('bcryptjs');
const { db, transaction } = require('../src/config/database');
require('dotenv').config();

function seedDatabase() {
  console.log('--- Starting Nina Weaves Database Seeding ---');

  transaction(() => {
    // 1. Initial Admin
    const adminUser = process.env.ADMIN_INITIAL_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@NinaWeaves2026!';
    const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@nestbeans.com';
    const adminName = process.env.ADMIN_INITIAL_NAME || 'Store Administrator';

    const existingAdmin = db.prepare('SELECT id FROM admins WHERE username = ?').get(adminUser);
    if (!existingAdmin) {
      const passwordHash = bcrypt.hashSync(adminPass, 10);
      db.prepare(`
        INSERT INTO admins (username, email, password_hash, name, role)
        VALUES (?, ?, ?, ?, 'admin')
      `).run(adminUser, adminEmail, passwordHash, adminName);
      console.log(`[Admin] Created initial administrator: ${adminUser}`);
    } else {
      console.log(`[Admin] Admin ${adminUser} already exists, skipping.`);
    }

    // 2. Default Store Settings
    const defaultSettings = [
      ['brand_name', process.env.STORE_NAME || 'Nina Weaves'],
      ['brand_tagline', 'Handcrafted Luxury Shirts & Bespoke Textiles'],
      ['whatsapp_number', process.env.WHATSAPP_NUMBER || '919876543210'],
      ['contact_email', 'contact@nestbeans.com'],
      ['contact_phone', '+91 98765 43210'],
      ['contact_address', 'Nestbeans Atelier, Heritage Quarter, Mumbai 400001, India'],
      ['currency', 'INR'],
      ['currency_symbol', '₹'],
      ['hero_headline', 'The Fine Art of Bespoke Tailoring'],
      ['hero_subheadline', 'Mastercrafted shirts and museum-grade textile swatches, ordered directly through personal WhatsApp consultation.'],
      ['hero_image_url', '/images/hero-banner.svg'],
      ['announcement_text', 'Complimentary shipping on orders above ₹2,500 | Dedicated WhatsApp Stylist Available'],
      ['low_stock_threshold_default', '5']
    ];

    const setStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of defaultSettings) {
      setStmt.run(k, v);
    }
    console.log('[Settings] Loaded default store settings.');

    // 3. Default Website Policies & Pages
    const defaultPolicies = [
      {
        slug: 'about-us',
        title: 'About Nina Weaves',
        content: `
At Nina Weaves, we believe a truly great shirt is born at the intersection of extraordinary textiles and unhurried tailoring.

Founded under Nestbeans Lifestyle, our atelier sources rare, long-staple Egyptian Giza cottons, unbleached Normandy flax linens, and fine merino twills directly from generational heritage mills. Every garment is individually hand-cut and finished with single-needle tailoring, reinforced mother-of-pearl buttons, and sculpted collars designed to maintain their poise with or without a tie.

We honor the timeless tradition of personal consultation. Through our direct WhatsApp atelier service, our master tailors guide you through fabric drape, collar architecture, and custom sizing before your order is cut and crafted.
        `.trim()
      },
      {
        slug: 'shipping-policy',
        title: 'Shipping & Delivery Policy',
        content: `
We partner with premier express courier services (Blue Dart, Delhivery, and DHL Express) to ensure your pieces arrive in pristine condition.

• Ready-to-Wear Shirts: Dispatched within 24–48 hours. Delivery takes 3–5 business days across India.
• Fabric Swatches & Cuts: Dispatched within 24 hours. Delivery takes 2–4 business days across India.
• Bespoke & Custom Size Orders: Hand-cut and tailored individually. Dispatched within 7–10 business days.
• Shipping Charges: We provide complimentary insured standard delivery on all domestic orders exceeding ₹2,500. For orders under ₹2,500, a flat nominal delivery fee of ₹150 applies.
• Tracking: Real-time tracking links are shared immediately over WhatsApp and SMS upon courier handover.
        `.trim()
      },
      {
        slug: 'return-policy',
        title: 'Return & Exchange Policy',
        content: `
We take immense pride in the craftsmanship of every garment. If you are not entirely delighted with your standard ready-to-wear shirt:

• Eligibility: Standard size shirts (XS–XXL) may be exchanged or returned within 7 days of delivery, provided they remain unworn, unwashed, unaltered, and with all original luxury packaging and tags intact.
• Fabric Swatches & Metre Cuts: Because fabric swatches and per-metre cuts are custom-measured and cut specifically from bolt rolls upon your request, they are non-returnable unless defective or incorrect.
• Custom Tailored Shirts: Custom size garments made to personal customer measurements undergo stringent dual-stage quality control. In the rare event of a sizing discrepancy, complimentary alterations are provided at our atelier.
• Process: Simply reach out to our WhatsApp atelier team quoting your order reference. Our team will coordinate reverse pickup.
        `.trim()
      },
      {
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        content: `
Nina Weaves (Nestbeans Lifestyle) is committed to protecting your personal privacy.

• What We Collect: When you place an inquiry or order, we collect your name, WhatsApp contact number, email address (optional), and physical delivery address.
• How We Use It: Your contact and address details are used exclusively to prepare your order, coordinate tailoring specifications via WhatsApp, and ensure secure courier fulfillment.
• Data Confidentiality: We do not sell, rent, or trade your personal details with third-party advertising networks. Your data is stored securely in encrypted databases.
• WhatsApp Communication: Initiating an order via WhatsApp opens a secure, direct chat with our designated atelier team.
        `.trim()
      },
      {
        slug: 'terms',
        title: 'Terms & Conditions',
        content: `
Welcome to Nina Weaves. By browsing our catalogue or initiating orders through our platform, you agree to the following terms:

• Product Representation: We strive to photograph our fabrics and garments under calibrated studio lighting. Due to natural textile variations and differing screen displays, subtle tonal variations may exist.
• Pricing & Inquiries: All prices are listed in Indian Rupees (INR) and are inclusive of applicable taxes. Inquiries placed via WhatsApp are subject to final stock verification and explicit order confirmation by our administrator.
• Order Confirmation & Stock: Stock is deducted and reserved upon formal confirmation by our atelier team. Submitting an inquiry does not constitute a guaranteed reservation until confirmed.
• Intellectual Property: All photography, text, and design elements are the intellectual property of Nina Weaves and Nestbeans Lifestyle.
        `.trim()
      }
    ];

    const policyStmt = db.prepare('INSERT OR REPLACE INTO policies (slug, title, content) VALUES (?, ?, ?)');
    for (const p of defaultPolicies) {
      policyStmt.run(p.slug, p.title, p.content);
    }
    console.log('[Policies] Seeded website policies and brand content.');

    // 4. Default Categories: 1. Shirts, 2. Fabric Samples
    const catCheck = db.prepare('SELECT count(*) as count FROM categories').get();
    if (catCheck.count === 0) {
      const catStmt = db.prepare('INSERT INTO categories (name, slug, description, image_url, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?)');
      catStmt.run(
        'Shirts',
        'shirts',
        'Mastercrafted ready-to-wear and bespoke tailored shirts crafted from the finest Egyptian Giza cottons and European linens.',
        '/uploads/products/shirt-oxford-1.svg',
        1,
        1
      );
      catStmt.run(
        'Fabric Samples',
        'fabric-samples',
        'Certified textile swatches and tailor cuts to experience weave quality, hand feel, and drape before commissioning your wardrobe.',
        '/uploads/products/sample-giza-1.svg',
        2,
        1
      );
      catStmt.run(
        'Pants',
        'pants',
        'Precision-tailored trousers and structured chinos crafted from fine wools and Belgian linen.',
        '/uploads/products/pants-wool-1.svg',
        3,
        1
      );
      catStmt.run(
        'Jeans',
        'jeans',
        'Artisanal selvedge denim and premium washed jeans engineered with timeless sartorial cuts.',
        '/uploads/products/jeans-selvedge-1.svg',
        4,
        1
      );
      console.log('[Categories] Seeded default categories: Shirts, Fabric Samples, Pants, Jeans.');
    }

    // Retrieve category IDs
    const shirtsCat = db.prepare("SELECT id FROM categories WHERE slug = 'shirts'").get();
    const fabricCat = db.prepare("SELECT id FROM categories WHERE slug = 'fabric-samples'").get();

    // 5. Initial Sample Products & Variations
    const prodCheck = db.prepare('SELECT count(*) as count FROM products').get();
    if (prodCheck.count === 0) {
      const insertProd = db.prepare(`
        INSERT INTO products (
          category_id, subcategory, name, slug, sku, description, specifications,
          base_price, sale_price, unit, low_stock_threshold, status, is_featured, is_new_arrival
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertImg = db.prepare(`
        INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
        VALUES (?, ?, ?, ?, ?)
      `);

      const insertVar = db.prepare(`
        INSERT INTO product_variations (product_id, sku, size, quality, option_name, price, stock_quantity, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `);

      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (variation_id, product_id, previous_quantity, quantity_change, new_quantity, reason, notes, admin_name)
        VALUES (?, ?, 0, ?, ?, 'incoming_stock', 'Initial Inventory Stocking', 'System Initializer')
      `);

      // PRODUCT 1: The Heritage Royal Oxford Shirt
      const p1 = insertProd.run(
        shirtsCat.id,
        'Formal & Business',
        'The Heritage Royal Oxford Shirt',
        'the-heritage-royal-oxford-shirt',
        'NW-SHT-001',
        'A sartorial cornerstone. Tailored from an exquisite 80s two-ply pinpoint Oxford weave, offering subtle luster, exceptional breathability, and substantial drape that maintains structural elegance throughout the day. Finished with authentic mother-of-pearl buttons and a classic semi-spread collar.',
        JSON.stringify({
          'Fabric Composition': '100% Two-Ply Long Staple Cotton',
          'Weave': 'Pinpoint Royal Oxford',
          'Collar': 'Reinforced Semi-Spread Collar with Removable Stays',
          'Cuff': 'Single-Button Rounded Barrel Cuff',
          'Buttons': 'Genuine Australian Mother-of-Pearl',
          'Care': 'Machine wash cold on gentle cycle or professional dry clean'
        }),
        2899,
        null,
        'piece',
        5,
        'active',
        1,
        1
      );
      const p1Id = p1.lastInsertRowid;

      insertImg.run(p1Id, '/uploads/products/shirt-oxford-1.svg', 'Heritage Royal Oxford Shirt Front', 1, 1);
      insertImg.run(p1Id, '/uploads/products/shirt-oxford-2.svg', 'Heritage Royal Oxford Shirt Collar Detail', 0, 2);
      insertImg.run(p1Id, '/uploads/products/shirt-oxford-3.svg', 'Heritage Royal Oxford Shirt Cuff & Texture', 0, 3);

      const p1Variations = [
        { size: 'XS', quality: 'Royal Oxford 80/2', sku: 'NW-SHT-001-XS', qty: 6, price: 2899 },
        { size: 'S', quality: 'Royal Oxford 80/2', sku: 'NW-SHT-001-S', qty: 10, price: 2899 },
        { size: 'M', quality: 'Royal Oxford 80/2', sku: 'NW-SHT-001-M', qty: 14, price: 2899 },
        { size: 'L', quality: 'Royal Oxford 80/2', sku: 'NW-SHT-001-L', qty: 8, price: 2899 },
        { size: 'XL', quality: 'Royal Oxford 80/2', sku: 'NW-SHT-001-XL', qty: 5, price: 2899 },
        { size: 'XXL', quality: 'Royal Oxford 80/2', sku: 'NW-SHT-001-XXL', qty: 4, price: 3099 },
        { size: 'Custom Size', quality: 'Royal Oxford 80/2', sku: 'NW-SHT-001-CUST', qty: 12, price: 3299 },
        { size: 'M', quality: 'Superfine Giza 100/2 Upgrade', sku: 'NW-SHT-001-M-GIZ', qty: 8, price: 3499 },
        { size: 'L', quality: 'Superfine Giza 100/2 Upgrade', sku: 'NW-SHT-001-L-GIZ', qty: 4, price: 3499 }
      ];

      for (const v of p1Variations) {
        const vRes = insertVar.run(p1Id, v.sku, v.size, v.quality, null, v.price, v.qty);
        insertMovement.run(vRes.lastInsertRowid, p1Id, v.qty, v.qty);
      }

      // PRODUCT 2: Artisan Belgian Linen Shirt
      const p2 = insertProd.run(
        shirtsCat.id,
        'Casual & Resort',
        'Artisan Belgian Linen Shirt',
        'artisan-belgian-linen-shirt',
        'NW-SHT-002',
        'Woven from 100% certified Normandy flax linen, this shirt embodies relaxed sophistication. Pre-washed for a buttery soft texture that softens further with every wear. Featuring a modern resort camp collar, curved hem for untucked styling, and natural coconut shell buttons.',
        JSON.stringify({
          'Fabric Composition': '100% Certified Normandy Flax Linen',
          'Weight': '165 GSM Breathable Slub Weave',
          'Collar': 'Convertible Resort Camp Collar',
          'Buttons': 'Carved Sustainable Coconut Shell',
          'Fit': 'Tailored Relaxed Fit',
          'Care': 'Gentle wash in cold water, hang dry, warm iron if desired'
        }),
        3499,
        3199,
        'piece',
        5,
        'active',
        1,
        1
      );
      const p2Id = p2.lastInsertRowid;

      insertImg.run(p2Id, '/uploads/products/shirt-linen-1.svg', 'Artisan Belgian Linen Shirt Studio Front', 1, 1);
      insertImg.run(p2Id, '/uploads/products/shirt-linen-2.svg', 'Artisan Belgian Linen Shirt Collar Close-up', 0, 2);
      insertImg.run(p2Id, '/uploads/products/shirt-linen-3.svg', 'Artisan Belgian Linen Shirt Styling Angle', 0, 3);

      const p2Variations = [
        { size: 'S', quality: 'Pure Normandy Flax Linen', sku: 'NW-SHT-002-S', qty: 7, price: 3199 },
        { size: 'M', quality: 'Pure Normandy Flax Linen', sku: 'NW-SHT-002-M', qty: 9, price: 3199 },
        { size: 'L', quality: 'Pure Normandy Flax Linen', sku: 'NW-SHT-002-L', qty: 6, price: 3199 },
        { size: 'XL', quality: 'Pure Normandy Flax Linen', sku: 'NW-SHT-002-XL', qty: 2, price: 3199 }, // Low stock!
        { size: 'Custom Size', quality: 'Pure Normandy Flax Linen', sku: 'NW-SHT-002-CUST', qty: 8, price: 3599 }
      ];

      for (const v of p2Variations) {
        const vRes = insertVar.run(p2Id, v.sku, v.size, v.quality, null, v.price, v.qty);
        insertMovement.run(vRes.lastInsertRowid, p2Id, v.qty, v.qty);
      }

      // PRODUCT 3: Midnight Egyptian Giza Formal Shirt
      const p3 = insertProd.run(
        shirtsCat.id,
        'Black Tie & Evening',
        'Midnight Egyptian Giza Formal Shirt',
        'midnight-egyptian-giza-formal-shirt',
        'NW-SHT-003',
        'An uncompromising evening shirt crafted from rare Giza 87 extra-long staple Egyptian cotton. Exhibiting a deep, rich midnight navy hue with a subtle twill sheen that captures ambient evening light. Equipped with French cuffs for your finest cuff links and an architectural cutaway collar.',
        JSON.stringify({
          'Fabric Composition': '100% Giza 87 Extra-Long Staple Cotton',
          'Weave': 'Silky Twill Luster Finish',
          'Collar': 'Architectural Cutaway Collar',
          'Cuff': 'Double French Cuff for Cuff Links',
          'Buttons': 'Smoked Mother-of-Pearl',
          'Care': 'Professional Dry Clean Recommended'
        }),
        3899,
        null,
        'piece',
        5,
        'active',
        1,
        0
      );
      const p3Id = p3.lastInsertRowid;

      insertImg.run(p3Id, '/uploads/products/shirt-giza-1.svg', 'Midnight Egyptian Giza Shirt Front', 1, 1);
      insertImg.run(p3Id, '/uploads/products/shirt-giza-2.svg', 'Midnight Egyptian Giza Shirt Collar View', 0, 2);
      insertImg.run(p3Id, '/uploads/products/shirt-giza-3.svg', 'Midnight Egyptian Giza Shirt Cuff Architecture', 0, 3);

      const p3Variations = [
        { size: 'S', quality: 'Giza 87 Extra-Long Staple', sku: 'NW-SHT-003-S', qty: 5, price: 3899 },
        { size: 'M', quality: 'Giza 87 Extra-Long Staple', sku: 'NW-SHT-003-M', qty: 8, price: 3899 },
        { size: 'L', quality: 'Giza 87 Extra-Long Staple', sku: 'NW-SHT-003-L', qty: 7, price: 3899 },
        { size: 'XL', quality: 'Giza 87 Extra-Long Staple', sku: 'NW-SHT-003-XL', qty: 0, price: 3899 }, // Sold out for testing!
        { size: 'Custom Size', quality: 'Giza 87 Extra-Long Staple', sku: 'NW-SHT-003-CUST', qty: 6, price: 4299 }
      ];

      for (const v of p3Variations) {
        const vRes = insertVar.run(p3Id, v.sku, v.size, v.quality, null, v.price, v.qty);
        insertMovement.run(vRes.lastInsertRowid, p3Id, v.qty, v.qty);
      }

      // PRODUCT 4: Imperial 100s Giza Cotton Swatch Card
      const p4 = insertProd.run(
        fabricCat.id,
        'Cotton Swatches',
        'Imperial 100s Giza Cotton Swatch Card',
        'imperial-100s-giza-cotton-swatch-card',
        'NW-FAB-001',
        'Experience the exceptional softness, drape, and thread density of our flagship 100s two-fold Egyptian Giza cotton before placing your shirt commission. Includes certified mill laboratory analysis, shrinkage metrics, and yarn count certificates.',
        JSON.stringify({
          'Origin': 'Nile Delta, Egypt (Milled in Biella, Italy)',
          'Yarn Count': '100/2 Two-Fold Compact Spun',
          'Certifications': 'OEKO-TEX® Standard 100 Grade A',
          'Recommended Usage': 'Bespoke Dress Shirts & Luxury Blouses'
        }),
        249,
        null,
        'per sample',
        10,
        'active',
        1,
        1
      );
      const p4Id = p4.lastInsertRowid;

      insertImg.run(p4Id, '/uploads/products/sample-giza-1.svg', 'Giza Swatch Presentation Card', 1, 1);
      insertImg.run(p4Id, '/uploads/products/sample-giza-2.svg', 'Giza Swatch Macro Weave Detail', 0, 2);

      const p4Variations = [
        { option: 'Standard Swatch Card (15x15 cm)', quality: '100s/2 Egyptian Giza Cotton', sku: 'NW-FAB-001-SW15', qty: 40, price: 249 },
        { option: 'Tailor Cutting (30x30 cm)', quality: '100s/2 Egyptian Giza Cotton', sku: 'NW-FAB-001-CUT30', qty: 25, price: 449 },
        { option: '1 Metre Trial Cut', quality: '100s/2 Egyptian Giza Cotton', sku: 'NW-FAB-001-MTR', qty: 15, price: 1199 }
      ];

      for (const v of p4Variations) {
        const vRes = insertVar.run(p4Id, v.sku, null, v.quality, v.option, v.price, v.qty);
        insertMovement.run(vRes.lastInsertRowid, p4Id, v.qty, v.qty);
      }

      // PRODUCT 5: Organic Belgian Linen Swatch Palette
      const p5 = insertProd.run(
        fabricCat.id,
        'Linen Swatches',
        'Organic Belgian Linen Swatch Palette',
        'organic-belgian-linen-swatch-palette',
        'NW-FAB-002',
        'A tactile palette card comprising 6 authentic washed flax swatches spanning natural ecru, sage olive, sky chambray, optic white, terracotta, and midnight navy. Unrivaled breathability and natural cooling properties for tropical climates.',
        JSON.stringify({
          'Origin': 'Flanders, Belgium & Normandy, France',
          'Fabric Weight': '185 GSM Mid-Weight Suiting Linen',
          'Treatment': 'Pre-Washed Enzyme Soft Finish',
          'Set Details': '6 Fabric Swatches (10x10 cm each) mounted on craft board'
        }),
        299,
        null,
        'per sample',
        10,
        'active',
        1,
        0
      );
      const p5Id = p5.lastInsertRowid;

      insertImg.run(p5Id, '/uploads/products/sample-linen-1.svg', 'Belgian Linen Palette Card', 1, 1);
      insertImg.run(p5Id, '/uploads/products/sample-linen-2.svg', 'Belgian Linen Fibre Detail', 0, 2);

      const p5Variations = [
        { option: 'Single Swatch (15x15 cm)', quality: '100% Certified Normandy Linen', sku: 'NW-FAB-002-SW15', qty: 50, price: 299 },
        { option: 'Full 6-Color Swatch Set', quality: '100% Certified Normandy Linen', sku: 'NW-FAB-002-PAL6', qty: 30, price: 499 },
        { option: '1 Metre Cut', quality: '100% Certified Normandy Linen', sku: 'NW-FAB-002-MTR', qty: 18, price: 1450 }
      ];

      for (const v of p5Variations) {
        const vRes = insertVar.run(p5Id, v.sku, null, v.quality, v.option, v.price, v.qty);
        insertMovement.run(vRes.lastInsertRowid, p5Id, v.qty, v.qty);
      }

      // PRODUCT 6: Royal Herringbone Suiting Twill Cut
      const p6 = insertProd.run(
        fabricCat.id,
        'Wool & Silk Blends',
        'Royal Herringbone Suiting Twill Cut',
        'royal-herringbone-suiting-twill-cut',
        'NW-FAB-003',
        'A distinguished chevron herringbone weave woven from Australian Super 120s wool interlaced with mulberry silk for subtle luster and natural wrinkle recovery. Ideal for overshirts, safari jackets, and winter formal shirts.',
        JSON.stringify({
          'Composition': '85% Super 120s Merino Wool, 15% Mulberry Silk',
          'Weight': '240 GSM All-Season Structured Twill',
          'Weave Pattern': 'Micro-Chevron Herringbone',
          'Origin': 'Huddersfield, England'
        }),
        399,
        null,
        'per sample',
        5,
        'active',
        0,
        0
      );
      const p6Id = p6.lastInsertRowid;

      insertImg.run(p6Id, '/uploads/products/sample-herringbone-1.svg', 'Herringbone Fabric Presentation', 1, 1);
      insertImg.run(p6Id, '/uploads/products/sample-herringbone-2.svg', 'Herringbone Micro Chevron Weave', 0, 2);

      const p6Variations = [
        { option: 'Individual Swatch (15x15 cm)', quality: 'Fine Merino Wool & Silk Blend', sku: 'NW-FAB-003-SW15', qty: 20, price: 399 },
        { option: '1 Metre Tailoring Length', quality: 'Fine Merino Wool & Silk Blend', sku: 'NW-FAB-003-MTR', qty: 8, price: 2200 }
      ];

      for (const v of p6Variations) {
        const vRes = insertVar.run(p6Id, v.sku, null, v.quality, v.option, v.price, v.qty);
        insertMovement.run(vRes.lastInsertRowid, p6Id, v.qty, v.qty);
      }

      console.log('[Products] Seeded initial products with variations, images, and stock movement logs.');
    } else {
      console.log('[Products] Products already present, skipping.');
    }
  });

  console.log('--- Database Seeding Completed Successfully ---');
}

seedDatabase();
