import { Server as SocketIOServer, Socket } from 'socket.io';

export function setupWebSocket(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Handle player joining a game
    socket.on('join-game', ({ gameCode, playerId }) => {
      const roomName = `game:${gameCode}`;
      socket.join(roomName);
      console.log(`🎮 Player ${playerId} joined game ${gameCode}`);

      // Broadcast to other players in the room
      socket.to(roomName).emit('player:joined', {
        socketId: socket.id,
        playerId,
        timestamp: new Date().toISOString(),
      });

      // Acknowledge connection
      socket.emit('joined-game', {
        gameCode,
        roomName,
        message: 'Successfully joined game',
      });
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`⚠️  Socket error for ${socket.id}:`, error);
    });
  });

  console.log('🔌 WebSocket handlers initialized');
}
