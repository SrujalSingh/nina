const adminModel = require('../models/adminModel');

function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    const admin = adminModel.findById(req.session.adminId);
    if (admin) {
      req.admin = admin;
      res.locals.admin = admin;
      return next();
    }
  }

  // Not authenticated
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
  }

  // Save intended destination
  req.session.returnTo = req.originalUrl;
  return res.redirect('/admin/login');
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin');
  }
  next();
}

module.exports = {
  requireAdmin,
  redirectIfAuthenticated
};
