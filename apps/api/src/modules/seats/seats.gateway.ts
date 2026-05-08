import { Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { type Server, type Socket } from 'socket.io';

import { SeatLockService } from './seat-lock.service.js';

interface AuthedSocket extends Socket {
  data: { userId?: string };
}

/**
 * Realtime seat-lock channel. Clients join `showtime:{id}` rooms and
 * exchange lock/release events. The actual atomic state lives in Redis.
 */
@WebSocketGateway({
  namespace: '/seats',
  cors: { origin: process.env.NEXT_PUBLIC_APP_URL?.split(',') ?? ['http://localhost:3000'], credentials: true },
})
export class SeatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SeatsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly seatLock: SeatLockService) {}

  handleConnection(socket: AuthedSocket) {
    const userId = (socket.handshake.auth?.userId as string | undefined) ?? `anon:${socket.id}`;
    socket.data.userId = userId;
  }

  handleDisconnect(socket: AuthedSocket) {
    this.logger.debug(`disconnect ${socket.id}`);
  }

  @SubscribeMessage('seat.join')
  async onJoin(
    @MessageBody() body: { showtimeId: string },
    @ConnectedSocket() socket: AuthedSocket,
  ) {
    const room = `showtime:${body.showtimeId}`;
    await socket.join(room);
    const snapshot = await this.seatLock.snapshot(body.showtimeId);
    socket.emit('seat.snapshot', { showtimeId: body.showtimeId, seats: snapshot });
  }

  @SubscribeMessage('seat.lock_request')
  async onLockRequest(
    @MessageBody() body: { showtimeId: string; seatId: string },
    @ConnectedSocket() socket: AuthedSocket,
  ) {
    const userId = socket.data.userId ?? `anon:${socket.id}`;
    const ok = await this.seatLock.lock(body.showtimeId, body.seatId, userId);
    if (!ok) {
      socket.emit('seat.lock_denied', { seatId: body.seatId, reason: 'already_locked' });
      return;
    }
    this.server.to(`showtime:${body.showtimeId}`).emit('seat.locked', {
      seatId: body.seatId,
      userId,
    });
  }

  @SubscribeMessage('seat.release_request')
  async onReleaseRequest(
    @MessageBody() body: { showtimeId: string; seatId: string },
    @ConnectedSocket() socket: AuthedSocket,
  ) {
    const userId = socket.data.userId ?? `anon:${socket.id}`;
    const released = await this.seatLock.release(body.showtimeId, body.seatId, userId);
    if (released) {
      this.server.to(`showtime:${body.showtimeId}`).emit('seat.released', {
        seatId: body.seatId,
      });
    }
  }

  /** Server-side broadcast (used by booking service after CONFIRMED). */
  broadcastSold(showtimeId: string, seatIds: string[]) {
    this.server.to(`showtime:${showtimeId}`).emit('seat.sold', { seatIds });
  }

  broadcastReleased(showtimeId: string, seatIds: string[]) {
    this.server.to(`showtime:${showtimeId}`).emit('seat.released', { seatIds });
  }
}
