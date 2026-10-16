-- Nina Weaves E-Commerce Database Schema
-- Compatible with SQLite 3 / node:sqlite

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    subcategory TEXT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    description TEXT,
    specifications TEXT,
    base_price REAL NOT NULL,
    sale_price REAL,
    unit TEXT DEFAULT 'piece',
    low_stock_threshold INTEGER DEFAULT 5,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out')),
    is_featured INTEGER DEFAULT 0,
    is_new_arrival INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    is_primary INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku TEXT UNIQUE NOT NULL,
    size TEXT,
    quality TEXT NOT NULL,
    option_name TEXT,
    price REAL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variation_id INTEGER NOT NULL REFERENCES product_variations(id) ON DELETE RESTRICT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    previous_quantity INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    admin_name TEXT DEFAULT 'System',
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_reference TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    delivery_address TEXT,
    subtotal REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'inquiry' CHECK (status IN ('inquiry', 'confirmed', 'fulfilled', 'cancelled')),
    whatsapp_message_sent TEXT,
    notes TEXT,
    confirmed_at DATETIME,
    fulfilled_at DATETIME,
    cancelled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variation_id INTEGER REFERENCES product_variations(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    size TEXT,
    quality TEXT,
    unit TEXT,
    unit_price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    total_price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_variations_product ON product_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variation ON stock_movements(variation_id);
CREATE INDEX IF NOT EXISTS idx_orders_reference ON orders(order_reference);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
