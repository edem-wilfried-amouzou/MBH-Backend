const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Cooperative = require('../models/Cooperative');
const Transaction = require('../models/Transaction');
const Vote = require('../models/Vote');
const { ForumThread, ForumPost } = require('../models/Forum');

// USERS - Registration with automatic credentials
router.post('/users', async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    // Generate automatic credentials
    const firstName = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const email = `${firstName}${randomNum}@agrilogix.com`;
    
    // Generate strong 8-character password
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let clearPassword = "";
    for (let i = 0; i < 8; i++) {
      clearPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(clearPassword, 10);
    
    const user = new User({
      name,
      phone,
      address,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    // Return the user along with the clear text password so the UI can show it
    res.status(201).json({
      user,
      credentials: {
        email,
        password: clearPassword
      }
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// LOGIN
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { name, phone, address }, { new: true });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// COOPERATIVES
router.post('/cooperatives', async (req, res) => {
  try {
    const coop = new Cooperative(req.body);
    await coop.save();
    res.status(201).json(coop);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/cooperatives', async (req, res) => {
  const coops = await Cooperative.find().populate('members');
  res.json(coops);
});

// Join a cooperative (request)
// UPDATE MEMBER ROLE
router.put('/cooperatives/:id/members/:userId/role', async (req, res) => {
  try {
    const { role } = req.body;
    // Update the User model directly as role is stored there
    const updatedUser = await User.findByIdAndUpdate(req.params.userId, { role }, { new: true });
    if (updatedUser) {
      res.json(updatedUser);
    } else {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// REMOVE MEMBER
router.delete('/cooperatives/:id/members/:userId', async (req, res) => {
  try {
    const coop = await Cooperative.findById(req.params.id);
    coop.members = coop.members.filter(m => m._id.toString() !== req.params.userId);
    await coop.save();
    // Also remove them from votedMembers in all active votes for this coop
    await Vote.updateMany(
      { cooperativeId: req.params.id },
      { $pull: { votedMembers: req.params.userId } }
    );
    res.json(coop);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/cooperatives/:id/join', async (req, res) => {
  try {
    const { userId } = req.body;
    const coop = await Cooperative.findById(req.params.id);
    if (!coop) return res.status(404).json({ error: 'Coop not found' });
    
    // Check if already a member
    if (coop.members.includes(userId)) {
      return res.status(400).json({ error: 'Déjà membre de cette coopérative' });
    }
    
    // Check if already pending
    if (coop.pendingMembers.includes(userId)) {
      return res.status(400).json({ error: 'Demande déjà en cours' });
    }
    
    coop.pendingMembers.push(userId);
    await coop.save();
    res.json({ message: 'Demande envoyée' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get pending members
router.get('/cooperatives/:id/pending', async (req, res) => {
  try {
    const coop = await Cooperative.findById(req.params.id).populate('pendingMembers');
    if (!coop) return res.status(404).json({ error: 'Coop not found' });
    res.json(coop.pendingMembers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Approve a member
router.post('/cooperatives/:id/approve', async (req, res) => {
  try {
    const { userId } = req.body;
    const coop = await Cooperative.findById(req.params.id);
    if (!coop) return res.status(404).json({ error: 'Coop not found' });
    
    // Remove from pending
    coop.pendingMembers = coop.pendingMembers.filter(m => m.toString() !== userId);
    
    // Add to members
    if (!coop.members.includes(userId)) {
      coop.members.push(userId);
    }
    
    await coop.save();
    res.json({ message: 'Membre approuvé' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reject a member request
router.post('/cooperatives/:id/reject', async (req, res) => {
  try {
    const { userId } = req.body;
    const coop = await Cooperative.findById(req.params.id);
    if (!coop) return res.status(404).json({ error: 'Coop not found' });
    
    coop.pendingMembers = coop.pendingMembers.filter(m => m.toString() !== userId);
    await coop.save();
    res.json({ message: 'Demande rejetée' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/cooperatives/:id/members', async (req, res) => {
  try {
    const coop = await Cooperative.findById(req.params.id);
    if (!coop) return res.status(404).json({error: 'Coop not found'});
    
    // Legacy support or direct add by admin
    if (!coop.members.includes(req.body.userId)) {
      coop.members.push(req.body.userId);
      await coop.save();
    }
    res.json(coop);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/cooperatives/:id/sidebar-stats', async (req, res) => {
  try {
    const coop = await Cooperative.findById(req.params.id);
    if (!coop) return res.status(404).json({ error: 'Coop not found' });
    
    const activeVotes = await Vote.countDocuments({ cooperativeId: req.params.id, status: 'active' });
    const pendingMembers = coop.pendingMembers.length;
    
    res.json({ activeVotes, pendingMembers });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/cooperatives/:id/stats', async (req, res) => {
  try {
    const coop = await Cooperative.findById(req.params.id);
    if (!coop) return res.status(404).json({error: 'Coop not found'});
    
    const transactions = await Transaction.find({ cooperativeId: req.params.id });
    const votes = await Vote.find({ cooperativeId: req.params.id, status: 'active' });
    
    let totalIn = 0;
    let totalOut = 0;
    transactions.forEach(t => {
      if (t.status === 'completed') {
        if (t.type === 'in') totalIn += t.amount;
        if (t.type === 'out') totalOut += t.amount;
      }
    });
    
    res.json({
      balance: totalIn - totalOut,
      totalTransactions: transactions.length,
      activeVotes: votes.length,
      membersCount: coop.members.length
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// TRANSACTIONS
router.get('/cooperatives/:id/transactions', async (req, res) => {
  const txs = await Transaction.find({ cooperativeId: req.params.id }).sort({ date: -1 });
  res.json(txs);
});

router.post('/cooperatives/:id/transactions', async (req, res) => {
  try {
    const { title, amount, type, category, submittedBy } = req.body;
    const coopId = req.params.id;
    
    const newTx = new Transaction({
      cooperativeId: coopId,
      title,
      amount,
      type,
      category,
      submittedBy,
      status: 'completed',
      txHash: '0x' + Math.random().toString(16).substr(2, 40)
    });
    
    if (type === 'out' && amount > 500000) {
      newTx.status = 'pending';
      await newTx.save();
      
      const newVote = new Vote({
        cooperativeId: coopId,
        transactionId: newTx._id,
        title: `Vote for: ${title}`,
        description: `Demande de sortie de fonds d'un montant de ${amount} FCFA.`
      });
      await newVote.save();
    } else {
      await newTx.save();
    }
    
    res.status(201).json(newTx);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// VOTES
// Create a manual proposal (vote without transaction)
router.post('/cooperatives/:id/proposals', async (req, res) => {
  try {
    const { title, description } = req.body;
    const newVote = new Vote({
      cooperativeId: req.params.id,
      title,
      description,
      status: 'active'
    });
    await newVote.save();
    res.status(201).json(newVote);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/cooperatives/:id/votes', async (req, res) => {
  const votes = await Vote.find({ cooperativeId: req.params.id }).sort({ createdAt: -1 });
  res.json(votes);
});

router.post('/votes/:id/cast', async (req, res) => {
  try {
    const { vote, userId } = req.body;
    const voteItem = await Vote.findById(req.params.id);
    if (!voteItem) return res.status(404).json({ error: 'Vote not found' });
    
    if (voteItem.votedMembers.includes(userId)) {
      return res.status(400).json({ error: 'User already voted' });
    }
    
    if (vote === 'yes') voteItem.yesVotes += 1;
    if (vote === 'no') voteItem.noVotes += 1;
    voteItem.votedMembers.push(userId);
    
    const coop = await Cooperative.findById(voteItem.cooperativeId);
    const totalMembers = coop.members.length;
    const majorityThreshold = Math.floor(totalMembers / 2) + 1; // 50% + 1
    
    // Logic: Only decide AFTER EVERYONE has voted
    if (voteItem.votedMembers.length === totalMembers) {
      if (voteItem.yesVotes > voteItem.noVotes) {
        voteItem.status = 'approved';
        if (voteItem.transactionId) {
          await Transaction.findByIdAndUpdate(voteItem.transactionId, { status: 'completed' });
        }
      } else {
        voteItem.status = 'rejected';
        if (voteItem.transactionId) {
          await Transaction.findByIdAndUpdate(voteItem.transactionId, { status: 'rejected' });
        }
      }
    }
    
    await voteItem.save();
    res.json(voteItem);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FORUMS
router.get('/cooperatives/:id/forums', async (req, res) => {
  const threads = await ForumThread.find({ cooperativeId: req.params.id }).sort({ createdAt: -1 });
  res.json(threads);
});

router.post('/cooperatives/:id/forums', async (req, res) => {
  try {
    const thread = new ForumThread({ ...req.body, cooperativeId: req.params.id });
    await thread.save();
    req.io.to(`coop_${req.params.id}`).emit('new_thread', thread);
    res.status(201).json(thread);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/forums/:threadId/posts', async (req, res) => {
  const posts = await ForumPost.find({ threadId: req.params.threadId }).sort({ createdAt: 1 });
  res.json(posts);
});

router.post('/forums/:threadId/posts', async (req, res) => {
  try {
    const post = new ForumPost({ ...req.body, threadId: req.params.threadId });
    await post.save();
    req.io.to(req.params.threadId).emit('new_post', post);
    res.status(201).json(post);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
