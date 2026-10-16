const { db, transaction } = require('../config/database');

const inventoryModel = {
  getAll({
    search = null,
    categoryId = null,
    filter = null, // 'all', 'low_stock', 'out_of_stock'
    limit = 100,
    offset = 0
  } = {}) {
    let whereClauses = ['p.is_deleted = 0', 'v.is_active = 1'];
    let params = [];

    if (categoryId) {
      whereClauses.push('p.category_id = ?');
      params.push(categoryId);
    }

    if (search && search.trim()) {
      whereClauses.push('(p.name LIKE ? OR v.sku LIKE ? OR v.quality LIKE ? OR v.size LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (filter === 'low_stock') {
      whereClauses.push('v.stock_quantity > 0 AND v.stock_quantity <= p.low_stock_threshold');
    } else if (filter === 'out_of_stock') {
      whereClauses.push('v.stock_quantity = 0');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        v.id as variation_id,
        v.sku as variation_sku,
        v.size,
        v.quality,
        v.option_name,
        v.price as variation_price,
        v.stock_quantity,
        p.id as product_id,
        p.name as product_name,
        p.slug as product_slug,
        p.sku as product_base_sku,
        p.base_price,
        p.unit,
        p.low_stock_threshold,
        p.status as product_status,
        c.name as category_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as primary_image
      FROM product_variations v
      JOIN products p ON v.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
      ORDER BY 
        CASE 
          WHEN v.stock_quantity = 0 THEN 1 
          WHEN v.stock_quantity <= p.low_stock_threshold THEN 2 
          ELSE 3 
        END,
        p.name ASC, 
        v.id ASC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    return db.prepare(query).all(...params);
  },

  adjustStock({
    variationId,
    adjustmentType, // 'add', 'remove', 'physical_count', 'damaged', 'sold', 'transfer'
    quantityValue,  // could be delta or absolute new count
    reason,         // user description or category
    notes = '',
    adminName = 'Administrator',
    orderId = null,
    allowNegative = false
  }) {
    return transaction(() => {
      // 1. Fetch current variation with lock in transaction
      const variation = db.prepare(`
        SELECT v.*, p.low_stock_threshold, p.name as product_name
        FROM product_variations v
        JOIN products p ON v.product_id = p.id
        WHERE v.id = ?
      `).get(variationId);

      if (!variation) {
        throw new Error(`Variation with ID ${variationId} not found.`);
      }

      const prevQty = variation.stock_quantity;
      let newQty = prevQty;
      let delta = 0;

      const numVal = parseInt(quantityValue, 10);
      if (isNaN(numVal)) {
        throw new Error('Quantity value must be a valid integer.');
      }

      switch (adjustmentType) {
        case 'add':
        case 'incoming_stock':
          if (numVal <= 0) throw new Error('Added quantity must be greater than zero.');
          delta = numVal;
          newQty = prevQty + delta;
          break;

        case 'remove':
        case 'damaged':
        case 'sold':
          if (numVal <= 0) throw new Error('Removed quantity must be greater than zero.');
          delta = -numVal;
          newQty = prevQty + delta;
          break;

        case 'physical_count':
        case 'set':
          if (numVal < 0 && !allowNegative) throw new Error('Physical count quantity cannot be negative.');
          delta = numVal - prevQty;
          newQty = numVal;
          break;

        default:
          // Direct delta
          delta = numVal;
          newQty = prevQty + delta;
      }

      if (newQty < 0 && !allowNegative) {
        throw new Error(`Insufficient stock. Current stock is ${prevQty}, requested adjustment leaves ${newQty}. Negative inventory is not allowed.`);
      }

      // 2. Update variation table
      db.prepare(`
        UPDATE product_variations
        SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newQty, variationId);

      // 3. Record in stock_movements audit log
      const reasonText = reason || adjustmentType;
      const logStmt = db.prepare(`
        INSERT INTO stock_movements (
          variation_id, product_id, previous_quantity, quantity_change, new_quantity,
          reason, notes, admin_name, order_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      logStmt.run(
        variationId,
        variation.product_id,
        prevQty,
        delta,
        newQty,
        reasonText,
        notes || '',
        adminName,
        orderId || null
      );

      // 4. Update product status if all variations out of stock
      const stockSum = db.prepare(`
        SELECT COALESCE(SUM(stock_quantity), 0) as total
        FROM product_variations
        WHERE product_id = ? AND is_active = 1
      `).get(variation.product_id);

      if (stockSum.total === 0) {
        db.prepare("UPDATE products SET status = 'sold_out', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(variation.product_id);
      } else if (variation.product_name) {
        // If product was sold_out and now has stock, restore to active
        db.prepare("UPDATE products SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'sold_out'").run(variation.product_id);
      }

      return {
        variationId,
        previousQuantity: prevQty,
        quantityChange: delta,
        newQuantity: newQty,
        reason: reasonText
      };
    });
  },

  getMovements({ variationId = null, productId = null, limit = 50, offset = 0 } = {}) {
    let whereClauses = [];
    let params = [];

    if (variationId) {
      whereClauses.push('sm.variation_id = ?');
      params.push(variationId);
    }

    if (productId) {
      whereClauses.push('sm.product_id = ?');
      params.push(productId);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        sm.*,
        p.name as product_name,
        p.slug as product_slug,
        v.sku as variation_sku,
        v.size,
        v.quality,
        v.option_name,
        o.order_reference
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN product_variations v ON sm.variation_id = v.id
      LEFT JOIN orders o ON sm.order_id = o.id
      ${whereSql}
      ORDER BY sm.id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    return db.prepare(query).all(...params);
  },

  getDashboardStats() {
    // 1. Total Active Products
    const activeProducts = db.prepare("SELECT count(*) as c FROM products WHERE is_deleted = 0 AND status = 'active'").get().c;
    
    // 2. Total Variations
    const totalVariations = db.prepare(`
      SELECT count(*) as c 
      FROM product_variations v 
      JOIN products p ON v.product_id = p.id 
      WHERE p.is_deleted = 0 AND v.is_active = 1
    `).get().c;

    // 3. Total Inventory Units
    const totalUnits = db.prepare(`
      SELECT COALESCE(SUM(v.stock_quantity), 0) as s 
      FROM product_variations v 
      JOIN products p ON v.product_id = p.id 
      WHERE p.is_deleted = 0 AND v.is_active = 1
    `).get().s;

    // 4. Low-stock products
    const lowStockCount = db.prepare(`
      SELECT count(DISTINCT p.id) as c
      FROM products p
      JOIN product_variations v ON p.id = v.product_id
      WHERE p.is_deleted = 0 AND v.is_active = 1 AND v.stock_quantity > 0 AND v.stock_quantity <= p.low_stock_threshold
    `).get().c;

    // 5. Out-of-stock variations
    const outOfStockCount = db.prepare(`
      SELECT count(*) as c
      FROM product_variations v
      JOIN products p ON v.product_id = p.id
      WHERE p.is_deleted = 0 AND v.is_active = 1 AND v.stock_quantity = 0
    `).get().c;

    // 6. Recent Stock Movements
    const recentMovements = this.getMovements({ limit: 6 });

    // 7. Recent Orders
    const recentOrders = db.prepare(`
      SELECT * FROM orders
      ORDER BY id DESC
      LIMIT 6
    `).all();

    // 8. Low-stock variation alerts list
    const lowStockAlerts = db.prepare(`
      SELECT 
        v.id as variation_id,
        v.sku,
        v.size,
        v.quality,
        v.option_name,
        v.stock_quantity,
        p.id as product_id,
        p.name as product_name,
        p.low_stock_threshold
      FROM product_variations v
      JOIN products p ON v.product_id = p.id
      WHERE p.is_deleted = 0 AND v.is_active = 1 AND v.stock_quantity <= p.low_stock_threshold
      ORDER BY v.stock_quantity ASC
      LIMIT 8
    `).all();

    return {
      activeProducts,
      totalVariations,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      recentMovements,
      recentOrders,
      lowStockAlerts
    };
  }
};

module.exports = inventoryModel;
