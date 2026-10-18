// In-memory rate limiter for login protection
const loginAttempts = new Map();

function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  // Avoid lockouts during local development and testing
  if (process.env.NODE_ENV === 'development' || ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1')) {
    return next();
  }

  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10;

  let record = loginAttempts.get(ip);
  if (!record || now - record.firstAttempt > windowMs) {
    record = { count: 1, firstAttempt: now };
    loginAttempts.set(ip, record);
    return next();
  }

  record.count += 1;
  if (record.count > maxAttempts) {
    const retryAfterMin = Math.ceil((windowMs - (now - record.firstAttempt)) / 60000);
    return res.status(429).render('admin/login', {
      error: `Too many login attempts. For security, please wait ${retryAfterMin} minute(s) before trying again.`,
      username: req.body.username || ''
    });
  }

  next();
}

function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

module.exports = {
  loginRateLimiter,
  resetLoginAttempts
};
