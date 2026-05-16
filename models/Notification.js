const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  cooperativeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cooperative', 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['transaction', 'vote', 'cotisation', 'member', 'announcement'],
    default: 'announcement'
  },
  senderName: String,
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  data: {
    targetId: mongoose.Schema.Types.ObjectId,
    amount: Number,
  },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
