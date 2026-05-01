const mongoose = require('mongoose');

const CooperativeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  location: { type: String, required: true },
  cropType: String,
  foundedYear: Number,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cooperative', CooperativeSchema);
