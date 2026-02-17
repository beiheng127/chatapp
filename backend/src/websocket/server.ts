// backend/src/websocket/server.ts
import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt, { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User';
import { authenticate } from '@/middleware/auth';

// 1. 扩展WebSocket类型（保留可选属性，避免强制断言导致的类型不匹配）
interface CustomWebSocket extends WebSocket {
  userId?: string; // 恢复可选：认证前可能不存在
  username?: string; // 恢复可选：认证前可能不存在
  avatar?: string; // 用户头像
  roomIds: string[]; // 非可选：初始化时赋值
  isAlive: boolean; // 非可选：初始化时赋值
}

// 2. 类型别名提升可读性（移除 any，精准定义）
type MessageType = 
  | 'connection_success' 
  | 'error' 
  | 'join_room' 
  | 'user_joined' 
  | 'user_left' 
  | 'room_joined'
  | 'chat_message' 
  | 'message_sent' 
  | 'direct_message'
  | 'typing_start' 
  | 'user_typing' 
  | 'typing_end' 
  | 'user_stopped_typing'
  | 'get_online_users' 
  | 'online_users_list';

// 修复：移除 any，定义通用消息数据类型
interface WsMessage<T> {
  type: MessageType;
  data: T;
}

// 3. 全局连接存储（精准类型定义）
const onlineUsers = new Map<string, CustomWebSocket>(); // userId -> 主连接
const userConnections = new Map<string, Set<CustomWebSocket>>(); // userId -> 所有连接

/**
 * 初始化WebSocket服务器
 * @param server HTTP/HTTPS服务器实例
 */
export function setupWebSocket(server: import('http').Server | import('https').Server) {
  const wss = new WebSocketServer({ server });

  // 心跳检测（修复 TS2345：严格类型匹配）
  const HEARTBEAT_INTERVAL = 30000; // 30秒
  const heartbeatInterval = setInterval(() => {
    // 修复：遍历 wss.clients 时先断言为 CustomWebSocket，再判断属性
    wss.clients.forEach((ws: WebSocket) => {
      const customWs = ws as CustomWebSocket;
      if (!customWs.isAlive) {
        return customWs.terminate();
      }
      customWs.isAlive = false;
      customWs.ping(); // 发送心跳包
    });
  }, HEARTBEAT_INTERVAL);

  // 处理新连接
  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    console.log('新的WebSocket连接尝试...');
    // 初始化自定义属性（确保必选属性有值）
    const customWs = ws as CustomWebSocket;
    customWs.roomIds = [];
    customWs.isAlive = true;

    try {
      // 1. 解析URL获取Token（增强错误处理）
      if (!request.url || !request.headers.host) {
        throw new Error('无效的请求URL');
      }
      const url = new URL(request.url, `http://${request.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        throw new jwt.JsonWebTokenError('未提供认证令牌');
      }

      // 2. 验证Token（与auth.ts保持一致）
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET 环境变量未配置');
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload & { userId: string };
      const userId = decoded.userId;

      // 3. 校验用户ID格式 + 查询用户信息
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new jwt.JsonWebTokenError('无效的用户ID格式');
      }
      const user = await User.findById(userId).select('username avatar');
      if (!user) {
        throw new jwt.JsonWebTokenError('用户不存在');
      }

      // 4. 设置WebSocket属性（认证成功后赋值）
      customWs.userId = userId;
      customWs.username = user.username;
      customWs.avatar = user.avatar;

      // 5. 保存连接（优化逻辑，防止重复添加）
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      const userConnSet = userConnections.get(userId)!;
      userConnSet.add(customWs);
      onlineUsers.set(userId, customWs); // 覆盖为主连接

      console.log(`用户 ${user.username} (${userId}) WebSocket 连接成功`);

      // 6. 发送连接成功消息（修复 any：精准泛型）
      sendMessage<{
        userId: string;
        username: string;
        message: string;
        timestamp: string;
      }>(customWs, {
        type: 'connection_success',
        data: {
          userId,
          username: user.username,
          message: 'WebSocket连接成功',
          timestamp: new Date().toISOString()
        }
      });

      // 7. 监听客户端消息（优化错误捕获 + 移除 any）
      customWs.on('message', (data: WebSocket.Data) => {
        try {
          // 处理不同类型的data（Buffer/String）
          const messageStr = typeof data === 'string' ? data : data.toString('utf8');
          // 修复：先解析为未知类型，再断言为具体消息类型
          const rawMessage = JSON.parse(messageStr) as unknown;
          if (!isValidWsMessage(rawMessage)) {
            throw new Error('消息格式不符合要求');
          }
          const message = rawMessage as WsMessage<Record<string, unknown>>;
          handleWebSocketMessage(userId, user.username, message, customWs);
        } catch (error) {
          console.error('处理WebSocket消息出错:', error);
          sendMessage<{ message: string }>(customWs, {
            type: 'error',
            data: { message: '消息格式错误，请发送JSON格式数据' }
          });
        }
      });

      // 8. 心跳响应（重置存活状态）
      customWs.on('pong', () => {
        customWs.isAlive = true;
      });

      // 9. 连接关闭处理（优化清理逻辑）
      customWs.on('close', (code, reason) => {
        console.log(
          `用户 ${user.username} (${userId}) 断开WebSocket连接 | 码: ${code} | 原因: ${reason.toString()}`
        );

        // 安全清理连接
        const connections = userConnections.get(userId);
        if (connections) {
          connections.delete(customWs);
          if (connections.size === 0) {
            userConnections.delete(userId);
            onlineUsers.delete(userId);
          } else {
            // 更新主连接为第一个可用连接
            const firstConn = Array.from(connections)[0];
            onlineUsers.set(userId, firstConn);
          }
        }
      });

      // 10. 错误处理（防止连接崩溃）
      customWs.on('error', (error) => {
        console.error(`WebSocket错误 (用户: ${userId}):`, error);
        // 错误时主动清理连接
        if (userConnections.has(userId)) {
          userConnections.get(userId)!.delete(customWs);
        }
      });

    } catch (error) {
      console.error('WebSocket连接认证失败:', error);

      // 标准化错误处理（与auth.ts一致）
      const closeReason = getAuthErrorReason(error);
      customWs.close(1008, closeReason);
      return;
    }
  });

  // 服务器关闭时清理资源
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
    console.log('WebSocket服务器已关闭，清理心跳检测');
  });

  console.log('✅ WebSocket 服务器已启动');
}

// ========== 辅助函数 ==========

/**
 * 验证WebSocket消息格式是否合法（避免any）
 * @param message 原始消息对象
 * @returns 是否为合法消息
 */
function isValidWsMessage(message: unknown): message is WsMessage<Record<string, unknown>> {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof (message as Record<string, unknown>).type === 'string' &&
    'data' in message
  );
}

/**
 * 发送WebSocket消息（类型安全 + 状态检查）
 * @param ws WebSocket连接实例
 * @param message 要发送的消息对象
 */
function sendMessage<T>(ws: CustomWebSocket, message: WsMessage<T>) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn(`WebSocket未处于打开状态，跳过发送消息 | 状态: ${ws.readyState}`);
    }
  } catch (error) {
    console.error('发送WebSocket消息失败:', error);
  }
}

/**
 * 广播消息给所有在线用户
 * @param message 消息对象
 * @param excludeUserId 排除的用户ID
 */
// function broadcastToAll<T>(message: WsMessage<T>, excludeUserId?: string) {
//   onlineUsers.forEach((ws, userId) => {
//     if (excludeUserId && userId === excludeUserId) return;
//     sendMessage(ws, message);
//   });
// }

/**
 * 发送消息给指定用户（支持多端连接）
 * @param userId 目标用户ID
 * @param message 消息对象
 */
function sendToUser<T>(userId: string, message: WsMessage<T>) {
  const connections = userConnections.get(userId);
  if (connections) {
    connections.forEach(ws => sendMessage(ws, message));
  } else {
    console.warn(`用户 ${userId} 无在线连接，无法发送消息`);
  }
}

/**
 * 广播消息给房间内所有用户
 * @param roomId 房间ID
 * @param message 消息对象
 * @param excludeUserId 排除的用户ID
 */
function broadcastToRoom<T>(roomId: string, message: WsMessage<T>, excludeUserId?: string) {
  onlineUsers.forEach((ws, userId) => {
    // 检查是否排除该用户
    if (excludeUserId && userId === excludeUserId) return;
    
    // 检查用户是否在该房间
    const customWs = ws as CustomWebSocket;
    if (customWs.roomIds && customWs.roomIds.includes(roomId)) {
      try {
        sendMessage(customWs, message);
      } catch (error) {
        console.error(`发送消息给用户 ${userId} 失败:`, error);
      }
    }
  });
}

/**
 * 处理认证错误，返回标准化提示
 * @param error 错误对象
 * @returns 错误提示字符串
 */
function getAuthErrorReason(error: unknown): string {
  if (error instanceof jwt.JsonWebTokenError) {
    return error.message;
  } else if (error instanceof jwt.TokenExpiredError) {
    return '令牌已过期，请重新登录';
  } else if (error instanceof Error) {
    return error.message;
  }
  return '认证失败';
}

// ========== 消息处理核心逻辑 ==========

/**
 * 处理客户端发送的WebSocket消息
 * @param senderId 发送者ID
 * @param senderName 发送者名称
 * @param message 消息对象
 * @param ws 发送者的WebSocket连接
 */
async function handleWebSocketMessage(
  senderId: string,
  senderName: string,
  message: WsMessage<Record<string, unknown>>,
  ws: CustomWebSocket
) {
  try {
    const { type, data } = message;

    switch (type) {
      // 加入房间
      case 'join_room': {
        const { roomId } = data as { roomId?: string };
        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
          throw new Error('无效的房间ID');
        }

        // 离开原有房间并通知
        if (ws.roomIds.length > 0) {
          ws.roomIds.forEach(oldRoomId => {
            broadcastToRoom(oldRoomId, {
              type: 'user_left',
              data: {
                userId: senderId,
                username: senderName,
                roomId: oldRoomId,
                timestamp: new Date().toISOString()
              }
            });
          });
        }

        // 加入新房间
        ws.roomIds = [roomId];

        // 通知房间内其他用户
        broadcastToRoom(roomId, {
          type: 'user_joined',
          data: {
            userId: senderId,
            username: senderName,
            roomId,
            timestamp: new Date().toISOString()
          }
        }, senderId);

        // 回复发送者
        sendMessage<{
          roomId: string;
          success: boolean;
          timestamp: string;
        }>(ws, {
          type: 'room_joined',
          data: {
            roomId,
            success: true,
            timestamp: new Date().toISOString()
          }
        });
        break;
      }

      // 群聊消息
      case 'chat_message': {
        const { roomId: chatRoomId, content, senderId: wsSenderId, username, id } = data as { 
          roomId?: string; 
          content?: string;
          senderId?: string;
          username?: string;
          id?: string;
        };
        
        if (!chatRoomId || !content || !mongoose.Types.ObjectId.isValid(chatRoomId)) {
          throw new Error('房间ID和消息内容不能为空，且房间ID格式需合法');
        }

        const messageData = {
          id: id || Date.now().toString(),
          userId: wsSenderId || senderId, // 使用传入的senderId或当前连接的senderId
          username: username || senderName, // 使用传入的用户名或当前连接的用户名
          avatar: ws.avatar,
          content,
          roomId: chatRoomId,
          timestamp: new Date().toISOString()
        };


        // 广播给房间内其他人
        broadcastToRoom(chatRoomId, {
          type: 'chat_message',
          data: messageData
        }, messageData.userId);

        // 发送给发送者所有连接（确保多端同步）
        sendToUser(messageData.userId, {
          type: 'chat_message',
          data: { ...messageData, isOwn: true }
        });

        break;
      }

      // 私聊消息
      case 'direct_message': {
        const { toUserId, content: dmContent, id, timestamp } = data as { 
          toUserId?: string; 
          content?: string;
          id?: string;
          timestamp?: string;
        };
        
        if (!toUserId || !dmContent || !mongoose.Types.ObjectId.isValid(toUserId)) {
          throw new Error('接收者ID和消息内容不能为空，且用户ID格式需合法');
        }

        const dmData = {
          id: id || Date.now().toString(),
          fromUserId: senderId,
          fromUsername: senderName,
          fromAvatar: ws.avatar,
          toUserId,
          content: dmContent,
          timestamp: timestamp || new Date().toISOString()
        };

        // 发送给接收者
        sendToUser(toUserId, {
          type: 'direct_message',
          data: dmData
        });

        // 发送给发送者所有连接（同步消息到多端）
        sendToUser(senderId, {
          type: 'direct_message',
          data: { ...dmData, isOwn: true }
        });
        break;
      }

      // 开始输入
      case 'typing_start': {
        const { typingRoomId } = data as { typingRoomId?: string };
        if (!typingRoomId || !mongoose.Types.ObjectId.isValid(typingRoomId)) {
          throw new Error('无效的房间ID');
        }

        broadcastToRoom(typingRoomId, {
          type: 'user_typing',
          data: {
            userId: senderId,
            username: senderName,
            roomId: typingRoomId,
            timestamp: new Date().toISOString()
          }
        }, senderId);
        break;
      }

      // 结束输入
      case 'typing_end': {
        const { endTypingRoomId } = data as { endTypingRoomId?: string };
        if (!endTypingRoomId || !mongoose.Types.ObjectId.isValid(endTypingRoomId)) {
          throw new Error('无效的房间ID');
        }

        broadcastToRoom(endTypingRoomId, {
          type: 'user_stopped_typing',
          data: {
            userId: senderId,
            roomId: endTypingRoomId,
            timestamp: new Date().toISOString()
          }
        }, senderId);
        break;
      }

      // 获取在线用户列表
      case 'get_online_users': {
        const onlineUsersList = Array.from(onlineUsers.entries()).map(([id, ws]) => ({
          userId: id,
          username: ws.username || '', // 兜底空值
          isOnline: ws.readyState === WebSocket.OPEN
        }));

        sendMessage<{
          users: Array<{
            userId: string;
            username: string;
            isOnline: boolean;
          }>;
          timestamp: string;
        }>(ws, {
          type: 'online_users_list',
          data: {
            users: onlineUsersList,
            timestamp: new Date().toISOString()
          }
        });
        break;
      }

      // 未知消息类型
      default:
        console.log('未知消息类型:', type);
        sendMessage<{ message: string }>(ws, {
          type: 'error',
          data: { message: `未知的消息类型: ${type}` }
        });
    }
  } catch (error) {
    console.error('处理WebSocket消息时出错:', error);
    const errorMsg = error instanceof Error ? error.message : '处理消息时出错';
    sendMessage<{ message: string }>(ws, {
      type: 'error',
      data: { message: errorMsg }
    });
  }
}

// 导出在线用户映射（保持原有导出）
export { onlineUsers };