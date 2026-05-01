const mongoose = require('mongoose');

const ForumThreadSchema = new mongoose.Schema({
  cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative', required: true },
  title: { type: String, required: true },
  category: { type: String, default: 'general' },
  content: String,
  authorName: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  postCount: { type: Number, default: 0 }
});

const ForumPostSchema = new mongoose.Schema({
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumThread', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: String,
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  ForumThread: mongoose.model('ForumThread', ForumThreadSchema),
  ForumPost: mongoose.model('ForumPost', ForumPostSchema)
};
