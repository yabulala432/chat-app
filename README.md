# Real-Time Chat Application

A full-stack real-time chat application built with NestJS, React, Socket.io, and Prisma ORM.

![Demo](https://raw.githubusercontent.com/yabulala432/chat-app/refs/heads/master/screenshots/photo_1.png)
![Demo](https://raw.githubusercontent.com/yabulala432/chat-app/refs/heads/master/screenshots/photo_2.png)
![Demo](https://raw.githubusercontent.com/yabulala432/chat-app/refs/heads/master/screenshots/photo-3.png)

## Features

- Real-time messaging
- User typing indicators
- Message history
- Multiple instance support with PM2 cluster mode
- Docker containerization

## Tech Stack

- **Backend**: NestJS, Socket.io, Prisma ORM
- **Frontend**: React, Vite, Socket.io-client
- **Database**: SQLite
- **Process Manager**: PM2
- **Containerization**: Docker

## Quick Start

### Using Docker (Recommended)

1. Clone the repository:

```bash
git clone https://github.com/yabulala432/chat-app/
cd chat-app/backend
npm i

cd chat-app/frontend
npm i
```

### Environment Variables
at the root of backend: 

at the root of frontend:

inside backend/src/prisma: 
