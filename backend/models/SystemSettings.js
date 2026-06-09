import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema({
  businessName: {
    type: String,
    default: 'Billiard Club'
  },
  location: {
    latitude: {
      type: Number,
      required: true,
      default: 0
    },
    longitude: {
      type: Number,
      required: true,
      default: 0
    },
    address: {
      type: String,
      default: ''
    }
  },
  allowedRadius: {
    type: Number,
    required: true,
    default: 100, // meters
    min: 10,
    max: 1000
  },
  gpsVerificationEnabled: {
    type: Boolean,
    default: true
  },
  faceVerificationEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model('SystemSettings', systemSettingsSchema);
