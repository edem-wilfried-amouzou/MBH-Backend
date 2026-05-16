const mongoose = require('mongoose');

const CooperativeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  location: String,
  cropType: String,
  foundedYear: Number,
  members: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, default: 'Membre' },
      joinedAt: { type: Date, default: Date.now }
    }
  ],
  pendingMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  balance: { type: Number, default: 0 },
  /** Invitation : lien `/rejoindre?invite=…` ou app mobile avec le même paramètre */
  inviteToken: { type: String, default: null, sparse: true, index: true },
  inviteTokenCreatedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Cooperative', CooperativeSchema);
