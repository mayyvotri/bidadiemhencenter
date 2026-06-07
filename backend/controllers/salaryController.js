export const getSalarySummary = async (req, res, next) => {
  try {
    const salaryData = {
      baseRate: 35000, // VND/hour
      totalHours: 142.5,
      baseSalary: 4987500,
      allowance: 1200000,
      bonus: 2800000,
      deduction: 37500,
      netSalary: 8950000,
      period: '26/05/2026 - 25/06/2026'
    };

    return res.status(200).json({
      success: true,
      salary: salaryData
    });
  } catch (error) {
    next(error);
  }
};

export const getSalaryHistory = async (req, res, next) => {
  try {
    const history = [
      { period: 'Tháng 05/2026', hours: '150.0h', base: '5,250,000 đ', allowances: '4,100,000 đ', net: '9,350,000 đ', status: 'Đã thanh toán', date: '05/06/2026' },
      { period: 'Tháng 04/2026', hours: '138.5h', base: '4,847,500 đ', allowances: '3,800,000 đ', net: '8,647,500 đ', status: 'Đã thanh toán', date: '05/05/2026' }
    ];

    return res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    next(error);
  }
};
