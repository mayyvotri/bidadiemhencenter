export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access. Token is missing or invalid.'
    });
  }

  const token = authHeader.split(' ')[1];

  // For mockup testing, verify if token matches our mock token
  if (token === 'mock_jwt_token_xyz') {
    req.user = {
      id: 'staff_123',
      name: 'Phú Nguyễn',
      role: 'Quản lý Ca'
    };
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access forbidden. Invalid token.'
  });
};
