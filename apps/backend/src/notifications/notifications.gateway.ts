import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200',
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    const pubClient = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => this.logger.error('Redis pub error', err));
    subClient.on('error', (err) => this.logger.error('Redis sub error', err));

    server.adapter(createAdapter(pubClient, subClient));
    this.logger.log('WebSocket gateway initialisé avec Redis adapter');
  }

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub as string;

      // Chaque socket rejoint la room de son userId.
      // Redis propage les émissions à tous les pods qui ont un socket dans cette room.
      client.join(userId);

      this.logger.log(`Utilisateur ${userId} connecté (socket ${client.id})`);
    } catch {
      this.logger.warn('Connexion WebSocket refusée : token invalide.');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Socket.IO quitte les rooms automatiquement à la déconnexion.
    this.logger.log(`Socket ${client.id} déconnecté`);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    // Émet à tous les sockets dans la room userId, sur tous les pods.
    this.server.to(userId).emit(event, payload);
  }
}
