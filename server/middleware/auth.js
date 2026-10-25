import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const getSecret = () => process.env.JWT_SECRET || 'suman-hospital-demo-secret';

export const signToken = (user) => jwt.sign({ id: user._id.toString(), role: user.role }, getSecret(), { expiresIn: '7d' });

export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
    const payload = jwt.verify(token, getSecret());
    const user = await User.findById(payload.id);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Account is inactive or unavailable' });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'You do not have permission for this action' });
  next();
};
