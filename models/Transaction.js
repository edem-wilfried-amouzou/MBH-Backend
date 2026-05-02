const mongoose = require('mongoose');
const crypto = require('crypto');

const TransactionSchema = new mongoose.Schema({
  cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative', required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['in', 'out'], required: true },
  category: String,
  submittedBy: String,
  status: { type: String, enum: ['completed', 'pending', 'rejected'], default: 'completed' },
  txHash: { type: String, unique: true, sparse: true },
  previousHash: { type: String, default: '0' },
  nonce: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
});

// Calcul du hash SHA-256 du bloc
TransactionSchema.methods.calculateHash = function() {
  const data = this.cooperativeId + this.title + this.amount + this.type + this.previousHash + this.nonce + this.date.getTime();
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Avant chaque sauvegarde, on scelle la transaction
TransactionSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('amount') || this.isModified('title')) {
    if (!this.previousHash || this.previousHash === '0') {
      const lastTx = await this.constructor.findOne({ cooperativeId: this.cooperativeId }).sort({ date: -1 });
      this.previousHash = lastTx ? lastTx.txHash : '0';
    }
    this.txHash = this.calculateHash();
  }
  next();
});

module.exports = mongoose.model('Transaction', TransactionSchema);
