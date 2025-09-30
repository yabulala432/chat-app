import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

interface AuthenticatedSocket extends Socket {
  user: any;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      // Authenticate user from token
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          username: true,
          avatar: true,
          isOnline: true,
        },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      client.user = user;

      // Update user status
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true },
      });

      // Join user to their personal room and general room
      client.join(`user_${user.id}`);
      client.join('general');

      // Notify others
      this.server.emit('user_online', user);

      // Send recent messages and online users
      const [messages, onlineUsers, rooms] = await Promise.all([
        this.chatService.getRecentMessages(),
        this.chatService.getOnlineUsers(),
        this.chatService.getRooms(),
      ]);

      client.emit('recent_messages', messages);
      client.emit('online_users', onlineUsers);
      client.emit('available_rooms', rooms);

      console.log(`User ${user.username} connected: ${client.id}`);
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    if (client.user) {
      // Update user status
      await this.prisma.user.update({
        where: { id: client.user.id },
        data: {
          isOnline: false,
          lastSeen: new Date(),
        },
      });

      // Notify others
      this.server.emit('user_offline', client.user);
      console.log(`User ${client.user.username} disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    client: AuthenticatedSocket,
    payload: { content: string; roomId?: number },
  ): Promise<void> {
    if (!client.user) return;

    try {
      const message = await this.chatService.createMessage(
        client.user.id,
        payload.content,
        payload.roomId,
      );

      const room = payload.roomId ? `room_${payload.roomId}` : 'general';

      // Emit to all clients in the room including the sender
      this.server.to(room).emit('new_message', {
        ...message,
        user: {
          id: client.user.id,
          username: client.user.username,
          avatar: client.user.avatar,
        },
      });
    } catch (error) {
      console.error('Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    client: AuthenticatedSocket,
    payload: { isTyping: boolean; roomId?: number },
  ): void {
    if (!client.user) return;

    const room = payload.roomId ? `room_${payload.roomId}` : 'general';

    // Broadcast to all clients in the room except the sender
    client.to(room).emit('user_typing', {
      user: {
        id: client.user.id,
        username: client.user.username,
        avatar: client.user.avatar,
      },
      isTyping: payload.isTyping,
    });
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    client: AuthenticatedSocket,
    payload: { roomId: number },
  ): Promise<void> {
    if (!client.user) return;

    try {
      await this.chatService.joinRoom(client.user.id, payload.roomId);
      client.join(`room_${payload.roomId}`);

      // Notify all clients in the room that a user joined
      this.server.to(`room_${payload.roomId}`).emit('user_joined_room', {
        user: {
          id: client.user.id,
          username: client.user.username,
          avatar: client.user.avatar,
        },
        roomId: payload.roomId,
      });

      // Send updated room list to the joining user
      const rooms = await this.chatService.getRooms();
      client.emit('available_rooms', rooms);
    } catch (error) {
      console.error('Error joining room:', error);
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    client: AuthenticatedSocket,
    payload: { roomId: number },
  ): Promise<void> {
    if (!client.user) return;

    try {
      await this.chatService.leaveRoom(client.user.id, payload.roomId);
      client.leave(`room_${payload.roomId}`);

      // Notify all clients in the room that a user left
      this.server.to(`room_${payload.roomId}`).emit('user_left_room', {
        user: {
          id: client.user.id,
          username: client.user.username,
          avatar: client.user.avatar,
        },
        roomId: payload.roomId,
      });

      // Send updated room list to the leaving user
      const rooms = await this.chatService.getRooms();
      client.emit('available_rooms', rooms);
    } catch (error) {
      console.error('Error leaving room:', error);
      client.emit('error', { message: 'Failed to leave room' });
    }
  }

  // Optional: Add a method to create rooms
  @SubscribeMessage('create_room')
  async handleCreateRoom(
    client: AuthenticatedSocket,
    payload: { name: string; description?: string; isPrivate?: boolean },
  ): Promise<void> {
    if (!client.user) return;

    try {
      const room = await this.chatService.createRoom(
        payload.name,
        payload.description,
        payload.isPrivate || false,
      );

      // Join the room automatically
      await this.handleJoinRoom(client, { roomId: room.id });

      // Notify all users about the new room
      const rooms = await this.chatService.getRooms();
      this.server.emit('available_rooms', rooms);
    } catch (error) {
      console.error('Error creating room:', error);
      client.emit('error', { message: 'Failed to create room' });
    }
  }
}
