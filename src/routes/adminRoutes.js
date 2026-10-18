const express = require('express');
const router = express.Router();
const adminModel = require('../models/adminModel');
const productModel = require('../models/productModel');
const categoryModel = require('../models/categoryModel');
const inventoryModel = require('../models/inventoryModel');
const orderModel = require('../models/orderModel');
const settingModel = require('../models/settingModel');
const policyModel = require('../models/policyModel');
const { requireAdmin, redirectIfAuthenticated } = require('../middleware/auth');
const { loginRateLimiter, resetLoginAttempts } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');

// Helper to provide admin locals
router.use((req, res, next) => {
  res.locals.admin = req.session && req.session.adminId ? adminModel.findById(req.session.adminId) : null;
  res.locals.settings = settingModel.getAll();
  res.locals.currentPath = req.path;
  res.locals.successMsg = req.session.successMsg || null;
  res.locals.errorMsg = req.session.errorMsg || null;
  delete req.session.successMsg;
  delete req.session.errorMsg;
  next();
});

// Admin root redirect
router.get('/', (req, res) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/admin/login');
});

// 1. Admin Authentication
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('admin/login', {
    title: 'Admin Sign In | Nina Weaves Portal',
    error: null,
    username: ''
  });
});

router.post('/login', loginRateLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).render('admin/login', {
      title: 'Admin Sign In | Nina Weaves Portal',
      error: 'Please enter both username and password.',
      username: username || ''
    });
  }

  const admin = adminModel.findByUsername(username.trim());
  if (!admin || !adminModel.verifyPassword(password, admin.password_hash)) {
    return res.status(401).render('admin/login', {
      title: 'Admin Sign In | Nina Weaves Portal',
      error: 'Invalid username or password credentials.',
      username: username || ''
    });
  }

  // Reset rate limiting on successful login
  resetLoginAttempts(req.ip);

  // Set session
  req.session.adminId = admin.id;
  adminModel.updateLastLogin(admin.id);

  const redirectUrl = req.session.returnTo || '/admin/dashboard';
  delete req.session.returnTo;
  res.redirect(redirectUrl);
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// PROTECTED ROUTES BELOW
router.use(requireAdmin);

// 2. Admin Dashboard
router.get('/dashboard', (req, res) => {
  const stats = inventoryModel.getDashboardStats();
  res.render('admin/dashboard', {
    title: 'Dashboard | Store Overview',
    stats
  });
});

// 3. Product Management
router.get('/products', (req, res) => {
  const { search, category, status } = req.query;
  const products = productModel.getAll({
    categorySlug: category || null,
    search: search || null,
    status: status || null,
    includeDeleted: false,
    limit: 100
  });
  const categories = categoryModel.getAll(true);

  res.render('admin/products/list', {
    title: 'Products Management',
    products,
    categories,
    currentCategory: category || '',
    currentStatus: status || '',
    search: search || ''
  });
});

router.get('/products/new', (req, res) => {
  const categories = categoryModel.getAll(false);
  res.render('admin/products/form', {
    title: 'Add New Product',
    isEdit: false,
    product: null,
    categories,
    error: null
  });
});

router.post('/products/new', upload.array('images', 8), (req, res) => {
  try {
    const {
      name,
      sku,
      category_id,
      subcategory,
      base_price,
      sale_price,
      unit,
      description,
      low_stock_threshold,
      status,
      is_featured,
      is_new_arrival,
      // Variations arrays
      var_sku,
      var_size,
      var_quality,
      var_option,
      var_price,
      var_stock
    } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    // Check slug uniqueness
    const existing = productModel.getBySlug(slug);
    const finalSlug = existing ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

    // Process uploaded images
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((f, idx) => {
        images.push({
          image_url: `/uploads/products/${f.filename}`,
          alt_text: `${name} Image ${idx + 1}`,
          is_primary: idx === 0 ? 1 : 0
        });
      });
    }

    // Process variations
    const variations = [];
    if (var_quality) {
      const qualities = Array.isArray(var_quality) ? var_quality : [var_quality];
      const sizes = Array.isArray(var_size) ? var_size : [var_size];
      const options = Array.isArray(var_option) ? var_option : [var_option];
      const skus = Array.isArray(var_sku) ? var_sku : [var_sku];
      const prices = Array.isArray(var_price) ? var_price : [var_price];
      const stocks = Array.isArray(var_stock) ? var_stock : [var_stock];

      for (let i = 0; i < qualities.length; i++) {
        if (qualities[i] && qualities[i].trim()) {
          variations.push({
            sku: (skus[i] && skus[i].trim()) || `${sku}-${i + 1}`,
            size: (sizes[i] && sizes[i].trim()) || null,
            quality: qualities[i].trim(),
            option_name: (options[i] && options[i].trim()) || null,
            price: prices[i] ? parseFloat(prices[i]) : parseFloat(base_price),
            stock_quantity: parseInt(stocks[i] || 0, 10),
            is_active: 1
          });
        }
      }
    }

    const productId = productModel.create({
      category_id: parseInt(category_id, 10),
      subcategory: (subcategory || '').trim(),
      name: name.trim(),
      slug: finalSlug,
      sku: sku.trim(),
      description: (description || '').trim(),
      base_price: parseFloat(base_price),
      sale_price: sale_price ? parseFloat(sale_price) : null,
      unit: unit || 'piece',
      low_stock_threshold: parseInt(low_stock_threshold || 5, 10),
      status: status || 'active',
      is_featured: is_featured ? 1 : 0,
      is_new_arrival: is_new_arrival ? 1 : 0,
      images,
      variations,
      adminName: req.admin.name
    });

    req.session.successMsg = `Product "${name}" created successfully.`;
    res.redirect(`/admin/products/edit/${productId}`);
  } catch (error) {
    console.error('Error creating product:', error);
    const categories = categoryModel.getAll(false);
    res.status(500).render('admin/products/form', {
      title: 'Add New Product',
      isEdit: false,
      product: req.body,
      categories,
      error: error.message || 'Error creating product.'
    });
  }
});

router.get('/products/edit/:id', (req, res) => {
  const product = productModel.getById(req.params.id);
  if (!product) {
    req.session.errorMsg = 'Product not found.';
    return res.redirect('/admin/products');
  }

  const categories = categoryModel.getAll(true);
  res.render('admin/products/form', {
    title: `Edit: ${product.name}`,
    isEdit: true,
    product,
    categories,
    error: null
  });
});

router.post('/products/edit/:id', (req, res) => {
  try {
    const {
      name,
      sku,
      category_id,
      subcategory,
      base_price,
      sale_price,
      unit,
      description,
      low_stock_threshold,
      status,
      is_featured,
      is_new_arrival
    } = req.body;

    const existingProduct = productModel.getById(req.params.id);
    if (!existingProduct) {
      req.session.errorMsg = 'Product not found.';
      return res.redirect('/admin/products');
    }

    productModel.update(req.params.id, {
      category_id: parseInt(category_id, 10),
      subcategory: (subcategory || '').trim(),
      name: name.trim(),
      slug: existingProduct.slug,
      sku: sku.trim(),
      description: (description || '').trim(),
      base_price: parseFloat(base_price),
      sale_price: sale_price ? parseFloat(sale_price) : null,
      unit: unit || 'piece',
      low_stock_threshold: parseInt(low_stock_threshold || 5, 10),
      status: status || 'active',
      is_featured: is_featured ? 1 : 0,
      is_new_arrival: is_new_arrival ? 1 : 0
    });

    req.session.successMsg = `Product "${name}" updated successfully.`;
    res.redirect(`/admin/products/edit/${req.params.id}`);
  } catch (error) {
    console.error('Error updating product:', error);
    req.session.errorMsg = error.message;
    res.redirect(`/admin/products/edit/${req.params.id}`);
  }
});

router.post('/products/delete/:id', (req, res) => {
  try {
    productModel.softDelete(req.params.id);
    req.session.successMsg = 'Product archived successfully. Historical orders and inventory records have been preserved.';
    res.redirect('/admin/products');
  } catch (error) {
    req.session.errorMsg = error.message;
    res.redirect('/admin/products');
  }
});

// Image management
router.post('/products/:id/images', upload.array('new_images', 8), (req, res) => {
  try {
    if (req.files && req.files.length > 0) {
      const product = productModel.getById(req.params.id);
      req.files.forEach((f, idx) => {
        productModel.addImage(
          req.params.id,
          `/uploads/products/${f.filename}`,
          `${product.name} Image`,
          0,
          99
        );
      });
      req.session.successMsg = `${req.files.length} image(s) uploaded successfully.`;
    }
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect(`/admin/products/edit/${req.params.id}`);
});

router.post('/products/images/:imageId/delete', (req, res) => {
  const { productId } = req.body;
  try {
    productModel.removeImage(req.params.imageId);
    req.session.successMsg = 'Image removed successfully.';
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect(`/admin/products/edit/${productId}`);
});

router.post('/products/images/:imageId/primary', (req, res) => {
  const { productId } = req.body;
  try {
    productModel.setPrimaryImage(productId, req.params.imageId);
    req.session.successMsg = 'Primary display image updated.';
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect(`/admin/products/edit/${productId}`);
});

// Variation management
router.post('/products/:id/variations/new', (req, res) => {
  try {
    const { sku, size, quality, option_name, price, stock_quantity } = req.body;
    productModel.addVariation(req.params.id, {
      sku: sku.trim(),
      size: (size || '').trim() || null,
      quality: quality.trim(),
      option_name: (option_name || '').trim() || null,
      price: price ? parseFloat(price) : null,
      stock_quantity: parseInt(stock_quantity || 0, 10),
      adminName: req.admin.name
    });
    req.session.successMsg = 'Variation added with initial stock registered.';
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect(`/admin/products/edit/${req.params.id}`);
});

router.post('/products/variations/:varId/edit', (req, res) => {
  const { productId, sku, size, quality, option_name, price, is_active } = req.body;
  try {
    productModel.updateVariation(req.params.varId, {
      sku: sku.trim(),
      size: (size || '').trim() || null,
      quality: quality.trim(),
      option_name: (option_name || '').trim() || null,
      price: price ? parseFloat(price) : null,
      is_active: is_active ? 1 : 0
    });
    req.session.successMsg = 'Variation details updated.';
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect(`/admin/products/edit/${productId}`);
});

router.post('/products/variations/:varId/delete', (req, res) => {
  const { productId } = req.body;
  try {
    productModel.deleteVariation(req.params.varId);
    req.session.successMsg = 'Variation removed.';
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect(`/admin/products/edit/${productId}`);
});

// 4. Categories Management
router.get('/categories', (req, res) => {
  const categories = categoryModel.getAll(true);
  res.render('admin/categories/list', {
    title: 'Categories Management',
    categories
  });
});

router.post('/categories/new', (req, res) => {
  try {
    const { name, description, image_url, display_order, is_active, show_on_homepage } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    categoryModel.create({
      name: name.trim(),
      slug,
      description: (description || '').trim(),
      image_url: (image_url || '').trim(),
      display_order: parseInt(display_order || 0, 10),
      is_active: is_active ? 1 : 0,
      show_on_homepage: show_on_homepage ? 1 : 0
    });
    req.session.successMsg = `Category "${name}" created.`;
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect('/admin/categories');
});

router.post('/categories/:id/toggle-homepage', (req, res) => {
  try {
    categoryModel.toggleHomepage(req.params.id);
    const cat = categoryModel.getById(req.params.id);
    req.session.successMsg = `Homepage spotlight updated for "${cat ? cat.name : 'Category'}".`;
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect('/admin/categories');
});

router.post('/categories/:id/toggle-active', (req, res) => {
  try {
    categoryModel.toggleActive(req.params.id);
    const cat = categoryModel.getById(req.params.id);
    req.session.successMsg = `Visibility status updated for "${cat ? cat.name : 'Category'}".`;
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect('/admin/categories');
});

router.post('/categories/edit/:id', (req, res) => {
  try {
    const { name, slug, description, image_url, display_order, is_active, show_on_homepage } = req.body;
    categoryModel.update(req.params.id, {
      name: name.trim(),
      slug: (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim(),
      description: (description || '').trim(),
      image_url: (image_url || '').trim(),
      display_order: parseInt(display_order || 0, 10),
      is_active: is_active ? 1 : 0,
      show_on_homepage: show_on_homepage ? 1 : 0
    });
    req.session.successMsg = `Category "${name}" updated.`;
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect('/admin/categories');
});

router.post('/categories/delete/:id', (req, res) => {
  try {
    categoryModel.delete(req.params.id);
    req.session.successMsg = 'Category deleted successfully.';
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect('/admin/categories');
});

// 5. Dedicated Inventory Management
router.get('/inventory', (req, res) => {
  const { search, category, filter } = req.query;
  const items = inventoryModel.getAll({
    search: search || null,
    categoryId: category ? parseInt(category, 10) : null,
    filter: filter || null,
    limit: 150
  });
  const categories = categoryModel.getAll(false);

  res.render('admin/inventory/list', {
    title: 'Inventory & Stock Management',
    items,
    categories,
    search: search || '',
    currentCategory: category || '',
    currentFilter: filter || 'all'
  });
});

// Stock Adjustment Handler (atomic with full audit trail)
router.post('/inventory/adjust', (req, res) => {
  try {
    const { variation_id, adjustment_type, quantity_value, reason, notes } = req.body;

    const result = inventoryModel.adjustStock({
      variationId: parseInt(variation_id, 10),
      adjustmentType: adjustment_type,
      quantityValue: parseInt(quantity_value, 10),
      reason: reason || adjustment_type,
      notes: notes || '',
      adminName: req.admin.name
    });

    req.session.successMsg = `Stock adjusted for variation #${result.variationId}. Quantity changed by ${result.quantityChange > 0 ? '+' : ''}${result.quantityChange} (New Stock: ${result.newQuantity}). Audit log recorded.`;
  } catch (error) {
    console.error('Inventory adjustment error:', error);
    req.session.errorMsg = error.message;
  }

  const returnUrl = req.headers.referer || '/admin/inventory';
  res.redirect(returnUrl);
});

// Stock History (Audit Trail)
router.get('/stock-history', (req, res) => {
  const movements = inventoryModel.getMovements({ limit: 100 });
  res.render('admin/inventory/history', {
    title: 'Stock Movement Audit History',
    movements
  });
});

// 6. Orders and WhatsApp Inquiries Management
router.get('/orders', (req, res) => {
  const { status, search } = req.query;
  const orders = orderModel.getAll({
    status: status || null,
    search: search || null,
    limit: 100
  });

  res.render('admin/orders/list', {
    title: 'Orders & WhatsApp Inquiries',
    orders,
    currentStatus: status || 'all',
    search: search || ''
  });
});

router.get('/orders/:id', (req, res) => {
  const order = orderModel.getById(req.params.id);
  if (!order) {
    req.session.errorMsg = 'Order record not found.';
    return res.redirect('/admin/orders');
  }

  res.render('admin/orders/detail', {
    title: `Order Reference: ${order.order_reference}`,
    order
  });
});

// Order confirmation (DEDUCTS STOCK ATOMICALLY)
router.post('/orders/:id/confirm', (req, res) => {
  try {
    const result = orderModel.confirmOrder(req.params.id, req.admin.name);
    req.session.successMsg = `Order ${result.orderReference} confirmed! Stock has been atomically deducted from inventory and logged in stock movements.`;
  } catch (error) {
    console.error('Order confirmation error:', error);
    req.session.errorMsg = error.message;
  }
  res.redirect(`/admin/orders/${req.params.id}`);
});

// Order cancellation (RESTORES STOCK IF PREVIOUSLY CONFIRMED)
router.post('/orders/:id/cancel', (req, res) => {
  try {
    const { cancel_reason } = req.body;
    const result = orderModel.cancelOrder(req.params.id, req.admin.name, cancel_reason);
    if (result.stockRestored) {
      req.session.successMsg = `Order ${result.orderReference} cancelled. Previously deducted stock was restored to inventory and logged.`;
    } else {
      req.session.successMsg = `Order inquiry ${result.orderReference} marked as cancelled.`;
    }
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect(`/admin/orders/${req.params.id}`);
});

// Mark order fulfilled
router.post('/orders/:id/fulfill', (req, res) => {
  try {
    orderModel.fulfillOrder(req.params.id);
    req.session.successMsg = 'Order marked as fulfilled/dispatched.';
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect(`/admin/orders/${req.params.id}`);
});

// Manual order creation from WhatsApp chat
router.post('/orders/manual', (req, res) => {
  try {
    const { customer_name, customer_phone, delivery_address, notes, variation_ids, quantities } = req.body;

    const varIds = Array.isArray(variation_ids) ? variation_ids : [variation_ids];
    const qtys = Array.isArray(quantities) ? quantities : [quantities];

    const items = [];
    for (let i = 0; i < varIds.length; i++) {
      if (varIds[i]) {
        const v = productModel.getVariationById(varIds[i]);
        if (v) {
          items.push({
            productId: v.product_id,
            variationId: v.id,
            productName: v.product_name,
            sku: v.sku,
            size: v.size,
            quality: v.quality,
            unit: v.product_unit,
            unitPrice: v.price || v.product_base_price,
            quantity: parseInt(qtys[i] || 1, 10)
          });
        }
      }
    }

    if (items.length === 0) {
      throw new Error('Please select at least one product variation.');
    }

    const orderRes = orderModel.createInquiry({
      customerName: customer_name.trim(),
      customerPhone: customer_phone.trim(),
      deliveryAddress: (delivery_address || '').trim(),
      notes: `[Manual Order created from WhatsApp chat] ${notes || ''}`,
      items
    });

    req.session.successMsg = `Manual order ${orderRes.orderReference} recorded successfully. You can now confirm it to deduct stock.`;
    res.redirect(`/admin/orders/${orderRes.orderId}`);
  } catch (error) {
    req.session.errorMsg = error.message;
    res.redirect('/admin/orders');
  }
});

// 7. Website Content Management
router.get('/content', (req, res) => {
  res.render('admin/content/edit', {
    title: 'Website Content & Banner'
  });
});

router.post('/content', upload.single('hero_image'), (req, res) => {
  try {
    const { hero_headline, hero_subheadline, announcement_text } = req.body;
    const updates = {
      hero_headline: hero_headline.trim(),
      hero_subheadline: hero_subheadline.trim(),
      announcement_text: (announcement_text || '').trim()
    };

    if (req.file) {
      updates.hero_image_url = `/uploads/products/${req.file.filename}`;
    }

    settingModel.updateMany(updates);
    req.session.successMsg = 'Homepage content updated successfully.';
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect('/admin/content');
});

// 8. Policies Management
router.get('/policies', (req, res) => {
  const policies = policyModel.getAll();
  res.render('admin/content/policies', {
    title: 'Website Policies & About Us',
    policies
  });
});

router.post('/policies/:slug', (req, res) => {
  try {
    const { title, content } = req.body;
    policyModel.update(req.params.slug, {
      title: title.trim(),
      content: content.trim()
    });
    req.session.successMsg = `Policy "${title}" updated successfully. Changes are now live on the storefront.`;
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect('/admin/policies');
});

// 9. Store Settings
router.get('/settings', (req, res) => {
  res.render('admin/settings/edit', {
    title: 'Store Settings & WhatsApp Number'
  });
});

router.post('/settings', (req, res) => {
  try {
    const {
      brand_name,
      brand_tagline,
      whatsapp_number,
      contact_email,
      contact_phone,
      contact_address,
      currency,
      currency_symbol,
      low_stock_threshold_default
    } = req.body;

    settingModel.updateMany({
      brand_name: brand_name.trim(),
      brand_tagline: brand_tagline.trim(),
      whatsapp_number: whatsapp_number.replace(/[^0-9]/g, ''),
      contact_email: contact_email.trim(),
      contact_phone: contact_phone.trim(),
      contact_address: contact_address.trim(),
      currency: currency.trim(),
      currency_symbol: currency_symbol.trim(),
      low_stock_threshold_default: low_stock_threshold_default.trim()
    });

    req.session.successMsg = 'Store settings saved successfully.';
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect('/admin/settings');
});

// 10. Admin Account Management
router.get('/account', (req, res) => {
  res.render('admin/account/edit', {
    title: 'Admin Account Security'
  });
});

router.post('/account', (req, res) => {
  try {
    const { name, email, current_password, new_password, confirm_password } = req.body;

    // Profile update
    adminModel.updateProfile(req.admin.id, {
      name: name.trim(),
      email: email.trim()
    });

    // Password change if provided
    if (new_password) {
      if (!current_password) {
        throw new Error('Current password is required to set a new password.');
      }
      const adminData = adminModel.findByUsername(req.admin.username);
      if (!adminModel.verifyPassword(current_password, adminData.password_hash)) {
        throw new Error('Current password does not match.');
      }
      if (new_password.length < 8) {
        throw new Error('New password must be at least 8 characters long.');
      }
      if (new_password !== confirm_password) {
        throw new Error('New password and confirmation do not match.');
      }
      adminModel.updatePassword(req.admin.id, new_password);
      req.session.successMsg = 'Profile and password updated successfully.';
    } else {
      req.session.successMsg = 'Profile updated successfully.';
    }
  } catch (error) {
    req.session.errorMsg = error.message;
  }
  res.redirect('/admin/account');
});

module.exports = router;
