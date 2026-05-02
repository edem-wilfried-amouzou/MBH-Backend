const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const apiRoutes = require('./routes/api');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// Enable CORS for Socket.IO and Express
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173","http://localhost:5175", "http://localhost:5174/", "http://localhost:5177", "https://agrilogix-five.vercel.app"],
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5174", "https://agrilogix-five.vercel.app"],
  credentials: true
}));
app.use(bodyParser.json());

// Attach io to req so routes can use it
app.use((req, res, next) => {
  req.io = io;
  next();
});

// MongoDB Connection
mongoose
  .connect('mongodb+srv://credoagotcha_db_user:KUAUbwXyZSvb6HxC@agrilogix.2xeowxj.mongodb.net/')
  .then(async () => {
    console.log('MongoDB Connected');
    try {
      const cleanup = await User.updateMany(
        { $or: [{ email: null }, { email: '' }] },
        { $unset: { email: 1 } }
      );
      if (cleanup.modifiedCount) console.log(`DB: removed empty email field on ${cleanup.modifiedCount} user(s)`);
      await User.syncIndexes();
    } catch (e) {
      console.warn('User indexes/cleanup:', e.message);
    }
  })
  .catch((err) => console.log('MongoDB connection error:', err));

app.use('/api', apiRoutes);
app.use('/', apiRoutes); // Mount at root to support /login and /api/login

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const userId = socket.handshake.auth?.userId || socket.handshake.headers['x-user-id'];
    if (!userId) return next(new Error('Authentication required'));
    const user = await User.findById(userId);
    if (!user) return next(new Error('Invalid user'));
    socket.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log('A user connected via WebSocket', socket.user ? socket.user.name : socket.id);
  // join a user-specific room to allow server -> user direct emits
  try {
    if (socket.user && socket.user._id) {
      socket.join(`user_${socket.user._id.toString()}`);
    }
  } catch (e) {
    console.error('Failed to join user room', e.message);
  }
  
  // User joins a thread room to receive specific messages
  socket.on('join_thread', (threadId) => {
    // ensure authenticated
    if (!socket.user) return;
    socket.join(threadId);
    console.log(`User joined thread: ${threadId}`);
    
    // Notify all users in the thread of the current count
    const count = io.sockets.adapter.rooms.get(threadId)?.size || 0;
    io.to(threadId).emit('online_count', count);
    
    // Store current thread to handle count on disconnect
    socket.currentThread = threadId;
  });

  // User joins a cooperative room to receive new threads
  socket.on('join_coop', (coopId) => {
    if (!socket.user) return;
    socket.join(`coop_${coopId}`);
    console.log(`User joined coop: ${coopId}`);
  });

  socket.on('disconnecting', () => {
    // Before actual disconnect, update counts for all rooms the socket is in
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        const count = (io.sockets.adapter.rooms.get(room)?.size || 1) - 1;
        io.to(room).emit('online_count', count);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
