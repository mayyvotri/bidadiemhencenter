import LeaveBalance from '../models/LeaveBalance.js';
import User from '../models/User.js';

export const getMyLeaveBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const currentYear = new Date().getFullYear();

    let balance = await LeaveBalance.findOne({ user: userId, year: currentYear });

    // Create balance if it doesn't exist
    if (!balance) {
      balance = await LeaveBalance.create({
        user: userId,
        year: currentYear,
        annual: 12,
        sick: 10,
        personal: 3,
        maternity: 90,
        paternity: 14,
        unpaid: 0
      });
    }

    return res.status(200).json({
      success: true,
      data: balance
    });
  } catch (error) {
    next(error);
  }
};

export const getAllLeaveBalances = async (req, res, next) => {
  try {
    const { year } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const balances = await LeaveBalance.find({ year: currentYear })
      .populate('user', 'name email phone position');

    return res.status(200).json({
      success: true,
      data: balances,
      count: balances.length
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaveBalanceByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { year } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const balance = await LeaveBalance.findOne({ user: userId, year: currentYear })
      .populate('user', 'name email phone position');

    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy số ngày nghỉ phép'
      });
    }

    return res.status(200).json({
      success: true,
      data: balance
    });
  } catch (error) {
    next(error);
  }
};

export const updateLeaveBalance = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { annual, sick, personal, maternity, paternity, unpaid, year } = req.body;
    const currentYear = year || new Date().getFullYear();

    const balance = await LeaveBalance.findOne({ user: userId, year: currentYear });

    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy số ngày nghỉ phép'
      });
    }

    if (annual !== undefined) balance.annual = annual;
    if (sick !== undefined) balance.sick = sick;
    if (personal !== undefined) balance.personal = personal;
    if (maternity !== undefined) balance.maternity = maternity;
    if (paternity !== undefined) balance.paternity = paternity;
    if (unpaid !== undefined) balance.unpaid = unpaid;

    await balance.save();

    const populatedBalance = await LeaveBalance.findById(balance._id)
      .populate('user', 'name email phone position');

    return res.status(200).json({
      success: true,
      message: 'Cập nhật số ngày nghỉ phép thành công',
      data: populatedBalance
    });
  } catch (error) {
    next(error);
  }
};

export const initializeLeaveBalances = async (req, res, next) => {
  try {
    const { year } = req.body;
    const currentYear = year || new Date().getFullYear();

    const employees = await User.find({ role: 'employee' });

    const results = [];
    for (const employee of employees) {
      let balance = await LeaveBalance.findOne({ user: employee._id, year: currentYear });

      if (!balance) {
        balance = await LeaveBalance.create({
          user: employee._id,
          year: currentYear,
          annual: 12,
          sick: 10,
          personal: 3,
          maternity: 90,
          paternity: 14,
          unpaid: 0
        });
        results.push({ user: employee.name, created: true });
      } else {
        results.push({ user: employee.name, created: false });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Khởi tạo số ngày nghỉ phép thành công',
      data: results
    });
  } catch (error) {
    next(error);
  }
};
