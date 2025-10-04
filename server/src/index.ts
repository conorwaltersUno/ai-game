import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { setupWebSocket } from './websocket/handlers';
import gamesRouter from './routes/games';
import roundsRouter from './routes/rounds';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io with permissive CORS for game night
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: true, // Allow all origins (needed for Cloudflare tunnel and various access points)
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware - Allow all origins for game night accessibility
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public/generated-images
const generatedImagesPath = path.join(__dirname, '../public/generated-images');
app.use('/images', express.static(generatedImagesPath));
console.log(`📁 Serving generated images from: ${generatedImagesPath}`);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.get('/api', (_req, res) => {
  res.json({ message: 'Twin up! API Server', version: '1.0.0' });
});

app.use('/api/games', gamesRouter);
app.use('/api/rounds', roundsRouter);

// WebSocket setup
setupWebSocket(io);

// Make io available to routes via app.locals
app.locals.io = io;

// Also make io available globally for services that need to broadcast
// (This is a workaround to avoid circular dependencies)
(global as any).io = io;

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = Number(process.env.PORT) || 3001;
const HOST = '0.0.0.0';
httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Network: http://192.168.5.10:${PORT}`);
  console.log(`🎮 WebSocket server ready`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
});

export { app, io };
