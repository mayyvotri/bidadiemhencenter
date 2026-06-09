import Shift from '../models/Shift.js';
import ShiftRegistration from '../models/ShiftRegistration.js';

export const getAllShifts = async (req, res, next) => {
  try {
    const { isActive } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const shifts = await Shift.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: shifts,
      count: shifts.length
    });
  } catch (error) {
    next(error);
  }
};

export const getShiftById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shift = await Shift.findById(id);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ca làm việc'
      });
    }

    return res.status(200).json({
      success: true,
      data: shift
    });
  } catch (error) {
    next(error);
  }
};

export const createShift = async (req, res, next) => {
  try {
    const { name, description, startTime, endTime, daysOfWeek, maxEmployees, color } = req.body;

    if (!name || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin cần thiết'
      });
    }

    const shift = await Shift.create({
      name,
      description,
      startTime,
      endTime,
      daysOfWeek: daysOfWeek || [],
      maxEmployees,
      color
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo ca làm việc thành công',
      data: shift
    });
  } catch (error) {
    next(error);
  }
};

export const updateShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, startTime, endTime, daysOfWeek, maxEmployees, isActive, color } = req.body;

    const shift = await Shift.findById(id);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ca làm việc'
      });
    }

    if (name !== undefined) shift.name = name;
    if (description !== undefined) shift.description = description;
    if (startTime !== undefined) shift.startTime = startTime;
    if (endTime !== undefined) shift.endTime = endTime;
    if (daysOfWeek !== undefined) shift.daysOfWeek = daysOfWeek;
    if (maxEmployees !== undefined) shift.maxEmployees = maxEmployees;
    if (isActive !== undefined) shift.isActive = isActive;
    if (color !== undefined) shift.color = color;

    await shift.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật ca làm việc thành công',
      data: shift
    });
  } catch (error) {
    next(error);
  }
};

export const deleteShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shift = await Shift.findById(id);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ca làm việc'
      });
    }

    // Check if there are active registrations for this shift
    const activeRegistrations = await ShiftRegistration.countDocuments({
      shift: id,
      status: { $in: ['pending', 'approved'] }
    });

    if (activeRegistrations > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa ca làm việc đang có đăng ký hoạt động'
      });
    }

    await Shift.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Xóa ca làm việc thành công'
    });
  } catch (error) {
    next(error);
  }
};

export const getShiftEmployees = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.query;
    const query = { shift: id };
    if (status) query.status = status;

    const registrations = await ShiftRegistration.find(query)
      .populate('user', 'name email phone position')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: registrations,
      count: registrations.length
    });
  } catch (error) {
    next(error);
  }
};
