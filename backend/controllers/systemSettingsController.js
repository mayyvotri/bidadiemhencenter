import SystemSettings from '../models/SystemSettings.js';

export const getSettings = async (req, res, next) => {
  try {
    const settings = await SystemSettings.getSettings();
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const { businessName, location, allowedRadius, gpsVerificationEnabled, faceVerificationEnabled } = req.body;

    const settings = await SystemSettings.getSettings();

    if (businessName !== undefined) settings.businessName = businessName;
    if (location !== undefined) {
      if (location.latitude !== undefined) settings.location.latitude = location.latitude;
      if (location.longitude !== undefined) settings.location.longitude = location.longitude;
      if (location.address !== undefined) settings.location.address = location.address;
    }
    if (allowedRadius !== undefined) {
      if (allowedRadius < 10 || allowedRadius > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Bán kính phải từ 10m đến 1000m'
        });
      }
      settings.allowedRadius = allowedRadius;
    }
    if (gpsVerificationEnabled !== undefined) settings.gpsVerificationEnabled = gpsVerificationEnabled;
    if (faceVerificationEnabled !== undefined) settings.faceVerificationEnabled = faceVerificationEnabled;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật cài đặt thành công',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};
