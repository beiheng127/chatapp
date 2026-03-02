// frontend/src/services/websocketService.ts
// 1. 导入必要的类型（与 useWebSocket.ts 保持一致）
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

// 2. 细化消息数据类型（替换 any）
interface ConnectionSuccessData {
  message: string;
  userId?: string;
}

interface ChatMessageData {
  id?: string;
  userId: string;
  username: string;
  content: string;
  roomId: string;
  timestamp: string | Date;
}

interface DirectMessageData {
  id?: string;
  fromUserId: string;
  fromUsername: string;
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

// 3. 基础消息类型（覆盖所有场景）
type WebSocketData = 
  | ConnectionSuccessData 
  | ChatMessageData 
  | DirectMessageData 
  | UserJoinedLeftData 
  | ErrorData 
  | Record<string, unknown>;

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: WebSocketData;
}

// 4. 发送消息的data类型
export type WebSocketSendData = Record<string, unknown>;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // 修复：onMessage 参数类型改为 WebSocketMessage
  connect(token: string, onMessage: (message: WebSocketMessage) => void): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket已连接');
      return;
    }

    this.disconnect();

    const url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';
    this.ws = new WebSocket(`${url}?token=${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket连接已建立');
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        // 修复：指定解析后的类型为 WebSocketMessage
        const message: WebSocketMessage = JSON.parse(event.data);
        onMessage(message);
      } catch (error: unknown) { // 修复：any → unknown
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        console.error('消息解析错误:', errorMsg);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket连接关闭');
      
      // 尝试重连
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        this.reconnectTimer = setTimeout(() => {
          if (token) {
            this.connect(token, onMessage);
          }
        }, 3000);
      }
    };

    this.ws.onerror = (error: Event) => { // 修复：补全 error 类型
      console.error('WebSocket错误:', error);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // 修复：data 参数类型改为 WebSocketSendData
  send(data: WebSocketSendData): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    console.warn('WebSocket未连接，无法发送消息');
    return false;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketManager = new WebSocketManager();