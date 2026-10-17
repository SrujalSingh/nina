const { db, transaction } = require('../config/database');

const productModel = {
  getAll({
    categorySlug = null,
    subcategory = null,
    search = null,
    status = null,
    isFeatured = null,
    isNewArrival = null,
    includeDeleted = false,
    limit = 50,
    offset = 0
  } = {}) {
    let whereClauses = [];
    let params = [];

    if (!includeDeleted) {
      whereClauses.push('p.is_deleted = 0');
    }

    if (status) {
      whereClauses.push('p.status = ?');
      params.push(status);
    }

    if (categorySlug) {
      whereClauses.push('c.slug = ?');
      params.push(categorySlug);
    }

    if (subcategory) {
      whereClauses.push('(LOWER(p.subcategory) = LOWER(?) OR p.subcategory LIKE ?)');
      params.push(subcategory.trim(), `%${subcategory.trim()}%`);
    }

    if (isFeatured !== null) {
      whereClauses.push('p.is_featured = ?');
      params.push(isFeatured ? 1 : 0);
    }

    if (isNewArrival !== null) {
      whereClauses.push('p.is_new_arrival = ?');
      params.push(isNewArrival ? 1 : 0);
    }

    if (search && search.trim()) {
      whereClauses.push('(p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as primary_image,
        (SELECT COALESCE(SUM(stock_quantity), 0) FROM product_variations WHERE product_id = p.id AND is_active = 1) as total_stock,
        (SELECT COUNT(*) FROM product_variations WHERE product_id = p.id AND is_active = 1) as variation_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    return db.prepare(query).all(...params);
  },

  countAll({
    categorySlug = null,
    subcategory = null,
    search = null,
    status = null,
    isFeatured = null,
    isNewArrival = null,
    includeDeleted = false
  } = {}) {
    let whereClauses = [];
    let params = [];

    if (!includeDeleted) {
      whereClauses.push('p.is_deleted = 0');
    }

    if (status) {
      whereClauses.push('p.status = ?');
      params.push(status);
    }

    if (categorySlug) {
      whereClauses.push('c.slug = ?');
      params.push(categorySlug);
    }

    if (subcategory) {
      whereClauses.push('p.subcategory = ?');
      params.push(subcategory);
    }

    if (isFeatured !== null) {
      whereClauses.push('p.is_featured = ?');
      params.push(isFeatured ? 1 : 0);
    }

    if (isNewArrival !== null) {
      whereClauses.push('p.is_new_arrival = ?');
      params.push(isNewArrival ? 1 : 0);
    }

    if (search && search.trim()) {
      whereClauses.push('(p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
    `;

    const row = db.prepare(query).get(...params);
    return row ? row.total : 0;
  },

  getBySlug(slug) {
    const product = db.prepare(`
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.is_deleted = 0
    `).get(slug);

    if (!product) return null;

    product.images = this.getImages(product.id);
    product.variations = this.getVariations(product.id);
    
    // Parse specs JSON if string
    try {
      product.specificationsObj = product.specifications ? JSON.parse(product.specifications) : {};
    } catch (e) {
      product.specificationsObj = {};
    }

    return product;
  },

  getById(id, includeDeleted = false) {
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? ${includeDeleted ? '' : 'AND p.is_deleted = 0'}
    `;
    const product = db.prepare(query).get(id);
    if (!product) return null;

    product.images = this.getImages(product.id);
    product.variations = this.getVariations(product.id, true);

    try {
      product.specificationsObj = product.specifications ? JSON.parse(product.specifications) : {};
    } catch (e) {
      product.specificationsObj = {};
    }

    return product;
  },

  getImages(productId) {
    return db.prepare(`
      SELECT * FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, display_order ASC, id ASC
    `).all(productId);
  },

  getVariations(productId, includeInactive = false) {
    const query = includeInactive
      ? 'SELECT * FROM product_variations WHERE product_id = ? ORDER BY id ASC'
      : 'SELECT * FROM product_variations WHERE product_id = ? AND is_active = 1 ORDER BY id ASC';
    return db.prepare(query).all(productId);
  },

  getVariationById(id) {
    return db.prepare(`
      SELECT 
        v.*,
        p.name as product_name,
        p.slug as product_slug,
        p.base_price as product_base_price,
        p.unit as product_unit,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as primary_image
      FROM product_variations v
      JOIN products p ON v.product_id = p.id
      WHERE v.id = ?
    `).get(id);
  },

  create({
    category_id,
    subcategory = '',
    name,
    slug,
    sku,
    description = '',
    specifications = '{}',
    base_price,
    sale_price = null,
    unit = 'piece',
    low_stock_threshold = 5,
    status = 'active',
    is_featured = 0,
    is_new_arrival = 0,
    images = [],
    variations = [],
    adminName = 'Admin'
  }) {
    return transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO products (
          category_id, subcategory, name, slug, sku, description, specifications,
          base_price, sale_price, unit, low_stock_threshold, status, is_featured, is_new_arrival
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const res = stmt.run(
        category_id,
        subcategory,
        name,
        slug,
        sku,
        description,
        typeof specifications === 'string' ? specifications : JSON.stringify(specifications),
        base_price,
        sale_price || null,
        unit,
        low_stock_threshold,
        status,
        is_featured ? 1 : 0,
        is_new_arrival ? 1 : 0
      );

      const productId = res.lastInsertRowid;

      // Add Images
      if (images && images.length > 0) {
        const imgStmt = db.prepare(`
          INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
          VALUES (?, ?, ?, ?, ?)
        `);
        images.forEach((img, idx) => {
          imgStmt.run(
            productId,
            typeof img === 'string' ? img : img.image_url,
            (img && img.alt_text) || `${name} Image ${idx + 1}`,
            idx === 0 || (img && img.is_primary) ? 1 : 0,
            idx + 1
          );
        });
      }

      // Add Variations
      if (variations && variations.length > 0) {
        const varStmt = db.prepare(`
          INSERT INTO product_variations (product_id, sku, size, quality, option_name, price, stock_quantity, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const moveStmt = db.prepare(`
          INSERT INTO stock_movements (variation_id, product_id, previous_quantity, quantity_change, new_quantity, reason, notes, admin_name)
          VALUES (?, ?, 0, ?, ?, 'incoming_stock', 'Initial Stock for New Product', ?)
        `);

        variations.forEach((v) => {
          const qty = parseInt(v.stock_quantity || 0, 10);
          const vRes = varStmt.run(
            productId,
            v.sku || `${sku}-${(v.size || v.option_name || 'DEF').replace(/\s+/g, '').toUpperCase()}`,
            v.size || null,
            v.quality || 'Standard',
            v.option_name || null,
            v.price ? parseFloat(v.price) : base_price,
            qty,
            v.is_active !== undefined ? (v.is_active ? 1 : 0) : 1
          );
          if (qty > 0) {
            moveStmt.run(vRes.lastInsertRowid, productId, qty, qty, adminName);
          }
        });
      }

      return productId;
    });
  },

  update(id, data) {
    const {
      category_id,
      subcategory,
      name,
      slug,
      sku,
      description,
      specifications,
      base_price,
      sale_price,
      unit,
      low_stock_threshold,
      status,
      is_featured,
      is_new_arrival
    } = data;

    const stmt = db.prepare(`
      UPDATE products
      SET category_id = ?, subcategory = ?, name = ?, slug = ?, sku = ?, description = ?,
          specifications = ?, base_price = ?, sale_price = ?, unit = ?, low_stock_threshold = ?,
          status = ?, is_featured = ?, is_new_arrival = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    return stmt.run(
      category_id,
      subcategory || '',
      name,
      slug,
      sku,
      description || '',
      typeof specifications === 'string' ? specifications : JSON.stringify(specifications || {}),
      base_price,
      sale_price || null,
      unit || 'piece',
      low_stock_threshold || 5,
      status || 'active',
      is_featured ? 1 : 0,
      is_new_arrival ? 1 : 0,
      id
    );
  },

  softDelete(id) {
    return db.prepare('UPDATE products SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  },

  addImage(productId, imageUrl, altText = '', isPrimary = 0, displayOrder = 0) {
    if (isPrimary) {
      db.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').run(productId);
    }
    const stmt = db.prepare(`
      INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(productId, imageUrl, altText, isPrimary ? 1 : 0, displayOrder);
  },

  removeImage(imageId) {
    return db.prepare('DELETE FROM product_images WHERE id = ?').run(imageId);
  },

  setPrimaryImage(productId, imageId) {
    return transaction(() => {
      db.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').run(productId);
      db.prepare('UPDATE product_images SET is_primary = 1 WHERE id = ? AND product_id = ?').run(imageId, productId);
    });
  },

  addVariation(productId, { sku, size, quality, option_name, price, stock_quantity = 0, is_active = 1, adminName = 'Admin' }) {
    return transaction(() => {
      const qty = parseInt(stock_quantity || 0, 10);
      const res = db.prepare(`
        INSERT INTO product_variations (product_id, sku, size, quality, option_name, price, stock_quantity, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        productId,
        sku,
        size || null,
        quality,
        option_name || null,
        price || null,
        qty,
        is_active ? 1 : 0
      );

      const varId = res.lastInsertRowid;
      if (qty > 0) {
        db.prepare(`
          INSERT INTO stock_movements (variation_id, product_id, previous_quantity, quantity_change, new_quantity, reason, notes, admin_name)
          VALUES (?, ?, 0, ?, ?, 'incoming_stock', 'Initial Variation Stock', ?)
        `).run(varId, productId, qty, qty, adminName);
      }
      return varId;
    });
  },

  updateVariation(varId, { sku, size, quality, option_name, price, is_active }) {
    return db.prepare(`
      UPDATE product_variations
      SET sku = ?, size = ?, quality = ?, option_name = ?, price = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(sku, size || null, quality, option_name || null, price || null, is_active ? 1 : 0, varId);
  },

  deleteVariation(varId) {
    // Check if part of any order item
    const count = db.prepare('SELECT count(*) as c FROM order_items WHERE variation_id = ?').get(varId);
    if (count.c > 0) {
      // Soft disable instead of deleting to preserve order history
      return db.prepare('UPDATE product_variations SET is_active = 0 WHERE id = ?').run(varId);
    }
    // Delete stock movements or let ON DELETE RESTRICT protect it
    return db.prepare('DELETE FROM product_variations WHERE id = ?').run(varId);
  }
};

module.exports = productModel;
