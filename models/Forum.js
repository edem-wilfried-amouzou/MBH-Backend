const mongoose = require('mongoose');

const ForumThreadSchema = new mongoose.Schema({
  cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative', required: true },
  title: { type: String, required: true },
  authorName: String,
  createdAt: { type: Date, default: Date.now }
});

const ForumPostSchema = new mongoose.Schema({
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumThread', required: true },
  authorName: String,
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  ForumThread: mongoose.model('ForumThread', ForumThreadSchema),
  ForumPost: mongoose.model('ForumPost', ForumPostSchema)
};
