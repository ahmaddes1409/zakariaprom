const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'zakariaprom-secret-key-2026-change-in-production';
const TOKEN_EXPIRY = '7d';

// Generate JWT token
function generateToken(payload, expiry = TOKEN_EXPIRY) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiry });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// Admin authentication middleware
function adminAuth(req, res, next) {
  const token = req.cookies?.admin_token || req.headers['authorization']?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'admin') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.admin = decoded;
  next();
}

// User authentication middleware
function userAuth(req, res, next) {
  const token = req.cookies?.user_token || req.headers['authorization']?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'user') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = decoded;
  next();
}

// Optional user auth (doesn't fail, just attaches user if token exists)
function optionalUserAuth(req, res, next) {
  const token = req.cookies?.user_token || req.headers['authorization']?.replace('Bearer ', '');
  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.type === 'user') {
      req.user = decoded;
    }
  }
  next();
}

// Admin login
function adminLogin(username, password) {
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin) return null;
  if (!bcrypt.compareSync(password, admin.password)) return null;
  const token = generateToken({ id: admin.id, username: admin.username, role: admin.role, type: 'admin' });
  return { token, admin: { id: admin.id, username: admin.username, role: admin.role } };
}

// User registration
function registerUser(email, password, name, phone, company, country, language) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return { error: 'Email already registered' };
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password, name, phone, company, country, language) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(email, hashedPassword, name, phone || '', company || '', country || '', language || 'ar');
  
  const token = generateToken({ id: result.lastInsertRowid, email, name, type: 'user' });
  return { token, user: { id: result.lastInsertRowid, email, name, phone, company } };
}

// User login
function loginUser(email, password) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return { error: 'Invalid email or password' };
  if (!bcrypt.compareSync(password, user.password)) return { error: 'Invalid email or password' };
  
  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  const token = generateToken({ id: user.id, email: user.email, name: user.name, type: 'user' });
  return { token, user: { id: user.id, email: user.email, name: user.name, phone: user.phone, company: user.company } };
}

module.exports = { generateToken, verifyToken, adminAuth, userAuth, optionalUserAuth, adminLogin, registerUser, loginUser };
