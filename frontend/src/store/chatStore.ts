// frontend/src/store/chatStore.ts
import { create } from 'zustand';
import { useAuthStore } from './authStore';

// 消息类型 - 扩展以支持状态和已读标记
export interface Message {
  id: string;
  userId: string;
  content: string;
  userName: string;
  senderAvatar?: string;
  roomId: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  status?: 'sending' | 'sent' | 'failed' | 'delivered' | 'read';
  isRead?: boolean;
  isTemp?: boolean;
  fileInfo?: {
    name?: string;
    size?: number;
    url?: string;
    type?: string;
  };
}

// 聊天室类型
export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  lastActivity?: Date;
  unreadCount?: number;
  lastMessage?: string;
  avatar?: string;
  isPrivate?: boolean;
  members?: any[];
}

// 在线用户类型
export interface OnlineUser {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
}

// Store 状态类型
interface ChatState {
  rooms: ChatRoom[];
  messages: Message[];
  currentRoom: ChatRoom | null;
  onlineUsers: OnlineUser[];
  
  // 基础方法
  setRooms: (rooms: ChatRoom[]) => void;
  setMessages: (messages: Message[]) => void;
  setCurrentRoom: (room: ChatRoom | string | null) => void;
  setOnlineUsers: (users: OnlineUser[]) => void;
  clearChat: () => void;
  
  // 消息操作
  addMessage: (message: Message) => void;
  addMessages: (messages: Message[]) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  clearMessages: () => void;
  
  // 消息状态管理
  markMessagesAsRead: (roomId: string) => void;
  updateMessageStatus: (messageId: string, status: Message['status']) => void;
  
  // 批量操作
  replaceMessage: (oldId: string, newMessage: Message) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  messages: [],
  currentRoom: null,
  onlineUsers: [],
  
  // 基础方法
  setRooms: (rooms) => set({ rooms }),
  setMessages: (messages) => set({ messages }),
  setCurrentRoom: (room) => set({ 
    currentRoom: typeof room === 'string' 
      ? { id: room, name: `Room ${room}` }
      : room 
  }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  clearChat: () => set({ messages: [], currentRoom: null }),
  
  // 消息操作
  addMessage: (message) => set((state) => {
    // 防止重复添加相同ID的消息
    if (state.messages.some(m => m.id === message.id)) {
      return state;
    }

    // 获取当前用户ID
    const currentUserId = useAuthStore.getState().user?.id;

    // 更新房间的最后一条消息和时间
    const updatedRooms = state.rooms.map(room => {
      if (room.id === message.roomId) {
        const content = message.type === 'image' ? '[图片]' : (message.type === 'file' ? '[文件]' : message.content);
        return {
          ...room,
          lastMessage: content,
          lastActivity: message.timestamp,
          // 如果不是当前房间且消息不是自己发的，增加未读计数
          unreadCount: (state.currentRoom?.id !== message.roomId && message.userId !== currentUserId)
            ? (room.unreadCount || 0) + 1 
            : 0
        };
      }
      return room;
    });

    return {
      messages: [...state.messages, message],
      rooms: updatedRooms
    };
  }),
  
  addMessages: (messages) => set((state) => ({
    messages: [...state.messages, ...messages]
  })),
  
  updateMessage: (messageId, updates) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    )
  })),
  
  removeMessage: (messageId) => set((state) => ({
    messages: state.messages.filter(msg => msg.id !== messageId)
  })),
  
  clearMessages: () => set({ messages: [] }),
  
  // 消息状态管理
  markMessagesAsRead: (roomId) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.roomId === roomId && msg.userId !== 'current-user' 
        ? { ...msg, isRead: true, status: 'read' }
        : msg
    )
  })),
  
  updateMessageStatus: (messageId, status) => set((state) => ({
    messages: state.messages.map(msg =>
      msg.id === messageId ? { ...msg, status } : msg
    )
  })),
  
  // 批量操作
  replaceMessage: (oldId, newMessage) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === oldId ? newMessage : msg
    )
  }))
}));