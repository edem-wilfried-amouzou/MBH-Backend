const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative', required: true },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  title: String,
  description: String,
  status: { type: String, enum: ['active', 'approved', 'rejected'], default: 'active' },
  yesVotes: { type: Number, default: 0 },
  noVotes: { type: Number, default: 0 },
  votedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
});

module.exports = mongoose.model('Vote', VoteSchema);
