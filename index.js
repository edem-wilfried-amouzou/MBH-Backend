const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);

// Enable CORS for Socket.IO and Express
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(bodyParser.json());

// Attach io to req so routes can use it
app.use((req, res, next) => {
  req.io = io;
  next();
});

// MongoDB Connection
mongoose.connect('mongodb+srv://credoagotcha_db_user:meJLIIom4Xn7Ylra@agrilogix.2xeowxj.mongodb.net/?retryWrites=true&w=majority').then(() => console.log("MongoDB Online Connected"))
  .catch(err => console.log("MongoDB connection error:", err));

app.use('/api', apiRoutes);

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log('A user connected via WebSocket');
  
  // User joins a thread room to receive specific messages
  socket.on('join_thread', (threadId) => {
    socket.join(threadId);
    console.log(`User joined thread: ${threadId}`);
  });

  // User joins a cooperative room to receive new threads
  socket.on('join_coop', (coopId) => {
    socket.join(`coop_${coopId}`);
    console.log(`User joined coop: ${coopId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
