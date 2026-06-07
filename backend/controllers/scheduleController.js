let swapRequests = [];

const weekShifts = {
  'Mon': [{ id: 1, name: 'Ca chiều', time: '12:00 - 18:00', role: 'Quản lý bàn', branch: 'Chi nhánh 1 Nguyễn Oanh', status: 'Đã phân công' }],
  'Tue': [{ id: 2, name: 'Ca tối', time: '18:00 - 23:30', role: 'Quản lý bàn', branch: 'Chi nhánh 1 Nguyễn Oanh', status: 'Đã phân công' }],
  'Wed': [],
  'Thu': [{ id: 3, name: 'Ca tối', time: '18:00 - 23:30', role: 'Thu ngân', branch: 'Chi nhánh 1 Nguyễn Oanh', status: 'Đã phân công' }],
  'Fri': [{ id: 4, name: 'Ca tối', time: '18:00 - 23:30', role: 'Quản lý bàn', branch: 'Chi nhánh 2 Quang Trung', status: 'Đã phân công' }],
  'Sat': [],
  'Sun': [{ id: 5, name: 'Ca sáng', time: '08:00 - 14:00', role: 'Phục vụ bàn VIP', branch: 'Chi nhánh 1 Nguyễn Oanh', status: 'Đã phân công' }]
};

export const getShifts = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      shifts: weekShifts
    });
  } catch (error) {
    next(error);
  }
};

export const requestSwap = async (req, res, next) => {
  try {
    const { shiftId, targetStaff, reason } = req.body;

    if (!shiftId || !targetStaff || !reason) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const newRequest = {
      id: swapRequests.length + 1,
      requesterId: req.user?.id || 'staff_123',
      shiftId,
      targetStaff,
      reason,
      status: 'Đang chờ duyệt',
      timestamp: new Date().toISOString()
    };

    swapRequests.push(newRequest);

    return res.status(201).json({
      success: true,
      message: 'Swap request submitted successfully',
      request: newRequest
    });
  } catch (error) {
    next(error);
  }
};
