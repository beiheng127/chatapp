// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore, Message } from '@/store/chatStore';

// WebSocket 消息类型
export enum WebSocketMessageType {
  CONNECTION_SUCCESS = 'connection_success',
  CHAT_MESSAGE = 'chat_message',
  DIRECT_MESSAGE = 'direct_message',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  ROOM_JOINED = 'room_joined',
  ROOM_LEFT = 'room_left',
  USER_TYPING = 'user_typing',
  USER_STOPPED_TYPING = 'user_stopped_typing',
  ERROR = 'error'
}

// 细化消息数据类型（替换 any）
interface ConnectionSuccessData {
  message: string;
  userId?: string;
}

interface ChatMessageData {
  id?: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  roomId: string;
  timestamp: string | Date;
}

interface DirectMessageData {
  id?: string;
  fromUserId: string;
  fromUsername: string;
  fromAvatar?: string;
  content: string;
  timestamp: string | Date;
}

interface UserJoinedLeftData {
  username: string;
  roomId?: string;
}

interface ErrorData {
  message: string;
  code?: number;
}

// 基础消息接口（替换 any）
type WebSocketData = 
  | ConnectionSuccessData 
  | ChatMessageData 
  | DirectMessageData 
  | UserJoinedLeftData 
  | ErrorData 
  | Record<string, unknown>;

interface BaseWebSocketMessage {
  type: WebSocketMessageType;
  data: WebSocketData;
}

// 发送消息的data类型
type SendMessageData = Record<string, unknown>;

// 自定义钩子
export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [receivedMessages, setReceivedMessages] = useState<any[]>([]);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const addMessage = useChatStore((state) => state.addMessage);

  // 添加一个函数来清空接收到的消息
  const clearReceivedMessages = useCallback(() => {
    setReceivedMessages([]);
  }, []);


  const connect = useCallback(() => {
    if (!token || wsRef.current) return;

    const url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';
    const socket = new WebSocket(`${url}?token=${token}`);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket 连接已建立');
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const message: BaseWebSocketMessage = JSON.parse(event.data);

        // 如果是聊天消息，添加到接收到的消息列表
        if (message.type === 'chat_message') {
          setReceivedMessages(prev => [...prev, message.data]);
        }
        
        switch (message.type) {
          case WebSocketMessageType.CONNECTION_SUCCESS: { // 加大括号包裹
            const successData = message.data as ConnectionSuccessData;
            console.log('WebSocket连接成功:', successData.message);
            break;
          }

          case WebSocketMessageType.CHAT_MESSAGE: { // 加大括号包裹
            const chatMsg = message.data as ChatMessageData;
            
            // 派发自定义事件，供组件监听
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('websocket-chat-message', { 
                detail: chatMsg 
              });
              window.dispatchEvent(event);
            }

            const newMessage: Message = {
              id: chatMsg.id || `${chatMsg.userId}-${Date.now()}`,
              userId: chatMsg.userId,
              userName: chatMsg.username,
              senderAvatar: chatMsg.avatar,
              content: chatMsg.content,
              roomId: chatMsg.roomId,
              timestamp: new Date(chatMsg.timestamp),
              type: 'text'
            };
            addMessage(newMessage);
            break;
          }

          case WebSocketMessageType.DIRECT_MESSAGE: { // 加大括号包裹
            const directMsg = message.data as DirectMessageData;
            const directMessage: Message = {
              id: directMsg.id || `${directMsg.fromUserId}-${Date.now()}`,
              userId: directMsg.fromUserId,
              userName: directMsg.fromUsername,
              senderAvatar: directMsg.fromAvatar,
              content: directMsg.content,
              roomId: `direct_${directMsg.fromUserId}`,
              timestamp: new Date(directMsg.timestamp),
              type: 'text'
            };
            addMessage(directMessage);
            break;
          }

          case WebSocketMessageType.USER_JOINED: { // 加大括号包裹
            const joinData = message.data as UserJoinedLeftData;
            console.log('用户加入房间:', joinData.username);
            break;
          }

          case WebSocketMessageType.USER_LEFT: { // 加大括号包裹
            const leftData = message.data as UserJoinedLeftData;
            console.log('用户离开房间:', leftData.username);
            break;
          }

          case WebSocketMessageType.ERROR: { // 加大括号包裹
            const errorData = message.data as ErrorData;
            console.error('WebSocket错误:', errorData.message);
            break;
          }

          default:
            console.log('收到未知消息类型:', message.type);
        }
      } catch (error) {
        console.error('消息解析错误:', error);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket 连接关闭');
      setIsConnected(false);
      wsRef.current = null;
      
      // 3秒后尝试重连
      setTimeout(() => {
        if (token) {
          connect();
        }
      }, 3000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket 错误:', error);
      setIsConnected(false);
      wsRef.current = null;
      
      // 3秒后尝试重连
      setTimeout(() => {
        if (token) {
          connect();
        }
      }, 3000);
    };

    return () => {
      if (wsRef.current) {
        try {
          console.log('正在关闭 WebSocket 连接...');
          wsRef.current.close();
          console.log('WebSocket 连接已关闭');
          wsRef.current = null;
          setIsConnected(false);
        } catch (error) {
          console.error('关闭 WebSocket 连接时出错:', error);
        }
      } else {
        console.log('WebSocket 连接未建立或已关闭，无需关闭');
      }
    };
  }, [token, addMessage]);

  // 替换 any 为 SendMessageData
  const sendMessage = useCallback((type: string, data: SendMessageData) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = { type, data };
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket未连接，无法发送消息');
    return false;
  }, []);

  const sendChatMessage = useCallback((roomId: string, content: string) => {
    return sendMessage('chat_message', { 
      roomId, 
      content,
      senderId: user?.id,
      username: user?.username,
      timestamp: new Date().toISOString()
    });
  }, [sendMessage,user]);

  const sendDirectMessage = useCallback((toUserId: string, content: string, messageData?: Partial<DirectMessageData>) => {
    return sendMessage('direct_message', { toUserId, content, ...messageData });
  }, [sendMessage]);

  const joinRoom = useCallback((roomId: string) => {
    return sendMessage('join_room', { roomId });
  }, [sendMessage]);

  const startTyping = useCallback((roomId: string) => {
    return sendMessage('typing_start', { typingRoomId: roomId });
  }, [sendMessage]);

  const stopTyping = useCallback((roomId: string) => {
    return sendMessage('typing_end', { endTypingRoomId: roomId });
  }, [sendMessage]);

  useEffect(() => {
    if (token) {
      connect();
    }
    
    return () => {
      if (wsRef.current) {
        try {
          if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CLOSING) {
            console.log('正在关闭 WebSocket 连接...');
            wsRef.current.close();
            console.log('WebSocket 连接已关闭');
          } else {
            console.log('WebSocket 连接未建立或已关闭，无需关闭');
          }
          wsRef.current = null;
          setIsConnected(false);
        } catch (error) {
          console.error('关闭 WebSocket 连接时出错:', error);
        }
      }
    };
  }, [token, connect]);

  return { 
    isConnected,
    sendChatMessage, 
    sendDirectMessage,
    joinRoom,
    startTyping,
    stopTyping,
    receivedMessages, // 导出接收到的消息
    clearReceivedMessages // 导出清空消息的函数
  };
};