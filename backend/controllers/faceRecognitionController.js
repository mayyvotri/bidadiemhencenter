import FaceProfile from '../models/FaceProfile.js';
import FaceVerificationLog from '../models/FaceVerificationLog.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

const IP = (req) => req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
const UA = (req) => req.headers['user-agent'] || null;

const EUCLIDEAN_THRESHOLD = 0.55;

const euclideanDistance = (d1, d2) => {
  let sum = 0;
  for (let i = 0; i < d1.length; i++) sum += Math.pow(d1[i] - d2[i], 2);
  return Math.sqrt(sum);
};

const findBestMatch = (descriptor, profiles) => {
  let best = null;
  let bestDist = EUCLIDEAN_THRESHOLD;
  for (const p of profiles) {
    if (!p.isActive || p.isDeleted) continue;
    for (const stored of p.faceDescriptors) {
      const dist = euclideanDistance(descriptor, stored);
      if (dist < bestDist) { bestDist = dist; best = p; }
    }
  }
  return { match: best, distance: bestDist };
};

// ─── Register Face ────────────────────────────────────────────────────────────

export const registerFace = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { faceDescriptors } = req.body;

    if (!faceDescriptors || !Array.isArray(faceDescriptors) || faceDescriptors.length < 5) {
      return res.status(400).json({ success: false, message: `Cần ít nhất 5 mẫu khuôn mặt (hiện tại: ${faceDescriptors?.length || 0})` });
    }
    if (faceDescriptors.length > 10) {
      return res.status(400).json({ success: false, message: 'Tối đa 10 mẫu khuôn mặt' });
    }

    for (const d of faceDescriptors) {
      if (!Array.isArray(d) || d.length !== 128) {
        return res.status(400).json({ success: false, message: 'Mỗi descriptor phải là mảng 128 số' });
      }
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });

    // Check if already registered (duplicate prevention)
    const existing = await FaceProfile.findOne({ user: userId, isDeleted: false });
    if (existing) {
      // Archive old profile
      existing.isDeleted = true;
      existing.replacedAt = new Date();
      existing.captureAngle = 'replaced';
      await existing.save();
    }

    const profile = await FaceProfile.create({
      user: userId,
      faceDescriptors,
      captureCount: faceDescriptors.length,
      descriptorCount: faceDescriptors.length,
      registeredAt: new Date(),
      isActive: true,
      isDeleted: false
    });

    await AuditLog.log({
      action: 'FACE_REGISTER',
      category: 'FACE',
      description: `Đăng ký khuôn mặt với ${faceDescriptors.length} mẫu`,
      performedBy: userId,
      performedByName: user.name,
      performedByRole: user.role,
      targetType: 'FaceProfile',
      targetId: String(profile._id),
      targetName: user.name,
      ipAddress: IP(req),
      userAgent: UA(req),
      status: 'SUCCESS',
      metadata: { captureCount: faceDescriptors.length, isUpdate: !!existing },
      severity: 'MEDIUM'
    });

    return res.status(201).json({
      success: true,
      message: existing ? 'Cập nhật khuôn mặt thành công' : 'Đăng ký khuôn mặt thành công',
      data: {
        id: profile._id,
        captureCount: profile.captureCount,
        descriptorCount: profile.descriptorCount,
        registeredAt: profile.registeredAt,
        lastUsedAt: profile.lastUsedAt,
        isActive: profile.isActive,
        isUpdate: !!existing
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Verify Face ──────────────────────────────────────────────────────────────

export const verifyFace = async (req, res, next) => {
  try {
    const { faceDescriptor, verificationType } = req.body;

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ success: false, message: 'Face descriptor không hợp lệ' });
    }
    if (!['checkin', 'checkout'].includes(verificationType)) {
      return res.status(400).json({ success: false, message: 'Loại xác thực không hợp lệ' });
    }

    const profiles = await FaceProfile.find({ isActive: true, isDeleted: false }).populate('user');
    if (profiles.length === 0) {
      return res.status(404).json({ success: false, message: 'Không có hồ sơ khuôn mặt nào được đăng ký' });
    }

    const { match, distance } = findBestMatch(faceDescriptor, profiles);

    if (!match) {
      await FaceVerificationLog.create({
        user: null, faceProfile: null, verificationType,
        success: false, confidence: 0, faceDescriptor,
        errorMessage: 'Không tìm thấy khuôn mặt phù hợp',
        ipAddress: IP(req), userAgent: UA(req)
      });
      return res.status(401).json({ success: false, message: 'Không thể xác thực khuôn mặt', confidence: 0 });
    }

    const confidence = Math.max(0, Math.min(100, ((1 - distance / EUCLIDEAN_THRESHOLD) * 100)));

    await FaceVerificationLog.create({
      user: match.user._id, faceProfile: match._id, verificationType,
      success: true, confidence, faceDescriptor,
      ipAddress: IP(req), userAgent: UA(req)
    });

    match.lastUsedAt = new Date();
    match.qualityScore = confidence;
    await match.save();

    await AuditLog.log({
      action: 'FACE_VERIFY',
      category: 'FACE',
      description: `Xác minh khuôn mặt ${verificationType} — "${match.user.name}" (confidence: ${confidence.toFixed(1)}%)`,
      performedBy: String(match.user._id),
      performedByName: match.user.name,
      performedByRole: match.user.role,
      targetType: 'FaceProfile',
      targetId: String(match._id),
      targetName: match.user.name,
      ipAddress: IP(req),
      userAgent: UA(req),
      status: 'SUCCESS',
      metadata: { confidence, verificationType, distance: Number(distance.toFixed(4)) },
      severity: confidence < 70 ? 'MEDIUM' : 'LOW'
    });

    return res.status(200).json({
      success: true,
      message: 'Xác thực khuôn mặt thành công',
      data: {
        user: {
          _id: match.user._id,
          name: match.user.name,
          email: match.user.email,
          role: match.user.role
        },
        confidence: Number(confidence.toFixed(2)),
        faceProfileId: match._id
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Own Profile ──────────────────────────────────────────────────────────

export const getFaceProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await FaceProfile.findOne({ user: userId, isDeleted: false })
      .populate('user', 'name email role position');

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Chưa đăng ký khuôn mặt' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: profile._id,
        captureCount: profile.captureCount,
        descriptorCount: profile.descriptorCount,
        registeredAt: profile.registeredAt,
        updatedAt: profile.updatedAt,
        lastUsedAt: profile.lastUsedAt,
        isActive: profile.isActive,
        qualityScore: profile.qualityScore,
        user: profile.user ? {
          name: profile.user.name,
          email: profile.user.email,
          role: profile.user.role
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Delete Own Profile ───────────────────────────────────────────────────────

export const deleteFaceProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await FaceProfile.findOne({ user: userId, isDeleted: false });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ khuôn mặt' });
    }

    profile.isDeleted = true;
    profile.isActive = false;
    await profile.save();

    const user = await User.findById(userId);
    await AuditLog.log({
      action: 'FACE_DELETE',
      category: 'FACE',
      description: `Xóa hồ sơ khuôn mặt`,
      performedBy: userId,
      performedByName: user?.name,
      performedByRole: user?.role,
      targetType: 'FaceProfile',
      targetId: String(profile._id),
      targetName: user?.name,
      ipAddress: IP(req),
      userAgent: UA(req),
      status: 'WARNING',
      severity: 'LOW'
    });

    return res.status(200).json({ success: true, message: 'Đã xóa hồ sơ khuôn mặt' });
  } catch (error) {
    next(error);
  }
};

// ─── Manager: Get All Profiles ───────────────────────────────────────────────

export const getAllFaceProfiles = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (search) {
      query.$or = [
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [profiles, total] = await Promise.all([
      FaceProfile.find({ isDeleted: false })
        .populate('user', 'name email role position phone')
        .sort({ registeredAt: -1 })
        .skip(skip).limit(parseInt(limit)),
      FaceProfile.countDocuments({ isDeleted: false, ...query })
    ]);

    const stats = await FaceProfile.aggregate([
      { $match: { isDeleted: false } },
      { $group: {
        _id: '$isActive',
        count: { $sum: 1 },
        totalDescriptors: { $sum: '$descriptorCount' }
      }}
    ]);

    const totalRegistered = profiles.length;
    const activeCount = profiles.filter(p => p.isActive).length;

    return res.status(200).json({
      success: true,
      data: {
        profiles: profiles.map(p => ({
          id: p._id,
          user: p.user ? {
            _id: p.user._id,
            name: p.user.name,
            email: p.user.email,
            role: p.user.role,
            position: p.user.position,
            phone: p.user.phone
          } : null,
          captureCount: p.captureCount,
          descriptorCount: p.descriptorCount,
          registeredAt: p.registeredAt,
          updatedAt: p.updatedAt,
          lastUsedAt: p.lastUsedAt,
          isActive: p.isActive,
          qualityScore: p.qualityScore,
          notes: p.notes
        })),
        stats: { total: totalRegistered, active: activeCount },
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Manager: Toggle Profile ─────────────────────────────────────────────────

export const toggleFaceProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = await FaceProfile.findById(id);
    if (!profile) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });

    const wasActive = profile.isActive;
    profile.isActive = !profile.isActive;
    await profile.save();

    const user = await User.findById(profile.user);
    await AuditLog.log({
      action: 'FACE_TOGGLE',
      category: 'FACE',
      description: `${wasActive ? 'Vô hiệu hóa' : 'Kích hoạt'} hồ sơ khuôn mặt của "${user?.name}"`,
      performedBy: req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      targetType: 'FaceProfile',
      targetId: id,
      targetName: user?.name,
      ipAddress: IP(req),
      userAgent: UA(req),
      status: wasActive ? 'WARNING' : 'SUCCESS',
      severity: 'MEDIUM'
    });

    return res.status(200).json({
      success: true,
      message: profile.isActive ? 'Đã kích hoạt hồ sơ' : 'Đã vô hiệu hóa hồ sơ',
      data: { id: profile._id, isActive: profile.isActive }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Manager: Delete Profile ─────────────────────────────────────────────────

export const deleteFaceProfileAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = await FaceProfile.findById(id);
    if (!profile) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });

    const user = await User.findById(profile.user);
    profile.isDeleted = true;
    profile.isActive = false;
    await profile.save();

    await AuditLog.log({
      action: 'FACE_DELETE_ADMIN',
      category: 'FACE',
      description: `Admin xóa hồ sơ khuôn mặt của "${user?.name}"`,
      performedBy: req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      targetType: 'FaceProfile',
      targetId: id,
      targetName: user?.name,
      ipAddress: IP(req),
      userAgent: UA(req),
      status: 'WARNING',
      severity: 'MEDIUM'
    });

    return res.status(200).json({ success: true, message: 'Đã xóa hồ sơ khuôn mặt' });
  } catch (error) {
    next(error);
  }
};

// ─── Manager: Get Verification Logs ──────────────────────────────────────────

export const getVerificationLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, userId, verificationType, success, dateFrom, dateTo } = req.query;
    const query = {};
    if (userId) query.user = userId;
    if (verificationType) query.verificationType = verificationType;
    if (success !== undefined) query.success = success === 'true';
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      FaceVerificationLog.find(query)
        .populate('user', 'name email role')
        .populate('faceProfile')
        .sort({ createdAt: -1 })
        .skip(skip).limit(parseInt(limit)),
      FaceVerificationLog.countDocuments(query)
    ]);

    const stats = await FaceVerificationLog.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        success: { $sum: { $cond: ['$success', 1, 0] } },
        failure: { $sum: { $cond: ['$success', 0, 1] } },
        avgConfidence: { $avg: '$confidence' }
      }}
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs: logs.map(l => ({
          id: l._id, user: l.user, verificationType: l.verificationType,
          success: l.success, confidence: l.confidence,
          errorMessage: l.errorMessage, ipAddress: l.ipAddress,
          createdAt: l.createdAt
        })),
        stats: stats[0] || { total: 0, success: 0, failure: 0, avgConfidence: 0 },
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
};
