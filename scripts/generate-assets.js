const fs = require('fs');
const path = require('path');

const imagesDir = path.resolve(__dirname, '../public/images');
const uploadsDir = path.resolve(__dirname, '../public/uploads/products');

[imagesDir, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Brand Logo SVG
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 60" width="320" height="60">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C5A880"/>
      <stop offset="100%" stop-color="#8C6E42"/>
    </linearGradient>
  </defs>
  <g transform="translate(10, 8)">
    <!-- Elegant Woven Monogram Icon -->
    <path d="M 0,22 C 0,10 10,0 22,0 C 34,0 44,10 44,22 C 44,34 34,44 22,44 C 10,44 0,34 0,22 Z" fill="none" stroke="url(#goldGrad)" stroke-width="1.5"/>
    <path d="M 14,32 L 14,12 L 20,24 L 24,24 L 30,12 L 30,32" fill="none" stroke="url(#goldGrad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="22" cy="7" r="2" fill="#C5A880"/>
  </g>
  <text x="70" y="30" font-family="'Playfair Display', 'Cormorant Garamond', serif" font-size="24" font-weight="600" letter-spacing="3" fill="#1A1A1A">NINA WEAVES</text>
  <text x="72" y="44" font-family="'Plus Jakarta Sans', 'Inter', sans-serif" font-size="9" font-weight="500" letter-spacing="4" fill="#8C6E42">ATELIER &amp; BESPOKE</text>
</svg>`;

// Hero Banner SVG
const heroBannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 700" width="1600" height="700">
  <defs>
    <linearGradient id="heroBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1A1816"/>
      <stop offset="50%" stop-color="#24201D"/>
      <stop offset="100%" stop-color="#141312"/>
    </linearGradient>
    <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D4C3B3"/>
      <stop offset="50%" stop-color="#F2EBE4"/>
      <stop offset="100%" stop-color="#A3886A"/>
    </linearGradient>
    <pattern id="linenTexture" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 0,20 L 40,20 M 20,0 L 20,40" stroke="#332D28" stroke-width="0.8" opacity="0.35"/>
      <path d="M 0,0 L 40,40 M 40,0 L 0,40" stroke="#332D28" stroke-width="0.4" opacity="0.2"/>
    </pattern>
    <radialGradient id="ambientGlow" cx="70%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#C5A880" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#141312" stop-opacity="0"/>
    </radialGradient>
  </defs>
  
  <rect width="1600" height="700" fill="url(#heroBg)"/>
  <rect width="1600" height="700" fill="url(#linenTexture)"/>
  <rect width="1600" height="700" fill="url(#ambientGlow)"/>
  
  <!-- Subtle Tailoring Silhouette Curves -->
  <g opacity="0.4" transform="translate(700, 0)">
    <path d="M 200,0 Q 350,200 300,450 T 550,700" fill="none" stroke="#C5A880" stroke-width="1.2"/>
    <path d="M 260,0 Q 420,250 370,500 T 620,700" fill="none" stroke="#EFECE6" stroke-width="0.8" opacity="0.5"/>
    <path d="M 320,0 Q 480,300 440,550 T 680,700" fill="none" stroke="#A3886A" stroke-width="1" opacity="0.3"/>
  </g>
</svg>`;

// Helper to generate elegant product SVGs
function createProductSvg(title, subtitle, type, mainColor, accentColor, detailNote, angleText = 'Front View') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F9F7F4"/>
      <stop offset="100%" stop-color="#EDE9E3"/>
    </linearGradient>
    <linearGradient id="fabricShade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${mainColor}"/>
      <stop offset="50%" stop-color="${accentColor}"/>
      <stop offset="100%" stop-color="${mainColor}"/>
    </linearGradient>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E3DDD4" stroke-width="0.6"/>
    </pattern>
  </defs>
  
  <rect width="800" height="1000" fill="url(#bgGrad)"/>
  <rect width="800" height="1000" fill="url(#grid)" opacity="0.4"/>
  
  <!-- Subtle Framing Border -->
  <rect x="24" y="24" width="752" height="952" fill="none" stroke="#DFD8CE" stroke-width="1"/>
  
  <!-- Studio Lighting Shadow -->
  <ellipse cx="400" cy="820" rx="260" ry="24" fill="#000000" opacity="0.08"/>
  <ellipse cx="400" cy="818" rx="210" ry="14" fill="#000000" opacity="0.06"/>
  
  ${type === 'shirt' ? `
    <!-- Shirt Outline -->
    <g transform="translate(160, 150)">
      <!-- Shoulders & Torso -->
      <path d="M 120,40 L 240,10 L 360,40 L 440,160 L 390,210 L 350,150 L 360,620 L 120,620 L 130,150 L 90,210 L 40,160 Z" fill="url(#fabricShade)" stroke="#2C2825" stroke-width="1.5"/>
      <!-- Tailoring Seams -->
      <line x1="240" y1="80" x2="240" y2="620" stroke="#332E2A" stroke-width="1.8" opacity="0.5"/>
      <line x1="230" y1="80" x2="230" y2="620" stroke="#FFF" stroke-width="0.8" opacity="0.3"/>
      <!-- Collar -->
      <path d="M 180,30 L 240,95 L 300,30 L 270,12 L 240,40 L 210,12 Z" fill="${accentColor}" stroke="#1E1B18" stroke-width="2"/>
      <path d="M 240,40 L 240,95" stroke="#A89F91" stroke-width="1.5"/>
      <!-- Mother of Pearl Buttons -->
      <circle cx="240" cy="140" r="5" fill="#FAF7F2" stroke="#B0A696" stroke-width="1"/>
      <circle cx="240" cy="210" r="5" fill="#FAF7F2" stroke="#B0A696" stroke-width="1"/>
      <circle cx="240" cy="280" r="5" fill="#FAF7F2" stroke="#B0A696" stroke-width="1"/>
      <circle cx="240" cy="350" r="5" fill="#FAF7F2" stroke="#B0A696" stroke-width="1"/>
      <circle cx="240" cy="420" r="5" fill="#FAF7F2" stroke="#B0A696" stroke-width="1"/>
      <circle cx="240" cy="490" r="5" fill="#FAF7F2" stroke="#B0A696" stroke-width="1"/>
      <circle cx="240" cy="560" r="5" fill="#FAF7F2" stroke="#B0A696" stroke-width="1"/>
      <!-- Breast Pocket -->
      <path d="M 280,180 L 330,180 L 330,240 L 305,255 L 280,240 Z" fill="none" stroke="#2C2825" stroke-width="1.2" opacity="0.7"/>
    </g>
  ` : `
    <!-- Fabric Sample Swatches Presentation -->
    <g transform="translate(180, 160)">
      <!-- Swatch Folder Backing -->
      <rect x="0" y="0" width="440" height="600" rx="6" fill="#2B2724" stroke="#4A443E" stroke-width="2"/>
      
      <!-- Fabric Swatch 1 Primary -->
      <rect x="40" y="50" width="360" height="240" rx="4" fill="url(#fabricShade)" stroke="#8C7A68" stroke-width="1.5"/>
      <!-- Thread Weave Texture Overlay -->
      <g opacity="0.3" stroke="#FAF8F5" stroke-width="1">
        ${Array.from({length: 12}).map((_, i) => `<line x1="40" y1="${60 + i * 19}" x2="400" y2="${60 + i * 19}" stroke-dasharray="3 3"/>`).join('')}
      </g>
      <!-- Pinked Pinking Shears Edge Effect -->
      <path d="M 40,290 L 400,290" stroke="#1A1816" stroke-width="3" stroke-dasharray="6 4"/>
      
      <!-- Swatch Spec Card -->
      <rect x="40" y="320" width="360" height="230" rx="4" fill="#FAF8F5" stroke="#E3DDD4" stroke-width="1"/>
      <text x="60" y="360" font-family="'Playfair Display', serif" font-size="18" font-weight="600" fill="#1A1A1A">AUTHENTIC MILL SPECIFICATION</text>
      <line x1="60" y1="375" x2="380" y2="375" stroke="#C5A880" stroke-width="1"/>
      
      <text x="60" y="410" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#6B6258">COMPOSITION:</text>
      <text x="180" y="410" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="500" fill="#1A1A1A">${subtitle}</text>
      
      <text x="60" y="440" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#6B6258">WEAVE &amp; COUNT:</text>
      <text x="180" y="440" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="500" fill="#1A1A1A">${detailNote}</text>
      
      <text x="60" y="470" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#6B6258">TEST CERTIFICATE:</text>
      <text x="180" y="470" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="500" fill="#2E7D32">OEKO-TEX® Grade A</text>
      
      <rect x="60" y="500" width="120" height="24" rx="3" fill="#EFECE6"/>
      <text x="75" y="516" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="600" letter-spacing="1" fill="#756755">SWATCH CERTIFIED</text>
    </g>
  `}
  
  <!-- Angle Badge -->
  <rect x="50" y="50" width="130" height="28" rx="14" fill="#1A1A1A"/>
  <text x="66" y="68" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="600" letter-spacing="2" fill="#EFECE6">${angleText.toUpperCase()}</text>
  
  <!-- Product Label at Bottom -->
  <g transform="translate(60, 890)">
    <text x="0" y="0" font-family="'Playfair Display', serif" font-size="22" font-weight="600" fill="#1A1A1A">${title}</text>
    <text x="0" y="24" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="500" letter-spacing="1.5" fill="#8C7456">${subtitle} • ${detailNote}</text>
  </g>
</svg>`;
}

// Write Base SVGs
fs.writeFileSync(path.join(imagesDir, 'logo.svg'), logoSvg);
fs.writeFileSync(path.join(imagesDir, 'hero-banner.svg'), heroBannerSvg);

// Product 1: Heritage Royal Oxford Shirt (White)
fs.writeFileSync(path.join(uploadsDir, 'shirt-oxford-1.svg'), 
  createProductSvg('Heritage Royal Oxford Shirt', '100% Two-Ply Cotton', 'shirt', '#FFFFFF', '#EDEBE6', 'Pinpoint Oxford Weave', 'Main Gallery'));
fs.writeFileSync(path.join(uploadsDir, 'shirt-oxford-2.svg'), 
  createProductSvg('Heritage Royal Oxford Shirt', 'Collar & Mother of Pearl Detail', 'shirt', '#F4F2ED', '#E6E2D8', 'Hand-Attached Buttons', 'Collar Detail'));
fs.writeFileSync(path.join(uploadsDir, 'shirt-oxford-3.svg'), 
  createProductSvg('Heritage Royal Oxford Shirt', 'Cuff & Tailored Placket', 'shirt', '#FAF8F5', '#DFD9CE', 'Single Button Barrel Cuff', 'Cuff & Texture'));

// Product 2: Artisan Belgian Linen Shirt (Sage Olive)
fs.writeFileSync(path.join(uploadsDir, 'shirt-linen-1.svg'), 
  createProductSvg('Artisan Belgian Linen Shirt', 'Pure Normandy Flax Linen', 'shirt', '#6B7A68', '#4E5A4B', 'Breathable Slub Weave', 'Front View'));
fs.writeFileSync(path.join(uploadsDir, 'shirt-linen-2.svg'), 
  createProductSvg('Artisan Belgian Linen Shirt', 'Camp Collar & Stitching', 'shirt', '#768573', '#566453', 'Hand-Rolled Hem', 'Close-up Detail'));
fs.writeFileSync(path.join(uploadsDir, 'shirt-linen-3.svg'), 
  createProductSvg('Artisan Belgian Linen Shirt', 'Relaxed Tailored Silhouette', 'shirt', '#5E6B5B', '#455043', 'Pre-Washed Soft Finish', 'Back Angle'));

// Product 3: Midnight Giza Formal Shirt (Navy Blue)
fs.writeFileSync(path.join(uploadsDir, 'shirt-giza-1.svg'), 
  createProductSvg('Midnight Egyptian Giza Shirt', 'Giza 87 Extra-Long Staple', 'shirt', '#1D2A44', '#131D31', 'Silky Twill Luster', 'Front Studio'));
fs.writeFileSync(path.join(uploadsDir, 'shirt-giza-2.svg'), 
  createProductSvg('Midnight Egyptian Giza Shirt', 'Spread Collar Detail', 'shirt', '#243352', '#18243C', 'Removable Brass Stays', 'Collar View'));
fs.writeFileSync(path.join(uploadsDir, 'shirt-giza-3.svg'), 
  createProductSvg('Midnight Egyptian Giza Shirt', 'French Cuff Architecture', 'shirt', '#162238', '#0F182A', 'Double Cuff Links Compatible', 'Cuff Architecture'));

// Fabric Sample 1: Imperial 100s Giza Cotton Swatch
fs.writeFileSync(path.join(uploadsDir, 'sample-giza-1.svg'), 
  createProductSvg('Imperial 100s Giza Swatch Card', '100s Two-Fold Cotton', 'sample', '#FAF6EE', '#E2D8C3', 'Count 100/2 Twill', 'Swatch Book'));
fs.writeFileSync(path.join(uploadsDir, 'sample-giza-2.svg'), 
  createProductSvg('Imperial 100s Giza Swatch Card', 'Texture & Drape Test', 'sample', '#F5EEE1', '#D8CBB2', 'Lustrous Silky Touch', 'Macro Weave'));

// Fabric Sample 2: Organic Pure Belgian Linen Swatches
fs.writeFileSync(path.join(uploadsDir, 'sample-linen-1.svg'), 
  createProductSvg('Belgian Linen Swatch Palette', '100% Certified Flax', 'sample', '#D8CDBE', '#B8A893', 'Natural Undyed & Washed', 'Palette Card'));
fs.writeFileSync(path.join(uploadsDir, 'sample-linen-2.svg'), 
  createProductSvg('Belgian Linen Swatch Palette', 'Drape & Breathability Swatch', 'sample', '#C9BCAB', '#A6957F', '185 GSM Weight', 'Fibre Analysis'));

// Fabric Sample 3: Royal Herringbone Suiting Twill
fs.writeFileSync(path.join(uploadsDir, 'sample-herringbone-1.svg'), 
  createProductSvg('Royal Herringbone Fabric Cut', 'Fine Merino & Silk Blend', 'sample', '#3D424A', '#2B3037', 'Chevron Textured Weave', 'Fabric Cut'));
fs.writeFileSync(path.join(uploadsDir, 'sample-herringbone-2.svg'), 
  createProductSvg('Royal Herringbone Fabric Cut', 'High Density Weave Detail', 'sample', '#4D535D', '#343A43', 'Crease-Resistant 240 GSM', 'Close Detail'));

console.log('Assets created successfully in public/images/ and public/uploads/products/!');
