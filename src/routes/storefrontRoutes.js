const express = require('express');
const router = express.Router();
const productModel = require('../models/productModel');
const categoryModel = require('../models/categoryModel');
const settingModel = require('../models/settingModel');
const policyModel = require('../models/policyModel');
const orderModel = require('../models/orderModel');

// Middleware to inject global settings & categories into every storefront view
router.use((req, res, next) => {
  res.locals.settings = settingModel.getAll();
  res.locals.categories = categoryModel.getAll(false);
  res.locals.currentPath = req.path;
  next();
});

// 1. Homepage
router.get('/', (req, res) => {
  const featuredShirts = productModel.getAll({
    categorySlug: 'shirts',
    status: 'active',
    limit: 4
  });

  const featuredSamples = productModel.getAll({
    categorySlug: 'fabric-samples',
    status: 'active',
    limit: 4
  });

  const newArrivals = productModel.getAll({
    isNewArrival: true,
    status: 'active',
    limit: 4
  });

  res.render('storefront/home', {
    title: 'Nina Weaves | Handcrafted Luxury Shirts & Bespoke Textiles',
    metaDescription: 'Discover mastercrafted luxury shirts and museum-grade textile swatches. Tailored from rare Egyptian Giza cotton and pure Belgian linen, ordered via WhatsApp.',
    featuredShirts,
    featuredSamples,
    newArrivals
  });
});

// 2. Shop All
router.get('/shop', (req, res) => {
  const { category, subcategory, search, sort } = req.query;

  let products = productModel.getAll({
    categorySlug: category || null,
    subcategory: subcategory || null,
    search: search || null,
    status: 'active',
    limit: 100
  });

  // Client sorting
  if (sort === 'price_asc') {
    products.sort((a, b) => (a.sale_price || a.base_price) - (b.sale_price || b.base_price));
  } else if (sort === 'price_desc') {
    products.sort((a, b) => (b.sale_price || b.base_price) - (a.sale_price || a.base_price));
  } else if (sort === 'name') {
    products.sort((a, b) => a.name.localeCompare(b.name));
  }

  let selectedCategory = null;
  if (category) {
    selectedCategory = categoryModel.getBySlug(category);
  }

  res.render('storefront/shop', {
    title: selectedCategory ? `${selectedCategory.name} | Nina Weaves` : 'Shop The Collection | Nina Weaves',
    metaDescription: 'Browse our complete collection of bespoke ready-to-wear shirts and mill-certified fabric swatches.',
    products,
    selectedCategory,
    currentCategory: category || '',
    currentSubcategory: subcategory || '',
    search: search || '',
    sort: sort || 'newest'
  });
});

// Category direct routes
router.get('/shirts', (req, res) => {
  res.redirect('/shop?category=shirts');
});

router.get('/fabric-samples', (req, res) => {
  res.redirect('/shop?category=fabric-samples');
});

router.get('/category/:slug', (req, res) => {
  res.redirect(`/shop?category=${encodeURIComponent(req.params.slug)}`);
});

// 3. Product Details Page
router.get('/product/:slug', (req, res) => {
  const product = productModel.getBySlug(req.params.slug);
  if (!product) {
    return res.status(404).render('storefront/404', {
      title: 'Product Not Found | Nina Weaves',
      message: 'The requested piece could not be found or has been archived.'
    });
  }

  // Related products from same category
  const relatedProducts = productModel.getAll({
    categorySlug: product.category_slug,
    status: 'active',
    limit: 4
  }).filter(p => p.id !== product.id).slice(0, 3);

  res.render('storefront/product-detail', {
    title: `${product.name} | Nina Weaves Atelier`,
    metaDescription: product.description.slice(0, 155),
    product,
    relatedProducts
  });
});

// 4. Cart Page
router.get('/cart', (req, res) => {
  res.render('storefront/cart', {
    title: 'Your Shopping Bag | Nina Weaves',
    metaDescription: 'Review your selected luxury shirts and fabric samples. Complete your consultation order directly via WhatsApp.'
  });
});

// 5. Checkout via WhatsApp API
router.post('/api/checkout/whatsapp', (req, res) => {
  try {
    const { customerName, customerPhone, customerEmail, deliveryAddress, notes, items } = req.body;

    if (!customerName || !customerPhone) {
      return res.status(400).json({ error: 'Please provide both your name and WhatsApp contact number.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    // Server-side validation of items & price calculation
    const validatedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = productModel.getById(item.productId);
      if (!product || product.is_deleted) {
        return res.status(400).json({ error: `Product "${item.productName || 'Unknown'}" is no longer available.` });
      }

      let variation = null;
      if (item.variationId) {
        variation = productModel.getVariationById(item.variationId);
      }

      const requestedQty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const unitPrice = variation && variation.price ? variation.price : (product.sale_price || product.base_price);
      const itemTotal = unitPrice * requestedQty;
      subtotal += itemTotal;

      validatedItems.push({
        productId: product.id,
        variationId: variation ? variation.id : null,
        productName: product.name,
        sku: variation ? variation.sku : product.sku,
        size: variation ? variation.size : null,
        quality: variation ? variation.quality : 'Standard',
        unit: product.unit || 'piece',
        unitPrice: unitPrice,
        quantity: requestedQty,
        itemTotal
      });
    }

    // 1. Create Inquiry Order in Database (Important: DOES NOT deduct stock!)
    const inquiryResult = orderModel.createInquiry({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: (customerEmail || '').trim(),
      deliveryAddress: (deliveryAddress || '').trim(),
      items: validatedItems,
      notes: (notes || '').trim()
    });

    const settings = settingModel.getAll();
    const whatsappBusinessNumber = (settings.whatsapp_number || '919876543210').replace(/[^0-9]/g, '');
    const currencySymbol = settings.currency_symbol || '₹';

    // Format readable message for WhatsApp
    let msg = `*NEW ORDER INQUIRY — NINA WEAVES*\n`;
    msg += `--------------------------------------\n`;
    msg += `*Order Reference:* ${inquiryResult.orderReference}\n`;
    msg += `*Date:* ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n\n`;

    msg += `*Customer Details:*\n`;
    msg += `• *Name:* ${customerName.trim()}\n`;
    msg += `• *Phone:* ${customerPhone.trim()}\n`;
    if (customerEmail && customerEmail.trim()) {
      msg += `• *Email:* ${customerEmail.trim()}\n`;
    }
    if (deliveryAddress && deliveryAddress.trim()) {
      msg += `• *Delivery Address:* ${deliveryAddress.trim()}\n`;
    }

    msg += `\n*Selected Pieces:*\n`;
    validatedItems.forEach((it, idx) => {
      msg += `\n${idx + 1}. *${it.productName}*\n`;
      msg += `   • SKU: ${it.sku}\n`;
      if (it.size) msg += `   • Size: ${it.size}\n`;
      if (it.quality) msg += `   • Fabric / Quality: ${it.quality}\n`;
      msg += `   • Quantity: ${it.quantity} ${it.unit || 'piece'}(s)\n`;
      msg += `   • Price: ${currencySymbol}${it.unitPrice.toLocaleString('en-IN')} each (Total: ${currencySymbol}${it.itemTotal.toLocaleString('en-IN')})\n`;
    });

    msg += `\n--------------------------------------\n`;
    msg += `*Estimated Subtotal:* ${currencySymbol}${subtotal.toLocaleString('en-IN')}\n`;
    if (notes && notes.trim()) {
      msg += `*Special Instructions:* ${notes.trim()}\n`;
    }
    msg += `--------------------------------------\n`;
    msg += `_Hello Atelier Nina Weaves, I would like to place and confirm this order inquiry. Please verify stock availability and guide me on next steps!_`;

    const encodedMessage = encodeURIComponent(msg);
    const whatsappUrl = `https://wa.me/${whatsappBusinessNumber}?text=${encodedMessage}`;

    res.json({
      success: true,
      orderReference: inquiryResult.orderReference,
      whatsappUrl,
      subtotal
    });
  } catch (error) {
    console.error('Error generating WhatsApp order:', error);
    res.status(500).json({ error: error.message || 'An error occurred while preparing your WhatsApp inquiry.' });
  }
});

// 6. Essential Pages: About, Contact, Policies
router.get('/about', (req, res) => {
  const policy = policyModel.getBySlug('about-us');
  res.render('storefront/about', {
    title: 'About Our Atelier | Nina Weaves',
    metaDescription: 'Learn about Nina Weaves heritage tailoring, artisanal European flax linens, and Egyptian Giza cotton shirts.',
    pageContent: policy ? policy.content : ''
  });
});

router.get('/contact', (req, res) => {
  res.render('storefront/contact', {
    title: 'Contact & Atelier Consultation | Nina Weaves',
    metaDescription: 'Get in touch with the Nina Weaves atelier via WhatsApp or direct phone consultation.'
  });
});

router.get('/shipping-policy', (req, res) => {
  const policy = policyModel.getBySlug('shipping-policy');
  res.render('storefront/policy', {
    title: 'Shipping & Delivery Policy | Nina Weaves',
    metaDescription: 'Shipping timelines, courier partners, and domestic delivery details for Nina Weaves.',
    policy
  });
});

router.get('/return-policy', (req, res) => {
  const policy = policyModel.getBySlug('return-policy');
  res.render('storefront/policy', {
    title: 'Return & Exchange Policy | Nina Weaves',
    metaDescription: 'Our 7-day exchange and return policy for unworn standard garments and fabric sample terms.',
    policy
  });
});

router.get('/privacy-policy', (req, res) => {
  const policy = policyModel.getBySlug('privacy-policy');
  res.render('storefront/policy', {
    title: 'Privacy Policy | Nina Weaves',
    metaDescription: 'How Nina Weaves protects and handles your personal information.',
    policy
  });
});

router.get('/terms', (req, res) => {
  const policy = policyModel.getBySlug('terms');
  res.render('storefront/policy', {
    title: 'Terms & Conditions | Nina Weaves',
    metaDescription: 'Terms of service, consultation conditions, and pricing policies of Nina Weaves.',
    policy
  });
});

// 7. XML Sitemap
router.get('/sitemap.xml', (req, res) => {
  const settings = settingModel.getAll();
  const baseUrl = (settings.store_url || 'https://nestbeans.com').replace(/\/+$/, '');
  const products = productModel.getAll({ status: 'active', limit: 1000 });
  const categories = categoryModel.getAll(false);

  const staticUrls = [
    '',
    '/shop',
    '/shirts',
    '/fabric-samples',
    '/cart',
    '/about',
    '/contact',
    '/shipping-policy',
    '/return-policy',
    '/privacy-policy',
    '/terms'
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  staticUrls.forEach(url => {
    xml += `  <url>\n    <loc>${baseUrl}${url}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${url === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
  });

  categories.forEach(c => {
    xml += `  <url>\n    <loc>${baseUrl}/shop?category=${c.slug}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
  });

  products.forEach(p => {
    xml += `  <url>\n    <loc>${baseUrl}/product/${p.slug}</loc>\n    <lastmod>${(p.updated_at || p.created_at).slice(0, 10)}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  });

  xml += `</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Robots.txt
router.get('/robots.txt', (req, res) => {
  const settings = settingModel.getAll();
  const baseUrl = (settings.store_url || 'https://nestbeans.com').replace(/\/+$/, '');
  let robots = `User-agent: *\n`;
  robots += `Disallow: /admin\n`;
  robots += `Disallow: /admin/*\n`;
  robots += `Disallow: /api/*\n`;
  robots += `Allow: /\n\n`;
  robots += `Sitemap: ${baseUrl}/sitemap.xml\n`;
  res.header('Content-Type', 'text/plain');
  res.send(robots);
});

module.exports = router;
