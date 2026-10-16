# Nina Weaves — Atelier & Bespoke Clothing E-Commerce Website with Admin Panel

A production-ready, database-driven clothing brand e-commerce website and inventory management platform built for **Nina Weaves** (`https://nestbeans.com/` and `https://nestbeans.com/admin`).

Developed with **Node.js**, **Express**, **EJS**, and built-in **SQLite** (`node:sqlite`), this platform enables customers to explore luxury bespoke shirts and certified fabric swatches, inspect real-time variation availability, and initiate personal tailoring inquiries directly via WhatsApp. Store administrators can manage products, multi-image galleries, independent variation inventory, stock movements, and confirm orders with atomic inventory deductions.

---

## Table of Contents

1. [Architectural Overview](#architectural-overview)
2. [Project Structure](#project-structure)
3. [Features Implemented (Phases 1–3)](#features-implemented-phases-13)
4. [Prerequisites & Installation](#prerequisites--installation)
5. [Database Setup & Seeding](#database-setup--seeding)
6. [Administrator Setup & Initial Credentials](#administrator-setup--initial-credentials)
7. [Running the Application](#running-the-application)
8. [Testing & Verification](#testing--verification)
9. [Production Deployment Guide for Nestbeans.com](#production-deployment-guide-for-nestbeanscom)
10. [Database Backup & Rollback Procedures](#database-backup--rollback-procedures)

---

## Architectural Overview

- **Runtime**: Node.js (v22+ or v25+ recommended).
- **Web Framework**: Express 5 with Helmet security headers, Gzip compression, session cookies, and rate limiting.
- **Templating Engine**: Server-Side Rendered EJS with mobile-responsive luxury atelier aesthetic.
- **Database**: SQLite with Write-Ahead Logging (`WAL` mode), synchronous disk flushes (`PRAGMA synchronous = NORMAL`), strict foreign key constraints, and savepoint-enabled transactions. Zero native compilation headaches on Windows or Linux.
- **File & Media Storage**: Multer multi-image handler with MIME-type filtering (`image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`) and 5MB size caps.
- **WhatsApp Integration**: Compliant RFC 3986 URL-encoded ordering with prefilled reference codes, line items, and customer address details.
- **Important Inventory Rule**: Inquiries submitted via WhatsApp **do not** automatically deduct stock. Inventory is reserved and deducted atomically only when an administrator explicitly confirms the order.

---

## Project Structure

```
e:\nina weaves\
  ├── package.json              # NPM package metadata and scripts
  ├── server.js                 # Express server entry point & security middleware
  ├── ecosystem.config.js       # PM2 production cluster configuration
  ├── .env.example              # Template environment variables
  ├── .env                      # Active environment configuration
  ├── .gitignore                # Git ignore rules
  ├── data/
  │   └── nina_weaves.sqlite    # Persistent SQLite relational database
  ├── src/
  │   ├── config/
  │   │   └── database.js       # SQLite connection with savepoint transactions
  │   ├── middleware/
  │   │   ├── auth.js           # Admin session authentication & redirect guards
  │   │   ├── rateLimiter.js    # Login brute-force prevention
  │   │   └── upload.js         # Multer product image upload filter
  │   ├── models/
  │   │   ├── schema.sql        # Full DDL schema with relational tables & indices
  │   │   ├── adminModel.js     # Admin user authentication & bcrypt hashing
  │   │   ├── categoryModel.js  # Categories CRUD & display ordering
  │   │   ├── productModel.js   # Products, variations, and image galleries
  │   │   ├── inventoryModel.js # Atomic stock adjustments & audit movements
  │   │   ├── orderModel.js     # Inquiries, order confirmation, & cancellations
  │   │   ├── settingModel.js   # Store settings (WhatsApp #, currency, thresholds)
  │   │   └── policyModel.js    # Editable policy pages & brand story
  │   ├── routes/
  │   │   ├── storefrontRoutes.js # Customer pages: /, /shop, /product, /cart, etc.
  │   │   └── adminRoutes.js      # Admin dashboard: /admin, products, inventory, orders
  │   └── views/
  │       ├── layouts/
  │       │   ├── header.ejs        # Storefront navbar & announcement bar
  │       │   ├── footer.ejs        # Storefront footer & policy links
  │       │   ├── admin-header.ejs  # Admin sidebar & topbar
  │       │   └── admin-footer.ejs  # Admin modal dialogs
  │       ├── storefront/
  │       │   ├── home.ejs          # Editorial homepage & collection spotlights
  │       │   ├── shop.ejs          # Filterable & searchable catalogue
  │       │   ├── product-detail.ejs# Gallery, variation selector, & WhatsApp CTA
  │       │   ├── cart.ejs          # Cart review & WhatsApp checkout form
  │       │   ├── about.ejs         # Brand story & craftsmanship principles
  │       │   ├── contact.ejs       # Atelier studio concierge & WhatsApp link
  │       │   ├── policy.ejs        # Shipping, Returns, Privacy, Terms
  │       │   ├── 404.ejs           # Page not found error page
  │       │   └── 500.ejs           # Server error page
  │       └── admin/
  │           ├── login.ejs         # Secure administrator login
  │           ├── dashboard.ejs     # Metrics cards, alerts, & recent orders
  │           ├── products/
  │           │   ├── list.ejs      # Product table with stock badges
  │           │   └── form.ejs      # Multi-image & variation form
  │           ├── categories/
  │           │   └── list.ejs      # Category ordering & visibility toggles
  │           ├── inventory/
  │           │   ├── list.ejs      # Stock table with adjustment triggers
  │           │   └── history.ejs   # Stock movement audit trail
  │           ├── orders/
  │           │   ├── list.ejs      # Inquiry & order management tabs
  │           │   └── detail.ejs    # Order inspection, confirmation, & cancel
  │           ├── content/
  │           │   ├── edit.ejs      # Hero banner, headlines, announcement
  │           │   └── policies.ejs  # Business policy text editor
  │           ├── settings/
  │           │   └── edit.ejs      # WhatsApp business phone & store currency
  │           └── account/
  │               └── edit.ejs      # Admin profile & password update
  ├── public/
  │   ├── css/
  │   │   ├── storefront.css    # Luxury styling, responsive grids, typography
  │   │   └── admin.css         # Clean dashboard UI with stat cards & modals
  │   ├── js/
  │   │   ├── storefront.js     # Mobile navigation & UI utilities
  │   │   ├── cart.js           # Client cart state & WhatsApp link generator
  │   │   ├── product-detail.js # Reactive size/quality selector & gallery
  │   │   └── admin.js          # Stock adjustment modal & variation rows
  │   ├── images/
  │   │   ├── logo.svg          # Atelier brand monogram logo
  │   │   └── hero-banner.svg   # High-resolution hero drape illustration
  │   └── uploads/
  │       └── products/         # Product gallery photography
  └── scripts/
      ├── generate-assets.js    # Generates curated SVG sample imagery
      ├── seed.js               # Database seeder for admin, categories, & products
      ├── test-phase1.js        # Phase 1 automated test suite
      ├── test-phase2.js        # Phase 2 automated test suite
      └── test-e2e.js           # Phase 3 comprehensive end-to-end journey tests
```

---

## Features Implemented (Phases 1–3)

### Phase 1: Customer Storefront & Product Catalogue
- **Brand Aesthetic**: Tailored luxury styling using Cormorant Garamond and Plus Jakarta Sans, warm ivory backgrounds, gold accents, and responsive navigation.
- **Default Categories**: "Shirts" and "Fabric Samples" pre-configured and editable by admin.
- **Product Details**: Multi-image thumbnail gallery, specifications table, variation selectors for Sizes (XS, S, M, L, XL, XXL, Custom Size) and Fabric Qualities / Swatch Options.
- **Dynamic Availability**: Real-time stock badge ("In Stock", "Only X remaining", "Sold Out"). Disables buying out-of-stock variations.
- **Customer Cart**: Supports multiple products, quantities, size/quality summaries, and subtotal calculations.
- **WhatsApp Checkout**: Generates unique reference code (`NW-YYYYMMDD-XXXX`), builds RFC-encoded WhatsApp message with customer name, phone, address, and line items. Opens directly to the configured WhatsApp number.
- **Inventory Protection**: Placing an inquiry **does not** deduct stock.
- **Essential Pages**: Home, Shop All, Shirts, Fabric Samples, Product Details, Cart, About Us, Contact Us, Shipping & Delivery Policy, Return & Exchange Policy, Privacy Policy, Terms & Conditions.

### Phase 2: Secure Admin Panel & Inventory Management
- **Protected Route**: `https://nestbeans.com/admin` redirects to login when unauthenticated and dashboard when authenticated.
- **Authentication**: Bcrypt password hashing, session cookies (`httpOnly`, `sameSite: 'lax'`), rate limiting (10 attempts / 15 mins), and safe error handling.
- **Dashboard**: Summary cards for Active Products, Total Variations, In-Stock Units, Low-Stock Products, and Out-of-Stock Variations.
- **Product Management**: Full CRUD for products, multi-image upload with primary image selection, and independent variation inventory. Soft-delete archival prevents orphan order records.
- **Dedicated Inventory Screen**: Searchable and filterable by category, low-stock, and out-of-stock.
- **Stock Movements Audit Trail**: Tracks every addition, deduction, physical count reconcile, damaged write-off, and confirmed sale with timestamp and admin attribution.
- **Order Confirmation Workflow**: Allows admins to review incoming inquiries, confirm sales with atomic stock deduction, fulfill orders, or cancel orders (which restores stock).
- **Website Content & Settings**: Live editing of WhatsApp business number, store currency (INR ₹), contact details, hero banner copy & imagery, and website policies.

### Phase 3: Integration, Security & Performance
- **Relational Integrity**: Complete schema with foreign keys, cascaded variation deletes, restricted category drops, and indices.
- **Atomic Transactions**: Savepoint-enabled transactions guarantee rollback on stock deduction failure or insufficient inventory.
- **SEO & Discoverability**: Semantic HTML, canonical tags, automated XML sitemap (`/sitemap.xml`), robots exclusion (`/robots.txt`), and Schema.org Product JSON-LD structured data for Google Rich Snippets.
- **Automated Testing**: 100% pass rate across all 10 user journey steps and edge cases.

---

## Prerequisites & Installation

### 1. Prerequisites
- **Node.js**: Version 22.0.0 or higher (built-in SQLite `node:sqlite` support).
- **NPM**: Version 10 or higher.

### 2. Installation
Open PowerShell or your preferred terminal in the project directory:

```bash
cd "e:\nina weaves"
npm install
```

---

## Database Setup & Seeding

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Initialize and seed the database with initial categories, products, default settings, and admin user:
   ```bash
   npm run seed
   ```
3. Generate image assets:
   ```bash
   npm run generate-assets
   ```

---

## Administrator Setup & Initial Credentials

The initial administrator account is configured through your `.env` file:

```env
ADMIN_INITIAL_USERNAME=admin
ADMIN_INITIAL_PASSWORD=Admin@NinaWeaves2026!
ADMIN_INITIAL_EMAIL=admin@nestbeans.com
ADMIN_INITIAL_NAME="Store Administrator"
```

### Logging In
1. Visit: `http://localhost:3000/admin` (or `https://nestbeans.com/admin`).
2. Enter username: `admin`
3. Enter password: `Admin@NinaWeaves2026!`
4. After logging in, navigate to **Admin Account** in the sidebar to change your password and update your profile.

---

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Or using PM2 for process resilience:
```bash
npx pm2 start ecosystem.config.js --env production
```

Access the application:
- Customer Storefront: `http://localhost:3000/`
- Admin Portal: `http://localhost:3000/admin`

---

## Testing & Verification

Run the comprehensive end-to-end test suite:
```bash
npm test
```

Run specific phase test suites:
```bash
npm run test:phase1
npm run test:phase2
```

All test suites verify:
- Unauthenticated route rejection
- Login brute-force rate limiting
- Product creation and storefront category reflection
- Reactive variation availability and stock checks
- WhatsApp message encoding and order inquiry creation
- Strict inventory non-deduction on inquiry submission
- Atomic stock deduction upon admin order confirmation
- Stock restoration upon order cancellation
- Schema.org structured data and XML sitemap validation

---

## Production Deployment Guide for Nestbeans.com

### Environment Inspection Checklist
Before deploying to `nestbeans.com`:
1. **Hosting Environment**: Verify if the server is a VPS/Dedicated server (Ubuntu/Debian/CentOS) or a shared cPanel/Plesk host with "Setup Node.js App".
2. **Node.js Version**: Ensure Node.js v22.x or v25.x is active on the host.
3. **Existing Root Website**: If `https://nestbeans.com/` currently hosts an existing website that must be retained alongside the clothing store:
   - Configure a reverse proxy rule (e.g. Nginx `location /clothing/` or dedicated subdomain `atelier.nestbeans.com`).
   - If this application represents the entire website, map the root `/` and `/admin` paths directly.
4. **HTTPS / SSL**: Ensure an SSL certificate (Let's Encrypt or Cloudflare) is active so that secure cookies (`secure: true`) operate properly.

### Option A: Standard VPS / Cloud Server (Nginx + PM2)

1. **Clone or transfer project files** to `/var/www/nina-weaves`.
2. **Install dependencies**:
   ```bash
   npm ci --production
   ```
3. **Configure production environment**:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Set `NODE_ENV=production`, configure a unique 64-character `SESSION_SECRET`, and enter the business owner's verified WhatsApp phone number.
4. **Seed database**:
   ```bash
   node scripts/seed.js
   ```
5. **Start with PM2**:
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```
6. **Nginx Reverse Proxy Configuration** (`/etc/nginx/sites-available/nestbeans.com`):
   ```nginx
   server {
       listen 80;
       server_name nestbeans.com www.nestbeans.com;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name nestbeans.com www.nestbeans.com;

       ssl_certificate /etc/letsencrypt/live/nestbeans.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/nestbeans.com/privkey.pem;

       client_max_body_size 10M;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
7. Test and reload Nginx:
   ```bash
   nginx -t && systemctl reload nginx
   ```

### Option B: cPanel / Plesk Hosting with Node.js Selector

1. In cPanel, navigate to **Software > Setup Node.js App**.
2. Click **Create Application**.
3. Select Node.js version **22.x** or higher.
4. Set Application root: `nina-weaves`.
5. Set Application URL: `nestbeans.com`.
6. Set Application startup file: `server.js`.
7. In the environment variables section, add `NODE_ENV=production` and `SESSION_SECRET`.
8. Click **Run NPM Install**, then run `node scripts/seed.js` from the cPanel terminal.
9. Click **Restart Application**.

---

## Database Backup & Rollback Procedures

### Automated Database Backup
The persistent database resides at `data/nina_weaves.sqlite`. Because SQLite is operating in WAL mode, backups can be taken without locking the application:

```bash
# SQLite Online Vacuum Backup (Zero-downtime)
node -e "const { db } = require('./src/config/database'); db.exec('VACUUM INTO \"./data/backup_' + Date.now() + '.sqlite\"'); console.log('Backup created!');"
```

Or configure a daily cron job:
```bash
0 2 * * * cp /var/www/nina-weaves/data/nina_weaves.sqlite /var/backups/nina_weaves_$(date +\%F).sqlite
```

### Rollback Procedure
If a deployment rollback is required:
1. Stop the application:
   ```bash
   pm2 stop nina-weaves
   ```
2. Replace `data/nina_weaves.sqlite` with your last known good backup:
   ```bash
   cp /var/backups/nina_weaves_PREVIOUS.sqlite ./data/nina_weaves.sqlite
   ```
3. Restart the application:
   ```bash
   pm2 start nina-weaves
   ```
