// frontend/src/services/directMessageService.ts
import { apiClient, type ApiResponse } from './apiClient';

// 导入 UploadResponseData 类型
import type { UploadResponseData } from './uploadService';

export interface DirectMessage {
  _id: string;
  sender: {
    _id: string;
    username: string;
    avatar: string;
  };
  receiver: {
    _id: string;
    username: string;
    avatar: string;
  };
  content: string;
  type: 'text' | 'image' | 'file';
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  fileInfo?: {
    name?: string;
    size?: number;
    url?: string;
    type?: string;
    icon?: string;  // 添加 icon 属性
  };
}

export interface Conversation {
  userId: string;
  username: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

// 消息发送队列和去重机制
class MessageQueueManager {
  private pendingMessages = new Map<string, {
    tempId: string;
    content: string;
    receiverId: string;
    timestamp: number;
    type: 'text' | 'image' | 'file';
    fileInfo?: any;
  }>();

  // 清理过期的待处理消息（10分钟）
  private cleanupPendingMessages() {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    
    for (const [key, message] of this.pendingMessages.entries()) {
      if (message.timestamp < tenMinutesAgo) {
        this.pendingMessages.delete(key);
      }
    }
  }

  constructor() {
    // 每5分钟清理一次
    setInterval(() => this.cleanupPendingMessages(), 5 * 60 * 1000);
  }

  // 检查是否重复发送
  isDuplicateMessage(content: string, receiverId: string, type: 'text' | 'image' | 'file' = 'text'): boolean {
    const key = `${receiverId}_${type}_${content}`;
    const message = this.pendingMessages.get(key);
    
    if (message) {
      // 如果消息在5秒内发送过，认为是重复消息
      if (Date.now() - message.timestamp < 5000) {
        return true;
      }
    }
    return false;
  }

  // 添加到待处理消息队列
  addPendingMessage(tempId: string, content: string, receiverId: string, type: 'text' | 'image' | 'file' = 'text', fileInfo?: any): void {
    const key = `${receiverId}_${type}_${content}`;
    this.pendingMessages.set(key, {
      tempId,
      content,
      receiverId,
      type,
      fileInfo,
      timestamp: Date.now()
    });
  }

  // 从待处理消息队列中移除
  removePendingMessage(content: string, receiverId: string, type: 'text' | 'image' | 'file' = 'text'): boolean {
    const key = `${receiverId}_${type}_${content}`;
    return this.pendingMessages.delete(key);
  }

  // 获取待处理消息的临时ID
  getPendingMessageId(content: string, receiverId: string, type: 'text' | 'image' | 'file' = 'text'): string | undefined {
    const key = `${receiverId}_${type}_${content}`;
    return this.pendingMessages.get(key)?.tempId;
  }
}

const messageQueueManager = new MessageQueueManager();

// 文件大小格式化
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const directMessageService = {
  // 发送私聊消息
  async sendMessage(receiverId: string, content: string, type: 'text' | 'image' | 'file' = 'text', fileInfo?: any): Promise<ApiResponse<DirectMessage>> {
    return apiClient.post<DirectMessage>('/direct-messages/send', {
      receiverId,
      content,
      type,
      fileInfo
    });
  },

  // 获取与指定用户的对话
  async getConversation(userId: string, limit: number = 50, before?: string): Promise<ApiResponse<DirectMessage[]>> {
    const params: Record<string, string | number> = { limit };
    if (before) params.before = before;
    
    return apiClient.get<DirectMessage[]>(`/direct-messages/conversation/${userId}`, params);
  },

  // 获取当前用户的所有对话列表
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    return apiClient.get<Conversation[]>('/direct-messages/conversations');
  },

  // 标记消息为已读
  async markAsRead(messageId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.put<{ success: boolean }>(`/direct-messages/read/${messageId}`);
  },

  // 批量标记消息为已读
  async markMultipleAsRead(messageIds: string[]): Promise<ApiResponse<{ marked: number }>> {
    return apiClient.post<{ marked: number }>('/direct-messages/read-multiple', {
      messageIds
    });
  },

  // 消息队列管理方法
  isDuplicateMessage: (content: string, receiverId: string, type: 'text' | 'image' | 'file' = 'text') => 
    messageQueueManager.isDuplicateMessage(content, receiverId, type),
  
  addPendingMessage: (tempId: string, content: string, receiverId: string, type: 'text' | 'image' | 'file' = 'text', fileInfo?: any) =>
    messageQueueManager.addPendingMessage(tempId, content, receiverId, type, fileInfo),
  
  removePendingMessage: (content: string, receiverId: string, type: 'text' | 'image' | 'file' = 'text') =>
    messageQueueManager.removePendingMessage(content, receiverId, type),
  
  getPendingMessageId: (content: string, receiverId: string, type: 'text' | 'image' | 'file' = 'text') =>
    messageQueueManager.getPendingMessageId(content, receiverId, type),

  // 生成唯一消息ID
  generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // 上传文件
  async uploadFile(file: File, type: 'image' | 'file' = 'file'): Promise<ApiResponse<UploadResponseData>> {
    // 动态导入以避免循环依赖
    const { uploadService } = await import('./uploadService');
    
    if (type === 'image') {
      return uploadService.uploadMessageImage(file);
    } else {
      return uploadService.uploadMessageFile(file);
    }
  },

  // 批量上传文件
  async uploadMultipleFiles(files: File[], fileType: 'image' | 'file' = 'file'): Promise<ApiResponse<UploadResponseData[]>> {
    const { uploadService } = await import('./uploadService');
    return uploadService.uploadMultipleFiles(files, fileType);
  },

  // 格式化文件大小
  formatFileSize,

  // 检查文件类型
  getFileType(file: File): 'image' | 'file' {
    if (file.type.startsWith('image/')) {
      return 'image';
    }
    return 'file';
  },

  // 获取文件图标
  getFileIcon(fileType: string): string {
    const icons: Record<string, string> = {
      'pdf': '📕',
      'doc': '📝',
      'docx': '📝',
      'txt': '📄',
      'zip': '📦',
      'rar': '📦',
      '7z': '📦',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'bmp': '🖼️',
      'mp3': '🎵',
      'wav': '🎵',
      'mp4': '🎬',
      'mov': '🎬',
      'avi': '🎬',
      'default': '📎'
    };
    
    const ext = fileType.toLowerCase().split('.').pop() || 'default';
    return icons[ext] || icons.default;
  }
};