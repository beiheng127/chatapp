// backend/server.ts
import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
// import { Server as WebSocketServer } from 'ws';

// 导入路由和中间件
import authRoutes from './src/routes/auth';
import directMessageRoutes from './src/routes/directMessage';
import { setupWebSocket } from './src/websocket/server';
import roomRoutes from './src/routes/room';
import roomMessageRoutes from './src/routes/roomMessage';
import userRoutes from './src/routes/user';
import uploadRoutes from './src/routes/uploadRoutes';
import uploadRoomAvatar from './src/routes/roomUpload';
import userSettingsRoutes from './src/routes/userSettings';

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '5000', 10);

// 中间件
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // 允许的前端地址
  credentials: true, // 允许携带凭证（cookies、authorization headers）
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));
app.use(express.json());

// 连接 MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chat_app')
  .then(() => console.log('✅ MongoDB 连接成功'))
  .catch(err => console.error('❌ MongoDB 连接失败:', err));

// 测试路由
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: '后端服务运行正常',
    timestamp: new Date().toISOString(),
    service: 'ChatApp Backend API'
  });
});

// 注册路由
app.use('/api/auth', authRoutes);
app.use('/api/direct-messages', directMessageRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/room-messages', roomMessageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/room-upload', uploadRoomAvatar);
app.use('/api', userSettingsRoutes);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// 创建 HTTP 服务器
const server = http.createServer(app);

// 设置 WebSocket 服务器
setupWebSocket(server);

// 启动服务器
server.listen(PORT, () => {
  console.log(`🚀 后端服务器运行在: http://localhost:${PORT}`);
  console.log(`📡 WebSocket 服务器运行在: ws://localhost:${PORT}`);
  console.log(`📊 API 文档:`);
  console.log(`   - 健康检查: GET http://localhost:${PORT}/api/health`);
  console.log(`   - 用户注册: POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   - 用户登录: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   - 获取对话: GET http://localhost:${PORT}/api/direct/conversations (需认证)`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    mongoose.connection.close();
    process.exit(0);
  });
});

// 导出 app 和 server，方便测试
export { app, server };