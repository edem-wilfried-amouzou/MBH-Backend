require('dotenv').config();

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

const DEFAULT_WEB_ORIGINS = [
  'https://agrixlogix.vercel.app',
  'https://agrilogix-five.vercel.app',
  'https://agrix-logix.vercel.app',
  'https://agrilogix-ten.vercel.app',
  'https://agrixlogix.vercel.app', 
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5177',

];

/** Domaines frontend autorisés (variable d'environnement, séparateurs virgule). */
function parseOriginsCsv(value) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

const EXTRA_ORIGINS = parseOriginsCsv(process.env.CORS_ORIGINS);
const ALLOWED_ORIGINS = [...new Set([...DEFAULT_WEB_ORIGINS, ...EXTRA_ORIGINS])];

function originAllows(origin) {
  if (!origin) return true; 
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Autoriser tous les sous-domaines vercel.app par défaut pour faciliter le test
  if (/\.vercel\.app$/i.test(origin)) return true;
  return false;
}

// Enable CORS for Socket.IO and Express
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => cb(null, originAllows(origin)),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(
  cors({
    origin: (origin, cb) => cb(null, originAllows(origin)),
    credentials: true,
  })
);
app.use(bodyParser.json());

// Attach io to req so routes can use it
app.use((req, res, next) => {
  req.io = io;
  next();
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI || process.env.MONGO_URI_LOCAL)
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

  // User joins a cooperative room to receive new threads and track online presence
  socket.on('join_coop', (coopId) => {
    if (!socket.user) return;
    const room = `coop_${coopId}`;
    socket.join(room);
    console.log(`User joined coop: ${coopId}`);

    // Notify the room of the new count
    const count = io.sockets.adapter.rooms.get(room)?.size || 0;
    io.to(room).emit('online_update', count);
    socket.currentCoopRoom = room;
  });

  socket.on('disconnecting', () => {
    // Before actual disconnect, update counts for all rooms the socket is in
    for (const room of socket.rooms) {
      if (room && room.startsWith('coop_')) {
        const count = (io.sockets.adapter.rooms.get(room)?.size || 1) - 1;
        io.to(room).emit('online_update', count);
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
