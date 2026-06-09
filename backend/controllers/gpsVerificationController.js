import GPSVerificationLog from '../models/GPSVerificationLog.js';

export const getGPSLogs = async (req, res, next) => {
  try {
    const { userId, verificationType, success, limit = 50 } = req.query;

    const query = {};

    if (userId) query.user = userId;
    if (verificationType) query.verificationType = verificationType;
    if (success !== undefined) query.success = success === 'true';

    const logs = await GPSVerificationLog.find(query)
      .populate('user', 'name email phone role position')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    next(error);
  }
};

export const getGPSStatistics = async (req, res, next) => {
  try {
    const { userId, startDate, endDate } = req.query;

    const query = {};

    if (userId) query.user = userId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await GPSVerificationLog.find(query);

    const statistics = {
      totalAttempts: logs.length,
      successful: logs.filter(l => l.success).length,
      failed: logs.filter(l => !l.success).length,
      successRate: logs.length > 0 ? ((logs.filter(l => l.success).length / logs.length) * 100).toFixed(2) : 0,
      averageDistance: logs.length > 0 ? (logs.reduce((sum, l) => sum + l.distance, 0) / logs.length).toFixed(2) : 0
    };

    return res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};
