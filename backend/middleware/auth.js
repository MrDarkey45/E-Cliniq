import jwt from 'jsonwebtoken';

// Secret key for JWT (in production, this should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'ecliniq-portfolio-secret-key';

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

// Authentication middleware - verify user is logged in
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Authorization middleware - check if user has required role
export const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Patient-specific authorization - patients can only access their own records
export const authorizePatientRecords = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Admins, doctors, and nurses can access all records
  if (['admin', 'doctor', 'nurse'].includes(req.user.role)) {
    return next();
  }

  // Patients can only access their own records
  // This will be enforced in the route handlers by filtering results
  next();
};
