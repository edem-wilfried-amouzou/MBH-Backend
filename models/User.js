const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  address: { type: String, default: '' },
  email: { type: String, trim: true, lowercase: true },
  password: { type: String, required: true },
  profession: { type: String, default: '' },
  bio: { type: String, default: '' },
  emailVerified: { type: Boolean, default: false },
  emailVerifyTokenHash: { type: String },
  emailVerifyExpiresAt: { type: Date },
  hasSeenGuide: { type: Boolean, default: false },
  isSystemAdmin: { type: Boolean, default: false },
  pushToken: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

UserSchema.index(
  { email: 1 },
  {
    unique: true,
    sparse: true,
  }
);

UserSchema.index(
  { phone: 1 },
  {
    unique: true,
    sparse: true,
  }
);

module.exports = mongoose.model('User', UserSchema);
