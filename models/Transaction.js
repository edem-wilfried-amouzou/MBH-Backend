const mongoose = require('mongoose');
const crypto = require('crypto');

const TransactionSchema = new mongoose.Schema({
  cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative', required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['in', 'out', 'cotisation', 'deposit', 'credit'], required: true },
  category: String,
  submittedBy: String,
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['completed', 'pending', 'rejected'], default: 'completed' },
  txHash: { type: String, sparse: true },
  previousHash: { type: String, default: '0' },
  nonce: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  fedapayId: { type: String, sparse: true, index: true },  // ID de transaction FedaPay (déduplication)
  cinetpayId: { type: String, sparse: true, index: true },  // ID de transaction CinetPay
  // ─── Moyen de paiement ────────────────────────────────────────────────────
  accountType: {
    type: String,
    enum: ['mobile', 'bancaire', ''],
    default: '',
  }, // Type : 'mobile' (Mobile Money) ou 'bancaire' (compte bancaire)
  paymentMethod: {
    type: String,
    default: '',
    trim: true,
  }, // Ex : MTN, Moov, Flooz, T-Money, Virement, Espèces, FedaPay, Manuel
  accountNumber: {
    type: String,
    default: '',
    trim: true,
  }, // Numéro Mobile Money (ex: 90123456) ou IBAN / numéro de compte bancaire
});

// Calcul du hash SHA-256 du bloc
TransactionSchema.methods.calculateHash = function() {
  const data = this.cooperativeId + this.title + this.amount + this.type + this.previousHash + this.nonce + this.date.getTime();
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Avant chaque sauvegarde, on scelle la transaction si elle est complétée
TransactionSchema.pre('save', async function() {
  if (this.status === 'completed') {
    // Si on a déjà un hash "réel" (ex: 0x...), on ne le modifie jamais (sauf si forcé par admin)
    const isRealHash = typeof this.txHash === 'string' && this.txHash.startsWith('0x');
    
    if (!isRealHash || this.isModified('amount') || this.isModified('title') || this.isModified('status')) {
      // On ne recalcule que si c'est nécessaire
      if (!this.previousHash || this.previousHash === '0') {
        const lastTx = await this.constructor.findOne({ 
          cooperativeId: this.cooperativeId, 
          status: 'completed',
          _id: { $ne: this._id } 
        }).sort({ date: -1 });
        this.previousHash = lastTx && lastTx.txHash ? lastTx.txHash : '0';
      }
      
      // Si on modifie un champ sensible, on invalide le hash réel (on repasse en local) 
      // ou on recalcule le hash local si pas de hash réel
      if (!isRealHash || this.isModified('amount') || this.isModified('title')) {
        this.txHash = this.calculateHash();
      }
    }
  }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
