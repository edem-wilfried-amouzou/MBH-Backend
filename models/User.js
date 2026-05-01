const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: String,
  role: { type: String, default: 'Membre' },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }, // hashed
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
