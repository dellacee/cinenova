'use client';

import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSeatsSocket(userId: string): Socket {
  if (socket && socket.connected) return socket;

  const url = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';
  socket = io(`${url}/seats`, {
    transports: ['websocket'],
    auth: { userId },
    autoConnect: true,
  });

  return socket;
}

export function disconnectSeatsSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
