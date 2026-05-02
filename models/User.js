const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  role: { type: String, default: 'Membre' },
  email: { type: String, trim: true, lowercase: true },
  password: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  emailVerifyTokenHash: { type: String },
  emailVerifyExpiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

UserSchema.index(
  { email: 1 },
  {
    unique: true,
    sparse: true,
  }
);

module.exports = mongoose.model('User', UserSchema);
