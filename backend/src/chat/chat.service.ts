// chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async createMessage(userId: number, content: string, roomId?: number) {
    return this.prisma.message.create({
      data: {
        content,
        userId,
        roomId: roomId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
  }

  async getRecentMessages(limit: number = 50) {
    return this.prisma.message.findMany({
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getOnlineUsers() {
    return this.prisma.user.findMany({
      where: {
        isOnline: true,
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        lastSeen: true,
      },
    });
  }

  async getRooms() {
    return this.prisma.room.findMany({
      where: {
        isPrivate: false,
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  }

  async joinRoom(userId: number, roomId: number) {
    return this.prisma.userRoom.upsert({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
      update: {},
      create: {
        userId,
        roomId,
      },
    });
  }

  async leaveRoom(userId: number, roomId: number) {
    return this.prisma.userRoom.delete({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });
  }

  async createRoom(
    name: string,
    description?: string,
    isPrivate: boolean = false,
  ) {
    return this.prisma.room.create({
      data: {
        name,
        description,
        isPrivate,
      },
    });
  }
}
