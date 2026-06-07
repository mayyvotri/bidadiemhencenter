export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Demo user validation
    if (username === 'bida_staff' && password === 'password123') {
      return res.status(200).json({
        success: true,
        token: 'mock_jwt_token_xyz',
        user: {
          id: 'staff_123',
          name: 'Phú Nguyễn',
          role: 'Quản lý Ca',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'
        }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  } catch (error) {
    next(error);
  }
};

export const getStatus = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user
  });
};
