const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const helmet = require('helmet');
require('dotenv').config();

// Ensure database initialized
require('./src/config/database');

const storefrontRoutes = require('./src/routes/storefrontRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Headers (relaxed for inline styles/fonts required by elegant storefront)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Performance Compression
app.use(compression());

// Body Parsers
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Session Management
app.use(session({
  name: 'nina_weaves_sid',
  secret: process.env.SESSION_SECRET || 'nina_weaves_default_session_secret_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Mount Routes
app.use('/admin', adminRoutes);
app.use('/', storefrontRoutes);

// 404 Handler
app.use((req, res) => {
  const isApi = req.path.startsWith('/api/');
  if (isApi) {
    return res.status(404).json({ error: 'Endpoint not found.' });
  }
  res.status(404).render('storefront/404', {
    title: 'Page Not Found | Nina Weaves',
    message: 'The page you requested could not be located on our atelier servers.'
  });
});

// Central Error Handler (Safe for production)
app.use((err, req, res, next) => {
  console.error('Unhandled application error:', err);
  const isApi = req.path.startsWith('/api/');
  if (isApi) {
    return res.status(500).json({ error: 'A server error occurred. Please try again shortly.' });
  }
  res.status(500).render('storefront/500', {
    title: 'Server Error | Nina Weaves',
    message: 'A temporary service interruption occurred. Our atelier team has been notified.'
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  NINA WEAVES — Atelier & Bespoke Clothing E-Commerce`);
    console.log(`  Storefront : http://localhost:${PORT}/`);
    console.log(`  Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
