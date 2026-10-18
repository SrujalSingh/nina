const fs = require('fs');
const path = require('path');
const { db, transaction } = require('../src/config/database');

const uploadsDir = path.resolve(__dirname, '../public/uploads/products');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// SVG Generator Helper
function generatePantsSvg(title, color1, color2, detail) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F9F7F4"/>
      <stop offset="100%" stop-color="#EDE9E3"/>
    </linearGradient>
    <linearGradient id="pantsShade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color1}"/>
      <stop offset="50%" stop-color="${color2}"/>
      <stop offset="100%" stop-color="${color1}"/>
    </linearGradient>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E3DDD4" stroke-width="0.6"/>
    </pattern>
  </defs>
  <rect width="800" height="1000" fill="url(#bgGrad)"/>
  <rect width="800" height="1000" fill="url(#grid)" opacity="0.4"/>
  <rect x="24" y="24" width="752" height="952" fill="none" stroke="#DFD8CE" stroke-width="1"/>
  <ellipse cx="400" cy="880" rx="220" ry="20" fill="#000000" opacity="0.08"/>

  <!-- Atelier Pants Silhouette -->
  <g transform="translate(230, 120)">
    <!-- Waistband -->
    <path d="M 50,40 L 290,40 L 285,90 L 55,90 Z" fill="url(#pantsShade)" stroke="#221F1C" stroke-width="2"/>
    <!-- Belt Loops -->
    <rect x="80" y="36" width="10" height="58" rx="2" fill="#221F1C" opacity="0.6"/>
    <rect x="165" y="36" width="10" height="58" rx="2" fill="#221F1C" opacity="0.6"/>
    <rect x="250" y="36" width="10" height="58" rx="2" fill="#221F1C" opacity="0.6"/>
    <!-- Center Button & Fly -->
    <circle cx="170" cy="65" r="7" fill="#C5A880" stroke="#221F1C" stroke-width="1.5"/>
    <path d="M 170,90 L 170,260" stroke="#221F1C" stroke-width="2"/>
    <!-- Left Leg -->
    <path d="M 55,90 L 40,700 L 140,700 L 165,270 Z" fill="url(#pantsShade)" stroke="#221F1C" stroke-width="2"/>
    <!-- Right Leg -->
    <path d="M 285,90 L 300,700 L 200,700 L 175,270 Z" fill="url(#pantsShade)" stroke="#221F1C" stroke-width="2"/>
    <!-- Crotch curve -->
    <path d="M 165,270 Q 170,285 175,270" stroke="#221F1C" stroke-width="2" fill="none"/>
    <!-- Creases / Pleats -->
    <line x1="90" y1="90" x2="85" y2="700" stroke="#FAF8F5" stroke-width="1.2" opacity="0.4"/>
    <line x1="250" y1="90" x2="255" y2="700" stroke="#FAF8F5" stroke-width="1.2" opacity="0.4"/>
    <!-- Turn-up Hem Cuff -->
    <rect x="38" y="670" width="104" height="30" fill="url(#pantsShade)" stroke="#221F1C" stroke-width="1.5"/>
    <rect x="198" y="670" width="104" height="30" fill="url(#pantsShade)" stroke="#221F1C" stroke-width="1.5"/>
  </g>

  <!-- Editorial Card -->
  <g transform="translate(180, 850)">
    <rect x="0" y="0" width="440" height="70" rx="6" fill="#1C1917" stroke="#3D3731" stroke-width="1"/>
    <text x="20" y="32" font-family="'Cormorant Garamond', Georgia, serif" font-size="20" font-weight="600" fill="#FAF8F5">${title}</text>
    <text x="20" y="52" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="500" letter-spacing="2" fill="#A99585">${detail}</text>
  </g>
</svg>`;
}

function generateJeansSvg(title, color1, color2, detail) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F9F7F4"/>
      <stop offset="100%" stop-color="#EDE9E3"/>
    </linearGradient>
    <linearGradient id="denimShade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color1}"/>
      <stop offset="50%" stop-color="${color2}"/>
      <stop offset="100%" stop-color="${color1}"/>
    </linearGradient>
    <pattern id="denimWeave" width="8" height="8" patternUnits="userSpaceOnUse">
      <path d="M 0 0 L 8 8 M 0 8 L 8 0" stroke="#1B314B" stroke-width="0.7" opacity="0.3"/>
    </pattern>
  </defs>
  <rect width="800" height="1000" fill="url(#bgGrad)"/>
  <rect width="800" height="1000" fill="url(#denimWeave)"/>
  <rect x="24" y="24" width="752" height="952" fill="none" stroke="#DFD8CE" stroke-width="1"/>
  <ellipse cx="400" cy="880" rx="220" ry="20" fill="#000000" opacity="0.08"/>

  <!-- Selvedge Denim Silhouette -->
  <g transform="translate(230, 120)">
    <!-- Waistband -->
    <path d="M 50,40 L 290,40 L 285,95 L 55,95 Z" fill="url(#denimShade)" stroke="#0E1D2D" stroke-width="2.5"/>
    <!-- Copper Rivets -->
    <circle cx="65" cy="115" r="4.5" fill="#C57A38" stroke="#1A1816" stroke-width="1"/>
    <circle cx="275" cy="115" r="4.5" fill="#C57A38" stroke="#1A1816" stroke-width="1"/>
    <circle cx="95" cy="115" r="3.5" fill="#C57A38" stroke="#1A1816" stroke-width="1"/>
    <!-- Brass Button -->
    <circle cx="170" cy="68" r="8" fill="#B8860B" stroke="#1A1816" stroke-width="1.5"/>
    <line x1="50" y1="42" x2="290" y2="42" stroke="#D97706" stroke-dasharray="4 2" stroke-width="1.2"/>
    <line x1="55" y1="92" x2="285" y2="92" stroke="#D97706" stroke-dasharray="4 2" stroke-width="1.2"/>
    <!-- Left Leg -->
    <path d="M 55,95 L 45,700 L 145,700 L 165,280 Z" fill="url(#denimShade)" stroke="#0E1D2D" stroke-width="2"/>
    <!-- Right Leg -->
    <path d="M 285,95 L 295,700 L 195,700 L 175,280 Z" fill="url(#denimShade)" stroke="#0E1D2D" stroke-width="2"/>
    <!-- Whiskering fades -->
    <path d="M 90,140 Q 150,170 160,240" stroke="#89A5C4" stroke-width="6" opacity="0.3" fill="none"/>
    <path d="M 250,140 Q 190,170 180,240" stroke="#89A5C4" stroke-width="6" opacity="0.3" fill="none"/>
    <!-- Gold Contrast Stitching -->
    <path d="M 170,95 L 170,265" stroke="#D97706" stroke-dasharray="4 2" stroke-width="1.5"/>
    <!-- Selvedge ID Turn-up Cuff -->
    <rect x="43" y="660" width="104" height="40" fill="#E6EEF5" stroke="#0E1D2D" stroke-width="1.5"/>
    <line x1="142" y1="660" x2="142" y2="700" stroke="#DC2626" stroke-width="3"/>
    <rect x="193" y="660" width="104" height="40" fill="#E6EEF5" stroke="#0E1D2D" stroke-width="1.5"/>
    <line x1="198" y1="660" x2="198" y2="700" stroke="#DC2626" stroke-width="3"/>
  </g>

  <!-- Editorial Card -->
  <g transform="translate(180, 850)">
    <rect x="0" y="0" width="440" height="70" rx="6" fill="#0C1520" stroke="#1D2E42" stroke-width="1"/>
    <text x="20" y="32" font-family="'Cormorant Garamond', Georgia, serif" font-size="20" font-weight="600" fill="#FAF8F5">${title}</text>
    <text x="20" y="52" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="500" letter-spacing="2" fill="#A99585">${detail}</text>
  </g>
</svg>`;
}

function generateFabricSvg(title, color1, color2, weaveDetail) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F9F7F4"/>
      <stop offset="100%" stop-color="#EDE9E3"/>
    </linearGradient>
    <linearGradient id="swatchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color1}"/>
      <stop offset="50%" stop-color="${color2}"/>
      <stop offset="100%" stop-color="${color1}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#bgGrad)"/>
  <rect x="24" y="24" width="752" height="952" fill="none" stroke="#DFD8CE" stroke-width="1"/>
  
  <g transform="translate(180, 160)">
    <rect x="0" y="0" width="440" height="600" rx="6" fill="#1A1816" stroke="#3D3731" stroke-width="2"/>
    <rect x="40" y="50" width="360" height="240" rx="4" fill="url(#swatchGrad)" stroke="#A99585" stroke-width="1.5"/>
    <path d="M 40,290 L 400,290" stroke="#040707" stroke-width="4" stroke-dasharray="6 4"/>
    
    <rect x="40" y="320" width="360" height="230" rx="4" fill="#FAF8F5" stroke="#E3DDD4" stroke-width="1"/>
    <text x="60" y="360" font-family="'Cormorant Garamond', Georgia, serif" font-size="20" font-weight="600" fill="#1A1A1A">MILL TEXTILE SPECIFICATION</text>
    <line x1="60" y1="375" x2="380" y2="375" stroke="#A99585" stroke-width="1"/>
    
    <text x="60" y="410" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#6B6258">TEXTILE DISCIPLINE:</text>
    <text x="210" y="410" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#1A1A1A">${title}</text>
    
    <text x="60" y="445" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#6B6258">WEAVE ARCHITECTURE:</text>
    <text x="210" y="445" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="500" fill="#1A1A1A">${weaveDetail}</text>
    
    <text x="60" y="480" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#6B6258">CERTIFICATION:</text>
    <text x="210" y="480" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="500" fill="#2E7D32">Museum Grade A • 100% Traceable</text>
  </g>
</svg>`;
}

// Generate new assets
fs.writeFileSync(path.join(uploadsDir, 'pants-wool-1.svg'), generatePantsSvg('The Sartorial Wool Trousers', '#2F343B', '#1E2227', 'Super 120s Italian Worsted Wool'));
fs.writeFileSync(path.join(uploadsDir, 'pants-chino-1.svg'), generatePantsSvg('Belgian Linen Chinos', '#D4C5A9', '#B8A686', 'Pure Normandy Flax Linen'));
fs.writeFileSync(path.join(uploadsDir, 'jeans-selvedge-1.svg'), generateJeansSvg('13.5oz Raw Selvedge Jeans', '#1C2C42', '#0E1724', 'Kurabo Mill Japanese Selvedge'));
fs.writeFileSync(path.join(uploadsDir, 'jeans-indigo-1.svg'), generateJeansSvg('Atelier Washed Denim Jeans', '#3B597B', '#23374D', 'Hand-Distressed 12oz Indigo Stretch'));
fs.writeFileSync(path.join(uploadsDir, 'sample-denim-1.svg'), generateFabricSvg('Denim / Jeans Fabric', '#1C2D44', '#0E1A29', '13.5oz Ring-Spun Selvedge Denim'));
fs.writeFileSync(path.join(uploadsDir, 'sample-suiting-1.svg'), generateFabricSvg('Suiting Fabric', '#383B40', '#25272B', 'Super 130s Merino Worsted Twill'));

console.log('SVG assets created successfully!');

// Now update Database
transaction(() => {
  // 1. Add Pants and Jeans Categories if not exist
  const catStmt = db.prepare(`
    INSERT OR IGNORE INTO categories (name, slug, description, image_url, display_order, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  catStmt.run('Pants', 'pants', 'Precision-tailored trousers and structured chinos crafted from fine wools and Belgian linen.', '/uploads/products/pants-wool-1.svg', 3);
  catStmt.run('Jeans', 'jeans', 'Artisanal selvedge denim and premium washed jeans engineered with timeless sartorial cuts.', '/uploads/products/jeans-selvedge-1.svg', 4);

  // Retrieve category IDs
  const pantsCat = db.prepare("SELECT id FROM categories WHERE slug = 'pants'").get();
  const jeansCat = db.prepare("SELECT id FROM categories WHERE slug = 'jeans'").get();
  const fabricCat = db.prepare("SELECT id FROM categories WHERE slug = 'fabric-samples'").get();

  // 2. Standardize Fabric Samples Subcategories to match:
  // "Shirting Fabric", "Suiting Fabric", "Denim/Jeans Fabric"
  db.prepare("UPDATE products SET subcategory = 'Shirting Fabric' WHERE id IN (4, 5)").run();
  db.prepare("UPDATE products SET subcategory = 'Suiting Fabric' WHERE id = 6").run();

  // 3. Add Denim/Jeans Fabric Swatch Product if not exist
  const existingDenimSwatch = db.prepare("SELECT id FROM products WHERE slug = 'kurabo-selvedge-denim-swatch'").get();
  if (!existingDenimSwatch && fabricCat) {
    const p = db.prepare(`
      INSERT INTO products (
        category_id, subcategory, name, slug, sku, description, specifications,
        base_price, sale_price, unit, low_stock_threshold, status, is_featured, is_new_arrival
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fabricCat.id,
      'Denim/Jeans Fabric',
      'Kurabo 13.5oz Raw Selvedge Denim Swatch Card',
      'kurabo-selvedge-denim-swatch',
      'NW-FAB-004',
      'Authentic Japanese Kurabo mill shuttle-loom selvedge denim swatch. Test fabric thickness, indigo warp richness, and rigid weave density before tailoring your custom denim trousers.',
      JSON.stringify({
        'Composition': '100% Long-Staple Ring Spun Cotton',
        'Weight': '13.5 oz / sq yard',
        'Weave': '3x1 Right Hand Twill',
        'Selvedge ID': 'Classic Redline Selvedge',
        'Dye': 'Pure Indigo Rope Dyed (16 Dips)'
      }),
      450,
      null,
      'metre',
      5,
      'active',
      1,
      1
    );
    const prodId = p.lastInsertRowid;
    db.prepare(`INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order) VALUES (?, ?, ?, 1, 1)`).run(prodId, '/uploads/products/sample-denim-1.svg', 'Selvedge Denim Swatch Card');
    const v = db.prepare(`INSERT INTO product_variations (product_id, sku, size, quality, option_name, price, stock_quantity, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`).run(prodId, 'NW-FAB-004-STD', 'Standard Swatch (15x15cm)', 'Mill Certified', 'Card Sample', 450, 40);
    db.prepare(`INSERT INTO stock_movements (variation_id, product_id, previous_quantity, quantity_change, new_quantity, reason, notes, admin_name) VALUES (?, ?, 0, 40, 40, 'incoming_stock', 'Initial Denim Swatches', 'System')`).run(v.lastInsertRowid, prodId);
  }

  // 4. Add Pants Products if not exist
  const existingPants = db.prepare("SELECT id FROM products WHERE slug = 'the-sartorial-italian-wool-trousers'").get();
  if (!existingPants && pantsCat) {
    const p = db.prepare(`
      INSERT INTO products (
        category_id, subcategory, name, slug, sku, description, specifications,
        base_price, sale_price, unit, low_stock_threshold, status, is_featured, is_new_arrival
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pantsCat.id,
      'Formal Trousers',
      'The Sartorial Italian Wool Trousers',
      'the-sartorial-italian-wool-trousers',
      'NW-PNT-001',
      'Mastercrafted dress trousers cut from superfine Super 120s Italian worsted wool. Features a mid-rise tailored silhouette, extended tab closure, side adjusters, and unhemmed cuffs for custom tailor length.',
      JSON.stringify({
        'Composition': '100% Super 120s Worsted Wool (Biella, Italy)',
        'Rise': 'Classic Mid-Rise Tailored',
        'Waistband': 'Extended Tab with Concealed Hook & Bar',
        'Lining': 'Cupro Knee-Lining for effortless drape',
        'Pockets': 'Slanted front welt pockets, rear buttoned pockets'
      }),
      3499,
      null,
      'pair',
      5,
      'active',
      1,
      1
    );
    const prodId = p.lastInsertRowid;
    db.prepare(`INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order) VALUES (?, ?, ?, 1, 1)`).run(prodId, '/uploads/products/pants-wool-1.svg', 'Sartorial Italian Wool Trousers');
    
    const sizes = [
      ['30', 'Charcoal Grey', 12],
      ['32', 'Charcoal Grey', 15],
      ['34', 'Charcoal Grey', 14],
      ['36', 'Charcoal Grey', 8]
    ];
    for (const [sz, col, qty] of sizes) {
      const v = db.prepare(`INSERT INTO product_variations (product_id, sku, size, quality, option_name, price, stock_quantity, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`).run(
        prodId, `NW-PNT-001-${sz}`, sz, 'Super 120s Wool', `${sz} / ${col}`, 3499, qty
      );
      db.prepare(`INSERT INTO stock_movements (variation_id, product_id, previous_quantity, quantity_change, new_quantity, reason, notes, admin_name) VALUES (?, ?, 0, ?, ?, 'incoming_stock', 'Initial Trousers Stock', 'System')`).run(v.lastInsertRowid, prodId, qty, qty);
    }
  }

  // 5. Add Jeans Product if not exist
  const existingJeans = db.prepare("SELECT id FROM products WHERE slug = 'handcrafted-selvedge-raw-denim-jeans'").get();
  if (!existingJeans && jeansCat) {
    const p = db.prepare(`
      INSERT INTO products (
        category_id, subcategory, name, slug, sku, description, specifications,
        base_price, sale_price, unit, low_stock_threshold, status, is_featured, is_new_arrival
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jeansCat.id,
      'Straight Fit',
      'Handcrafted Selvedge Raw Denim Jeans',
      'handcrafted-selvedge-raw-denim-jeans',
      'NW-JNS-001',
      'Cut and sewn from authentic 13.5oz shuttle-loom Japanese selvedge denim. Unwashed raw denim that personalizes to your life, creasing and fading with time. Features solid copper hardware and chainstitched hems.',
      JSON.stringify({
        'Fabric': '13.5oz Japanese Selvedge Denim',
        'Fit': 'Timeless Straight Tailored Leg',
        'Hardware': 'Solid Antiqued Copper Rivets & Donut Buttons',
        'Stitching': 'Heavyweight Golden Wheat Thread',
        'Selvedge ID': 'Red-Line Shuttle Edge'
      }),
      3999,
      null,
      'pair',
      5,
      'active',
      1,
      1
    );
    const prodId = p.lastInsertRowid;
    db.prepare(`INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order) VALUES (?, ?, ?, 1, 1)`).run(prodId, '/uploads/products/jeans-selvedge-1.svg', 'Handcrafted Selvedge Raw Denim Jeans');
    
    const sizes = [
      ['30', 'Raw Deep Indigo', 10],
      ['32', 'Raw Deep Indigo', 18],
      ['34', 'Raw Deep Indigo', 16],
      ['36', 'Raw Deep Indigo', 9]
    ];
    for (const [sz, col, qty] of sizes) {
      const v = db.prepare(`INSERT INTO product_variations (product_id, sku, size, quality, option_name, price, stock_quantity, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`).run(
        prodId, `NW-JNS-001-${sz}`, sz, '13.5oz Raw Selvedge', `${sz} / ${col}`, 3999, qty
      );
      db.prepare(`INSERT INTO stock_movements (variation_id, product_id, previous_quantity, quantity_change, new_quantity, reason, notes, admin_name) VALUES (?, ?, 0, ?, ?, 'incoming_stock', 'Initial Jeans Stock', 'System')`).run(v.lastInsertRowid, prodId, qty, qty);
    }
  }

  console.log('Categories, Products & Fabric Subcategories updated successfully!');
});
