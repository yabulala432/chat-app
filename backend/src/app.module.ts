// app.module.ts
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat/chat.gateway';
import { ChatService } from './chat/chat.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [],
  providers: [ChatGateway, ChatService, PrismaService],
})
export class AppModule {}
