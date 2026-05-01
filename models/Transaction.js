const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative', required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['in', 'out'], required: true },
  category: String,
  submittedBy: String,
  status: { type: String, enum: ['completed', 'pending', 'rejected'], default: 'completed' },
  txHash: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
