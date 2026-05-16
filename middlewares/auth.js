const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Cooperative = require('../models/Cooperative');

const JWT_SECRET = process.env.JWT_SECRET || 'agrilogix_jwt_secret_2024';

/**
 * Helper: Récupère le rôle d'un utilisateur dans une coopérative (depuis memberRoles Map)
 */
const getLocalRole = (coop, userId) => {
  if (!coop || !userId) return 'Membre';
  if (coop.memberRoles && coop.memberRoles.get) {
    return coop.memberRoles.get(userId.toString()) || 'Membre';
  }
  if (coop.memberRoles && typeof coop.memberRoles === 'object') {
    return coop.memberRoles[userId.toString()] || 'Membre';
  }
  return 'Membre';
};

/**
 * Middleware: Authentification via JWT
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Fallback Temporaire pour la compatibilité mobile (x-user-id)
      const userIdFallback = req.header('x-user-id');
      if (userIdFallback) {
        const user = await User.findById(userIdFallback);
        if (!user) return res.status(401).json({ error: 'Utilisateur non trouvé' });
        req.user = user;
        return next();
      }
      return res.status(401).json({ error: 'Authentification requise (Token manquant)' });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'Utilisateur non trouvé' });
    
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth Error:', err.message);
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

/**
 * Middleware: Charge la coopérative et vérifie l'appartenance
 */
const loadCoop = async (req, res, next) => {
  try {
    const coop = await Cooperative.findById(req.params.id || req.params.coopId);
    if (!coop) return res.status(404).json({ error: 'Coopérative introuvable' });
    req.coop = coop;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const requireCoopMember = (req, res, next) => {
  if (!req.coop || !req.user) return res.status(500).json({ error: 'Contexte manquant' });
  const isMember = req.coop.members.some(m => m.toString() === req.user._id.toString());
  const isAdmin = req.coop.adminId.toString() === req.user._id.toString();
  if (!isMember && !isAdmin) {
    return res.status(403).json({ error: 'Accès réservé aux membres de la coopérative' });
  }
  next();
};

/**
 * Middleware: Vérifie si l'utilisateur est Président ou Admin de la coop
 */
const requirePresidentOrAdmin = (req, res, next) => {
  if (!req.coop || !req.user) return res.status(500).json({ error: 'Contexte manquant' });
  
  const userId = req.user._id.toString();
  const localRole = getLocalRole(req.coop, userId);
  
  const isCoopAdminRole = localRole === 'Admin' || localRole === 'Président' || localRole === 'President';
  const isGlobalAdmin = req.user.role === 'Admin';
  const isCoopOwner = req.coop.adminId.toString() === userId;

  if (isCoopAdminRole || isGlobalAdmin || isCoopOwner) {
    return next();
  }

  res.status(403).json({ error: 'Action réservée au Président ou Administrateur' });
};

module.exports = {
  requireAuth,
  loadCoop,
  requireCoopMember,
  requirePresidentOrAdmin,
  getLocalRole
};
