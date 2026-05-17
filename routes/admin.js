const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Cooperative = require('../models/Cooperative');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const JWT_SECRET = process.env.JWT_SECRET || 'agrilogix_jwt_secret_2024';

/**
 * Middleware: Authentification Admin
 */
const requireAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Admin access required' });
    }
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await Admin.findById(decoded.adminId);
    if (!admin) return res.status(401).json({ error: 'Admin not found' });
    req.admin = admin;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid admin token' });
  }
};

/**
 * POST /admin/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ error: 'Identifiants admin incorrects' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: 'Identifiants admin incorrects' });

    const token = jwt.sign({ adminId: admin._id, isAdmin: true }, JWT_SECRET, { expiresIn: '24h' });
    
    admin.lastLogin = new Date();
    await admin.save();

    res.json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/stats
 */
router.get('/stats', requireAdminAuth, async (req, res) => {
  try {
    const [coopCount, userCount, txCount, totalVolume] = await Promise.all([
      Cooperative.countDocuments(),
      User.countDocuments(),
      Transaction.countDocuments({ status: 'completed' }),
      Transaction.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      coopCount,
      userCount,
      txCount,
      totalVolume: totalVolume[0]?.total || 0,
      blockchain: {
        isAvailable: true, // Mocked for now or link to service
        network: 'Polygon Amoy'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/cooperatives
 */
router.get('/cooperatives', requireAdminAuth, async (req, res) => {
  try {
    const coops = await Cooperative.find().sort({ createdAt: -1 });
    res.json(coops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/users
 */
router.get('/users', requireAdminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /admin/users/:id
 */
router.put('/users/:id', requireAdminAuth, async (req, res) => {
  try {
    const { name, phone, address, email, profession, bio, isSystemAdmin, isSuspended } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (email !== undefined) user.email = email;
    if (profession !== undefined) user.profession = profession;
    if (bio !== undefined) user.bio = bio;
    if (isSystemAdmin !== undefined) user.isSystemAdmin = isSystemAdmin;
    if (isSuspended !== undefined) user.isSuspended = isSuspended;

    await user.save();
    
    const userObj = user.toObject();
    delete userObj.password;
    res.json(userObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, requireAdminAuth };
