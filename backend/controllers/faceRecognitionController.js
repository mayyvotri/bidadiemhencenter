import FaceProfile from '../models/FaceProfile.js';
import FaceVerificationLog from '../models/FaceVerificationLog.js';
import User from '../models/User.js';

// Euclidean distance for face descriptor comparison
const euclideanDistance = (descriptor1, descriptor2) => {
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
  }
  return Math.sqrt(sum);
};

// Find best matching face profile
const findBestMatch = (faceDescriptor, faceProfiles, threshold = 0.6) => {
  let bestMatch = null;
  let bestDistance = threshold;

  for (const profile of faceProfiles) {
    for (const storedDescriptor of profile.faceDescriptors) {
      const distance = euclideanDistance(faceDescriptor, storedDescriptor);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = profile;
      }
    }
  }

  return { bestMatch, bestDistance };
};

export const registerFace = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { faceDescriptors } = req.body;

    if (!faceDescriptors || !Array.isArray(faceDescriptors) || faceDescriptors.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Cần ít nhất 3 khuôn mặt để đăng ký'
      });
    }

    // Validate each descriptor
    for (const descriptor of faceDescriptors) {
      if (!Array.isArray(descriptor) || descriptor.length !== 128) {
        return res.status(400).json({
          success: false,
          message: 'Mỗi descriptor phải là mảng 128 số'
        });
      }
    }

    // Check if user already has a face profile
    let faceProfile = await FaceProfile.findOne({ user: userId });

    if (faceProfile) {
      // Update existing profile
      faceProfile.faceDescriptors = faceDescriptors;
      faceProfile.captureCount = faceDescriptors.length;
      faceProfile.registeredAt = new Date();
      faceProfile.isActive = true;
      await faceProfile.save();
    } else {
      // Create new profile
      faceProfile = await FaceProfile.create({
        user: userId,
        faceDescriptors,
        captureCount: faceDescriptors.length
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Đăng ký khuôn mặt thành công',
      data: {
        id: faceProfile._id,
        captureCount: faceProfile.captureCount,
        registeredAt: faceProfile.registeredAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyFace = async (req, res, next) => {
  try {
    const { faceDescriptor, verificationType } = req.body;

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'Face descriptor không hợp lệ'
      });
    }

    if (!verificationType || !['checkin', 'checkout'].includes(verificationType)) {
      return res.status(400).json({
        success: false,
        message: 'Loại xác thực không hợp lệ'
      });
    }

    // Get all active face profiles
    const faceProfiles = await FaceProfile.find({ isActive: true }).populate('user');

    if (faceProfiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không có hồ sơ khuôn mặt nào'
      });
    }

    // Find best match
    const { bestMatch, bestDistance } = findBestMatch(faceDescriptor, faceProfiles);

    if (!bestMatch) {
      // Log failed verification
      await FaceVerificationLog.create({
        user: null,
        faceProfile: null,
        verificationType,
        success: false,
        confidence: 0,
        faceDescriptor,
        errorMessage: 'Không tìm thấy khuôn mặt phù hợp',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.status(401).json({
        success: false,
        message: 'Không thể xác thực khuôn mặt',
        confidence: 0
      });
    }

    const confidence = (1 - bestDistance) * 100;

    // Log successful verification
    await FaceVerificationLog.create({
      user: bestMatch.user._id,
      faceProfile: bestMatch._id,
      verificationType,
      success: true,
      confidence,
      faceDescriptor,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Update last used timestamp
    bestMatch.lastUsedAt = new Date();
    await bestMatch.save();

    return res.status(200).json({
      success: true,
      message: 'Xác thực khuôn mặt thành công',
      data: {
        user: bestMatch.user,
        confidence: confidence.toFixed(2),
        faceProfileId: bestMatch._id
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getFaceProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const faceProfile = await FaceProfile.findOne({ user: userId }).populate('user', 'name email');

    if (!faceProfile) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ khuôn mặt'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: faceProfile._id,
        captureCount: faceProfile.captureCount,
        registeredAt: faceProfile.registeredAt,
        lastUsedAt: faceProfile.lastUsedAt,
        isActive: faceProfile.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFaceProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const faceProfile = await FaceProfile.findOneAndDelete({ user: userId });

    if (!faceProfile) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ khuôn mặt'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Xóa hồ sơ khuôn mặt thành công'
    });
  } catch (error) {
    next(error);
  }
};

export const getVerificationLogs = async (req, res, next) => {
  try {
    const { userId, verificationType, success, limit = 50 } = req.query;

    const query = {};

    if (userId) query.user = userId;
    if (verificationType) query.verificationType = verificationType;
    if (success !== undefined) query.success = success === 'true';

    const logs = await FaceVerificationLog.find(query)
      .populate('user', 'name email')
      .populate('faceProfile')
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

export const getAllFaceProfiles = async (req, res, next) => {
  try {
    const faceProfiles = await FaceProfile.find()
      .populate('user', 'name email phone role position')
      .sort({ registeredAt: -1 });

    return res.status(200).json({
      success: true,
      data: faceProfiles,
      count: faceProfiles.length
    });
  } catch (error) {
    next(error);
  }
};

export const toggleFaceProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const faceProfile = await FaceProfile.findById(id);

    if (!faceProfile) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ khuôn mặt'
      });
    }

    faceProfile.isActive = !faceProfile.isActive;
    await faceProfile.save();

    return res.status(200).json({
      success: true,
      message: faceProfile.isActive ? 'Kích hoạt hồ sơ thành công' : 'Vô hiệu hóa hồ sơ thành công',
      data: {
        id: faceProfile._id,
        isActive: faceProfile.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};
