// Mock database for logs
let attendanceLogs = [
  { id: 1, date: '2026-06-07', shift: 'Ca chiều', checkIn: '12:02', checkOut: '18:05', duration: '6h 3m', status: 'Đúng giờ' },
  { id: 2, date: '2026-06-06', shift: 'Ca tối', checkIn: '18:15', checkOut: '23:31', duration: '5h 16m', status: 'Trễ check-in' },
  { id: 3, date: '2026-06-05', shift: 'Ca tối', checkIn: '17:55', checkOut: '23:35', duration: '5h 40m', status: 'Đúng giờ' }
];

export const checkIn = async (req, res, next) => {
  try {
    const { lat, lng, device } = req.body;
    const now = new Date();
    
    const newLog = {
      id: attendanceLogs.length + 1,
      date: now.toISOString().split('T')[0],
      shift: 'Ca tối',
      checkIn: now.toLocaleTimeString('vi-VN').substring(0, 5),
      checkOut: null,
      duration: null,
      status: 'Đúng giờ'
    };

    attendanceLogs.unshift(newLog);

    return res.status(201).json({
      success: true,
      message: 'Check-in successful',
      log: newLog
    });
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Find active log for today
    const activeLog = attendanceLogs.find(log => log.date === todayStr && log.checkOut === null);

    if (!activeLog) {
      return res.status(400).json({
        success: false,
        message: 'No active check-in found for today.'
      });
    }

    activeLog.checkOut = now.toLocaleTimeString('vi-VN').substring(0, 5);
    activeLog.duration = '5h 30m'; // simulated calculation

    return res.status(200).json({
      success: true,
      message: 'Check-out successful',
      log: activeLog
    });
  } catch (error) {
    next(error);
  }
};

export const getLogs = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      logs: attendanceLogs
    });
  } catch (error) {
    next(error);
  }
};
