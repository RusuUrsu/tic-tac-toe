import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import SocketManager from './socket/socketManager';
import authRoutes from './routes/auth.routes';

// Load environment variables
dotenv.config();

// Create Express app and HTTP server
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Vite's default port
    methods: ["GET", "POST"]
  }
});

// Initialize socket manager
new SocketManager(io);

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Import routes
import gameHistoryRoutes from './routes/gameHistory.routes';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameHistoryRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tictactoe';
console.log('Attempting to connect to MongoDB at:', mongoUri);

mongoose.connect(mongoUri)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    
    // Start server only after successful DB connection
    const PORT = process.env.PORT || 3001; // Changed to 3001 to avoid conflicts
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log('Test the server by visiting:');
      console.log(`http://localhost:${PORT}/test`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
