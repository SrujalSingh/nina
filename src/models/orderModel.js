const { db, transaction } = require('../config/database');
const inventoryModel = require('./inventoryModel');

function generateOrderReference() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `NW-${dateStr}-${rand}`;
}

const orderModel = {
  createInquiry({
    customerName,
    customerPhone,
    customerEmail = '',
    deliveryAddress = '',
    items = [], // Array of { productId, variationId, productName, sku, size, quality, unit, unitPrice, quantity }
    notes = '',
    whatsappMessage = ''
  }) {
    return transaction(() => {
      let subtotal = 0;
      items.forEach(item => {
        subtotal += (parseFloat(item.unitPrice) * parseInt(item.quantity, 10));
      });

      const orderRef = generateOrderReference();

      const stmt = db.prepare(`
        INSERT INTO orders (
          order_reference, customer_name, customer_phone, customer_email,
          delivery_address, subtotal, currency, status, whatsapp_message_sent, notes
        ) VALUES (?, ?, ?, ?, ?, ?, 'INR', 'inquiry', ?, ?)
      `);

      const res = stmt.run(
        orderRef,
        customerName,
        customerPhone,
        customerEmail || '',
        deliveryAddress || '',
        subtotal,
        whatsappMessage || '',
        notes || ''
      );

      const orderId = res.lastInsertRowid;

      const itemStmt = db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, variation_id, product_name, sku, size, quality, unit, unit_price, quantity, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        const itemQty = parseInt(item.quantity, 10);
        const itemPrice = parseFloat(item.unitPrice);
        const itemTotal = itemQty * itemPrice;

        itemStmt.run(
          orderId,
          item.productId,
          item.variationId || null,
          item.productName,
          item.sku || '',
          item.size || null,
          item.quality || null,
          item.unit || 'piece',
          itemPrice,
          itemQty,
          itemTotal
        );
      }

      return {
        orderId,
        orderReference: orderRef,
        subtotal
      };
    });
  },

  getByReference(ref) {
    const order = db.prepare('SELECT * FROM orders WHERE order_reference = ?').get(ref);
    if (!order) return null;
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return order;
  },

  getById(id) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) return null;
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return order;
  },

  getAll({ status = null, search = null, limit = 50, offset = 0 } = {}) {
    let whereClauses = [];
    let params = [];

    if (status && status !== 'all') {
      whereClauses.push('status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      whereClauses.push('(order_reference LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        o.*,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM orders o
      ${whereSql}
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const orders = db.prepare(query).all(...params);

    // Attach items preview
    for (const order of orders) {
      order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    }

    return orders;
  },

  // Confirm Order: Atomically deducts inventory and transitions status
  confirmOrder(orderId, adminName = 'Administrator') {
    return transaction(() => {
      const order = this.getById(orderId);
      if (!order) throw new Error(`Order #${orderId} not found.`);
      if (order.status === 'confirmed' || order.status === 'fulfilled') {
        throw new Error(`Order ${order.order_reference} is already confirmed.`);
      }

      // Check stock sufficiency for each item with variation
      for (const item of order.items) {
        if (item.variation_id) {
          const variation = db.prepare('SELECT stock_quantity FROM product_variations WHERE id = ?').get(item.variation_id);
          if (!variation) {
            throw new Error(`Variation for item "${item.product_name}" no longer exists.`);
          }
          if (variation.stock_quantity < item.quantity) {
            throw new Error(
              `Insufficient stock to confirm order. Item "${item.product_name} (${item.size || ''} ${item.quality || ''})" only has ${variation.stock_quantity} units available, but ${item.quantity} requested.`
            );
          }
        }
      }

      // Deduct stock and log movements
      for (const item of order.items) {
        if (item.variation_id) {
          inventoryModel.adjustStock({
            variationId: item.variation_id,
            adjustmentType: 'sold',
            quantityValue: item.quantity,
            reason: 'sale_confirmed',
            notes: `Confirmed order ${order.order_reference} for customer ${order.customer_name}`,
            adminName,
            orderId: order.id
          });
        }
      }

      // Update order status
      db.prepare(`
        UPDATE orders
        SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(order.id);

      return { success: true, orderReference: order.order_reference };
    });
  },

  // Cancel Order: If it was confirmed, restores deducted stock
  cancelOrder(orderId, adminName = 'Administrator', reason = '') {
    return transaction(() => {
      const order = this.getById(orderId);
      if (!order) throw new Error(`Order #${orderId} not found.`);
      if (order.status === 'cancelled') {
        throw new Error(`Order ${order.order_reference} is already cancelled.`);
      }

      const wasConfirmed = (order.status === 'confirmed' || order.status === 'fulfilled');

      if (wasConfirmed) {
        // Restore stock
        for (const item of order.items) {
          if (item.variation_id) {
            inventoryModel.adjustStock({
              variationId: item.variation_id,
              adjustmentType: 'incoming_stock',
              quantityValue: item.quantity,
              reason: 'order_cancelled_restock',
              notes: `Restocked cancelled order ${order.order_reference}: ${reason}`,
              adminName,
              orderId: order.id
            });
          }
        }
      }

      db.prepare(`
        UPDATE orders
        SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, notes = COALESCE(notes, '') || ' [Cancelled: ' || ? || ']', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(reason || 'Cancelled by admin', order.id);

      return { success: true, orderReference: order.order_reference, stockRestored: wasConfirmed };
    });
  },

  // Mark Fulfilled
  fulfillOrder(orderId) {
    return db.prepare(`
      UPDATE orders
      SET status = 'fulfilled', fulfilled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(orderId);
  }
};

module.exports = orderModel;
