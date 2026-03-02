// frontend/src/services/roomMessageService.ts
import { apiClient, type ApiResponse } from './apiClient';
import { uploadService } from './uploadService';

export interface RoomMessage {
  _id: string;
  room: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  content: string;
  type: 'text' | 'image' | 'file' | 'system' | 'voice';
  readBy: string[];
  replyTo?: RoomMessage;
  fileInfo?: {
    name: string;
    size: number;
    url: string;
    type: string;
    icon?: string;
    duration?: number; // 语音消息时长（秒）
  };
  createdAt: Date;
  updatedAt: Date;
  isEdited?: boolean;
  reactions?: {
    emoji: string;
    users: string[];
  }[];
  mentions?: string[];
}

export interface SendMessageData {
  content: string;
  type?: 'text' | 'image' | 'file' | 'voice';
  replyTo?: string;
  fileInfo?: {
    name: string;
    size: number;
    url: string;
    type: string;
    duration?: number;
  };
  mentions?: string[];
}

export interface MessagePagination {
  page?: number;
  limit?: number;
  before?: string; // ISO时间戳
  after?: string; // ISO时间戳
  sortBy?: 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

export interface MessageOperationResponse {
  success: boolean;
  message: string;
  updated?: number;
}

export interface SearchMessagesResponse {
  messages: RoomMessage[];
  total: number;
  page: number;
  pages: number;
}

export interface MessageStats {
  totalMessages: number;
  totalImages: number;
  totalFiles: number;
  totalVoiceMessages: number;
  averageMessagesPerDay: number;
  mostActiveHour: number;
}

export interface UploadFileResponseData {
  url: string;
  filename: string;
  size: number;
  type: 'image' | 'file' | 'voice';
  uploadedName?: string;
  icon?: string;
  duration?: number; // 语音消息时长
}

export const roomMessageService = {
  // ========== 消息发送与接收 ==========
  
  // 发送消息
  async sendMessage(roomId: string, data: SendMessageData): Promise<ApiResponse<RoomMessage>> {
    const requestData = data as unknown as Record<string, unknown>;
    return apiClient.post<RoomMessage>(`/room-messages/${roomId}/send`, requestData);
  },

  // 获取消息历史
  async getMessages(roomId: string, params?: MessagePagination): Promise<ApiResponse<RoomMessage[]>> {
    const queryParams: Record<string, string | number> = {};
    
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.page) queryParams.page = params.page;
    if (params?.before) queryParams.before = params.before;
    if (params?.after) queryParams.after = params.after;
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.order) queryParams.order = params.order;
    
    return apiClient.get<RoomMessage[]>(`/room-messages/${roomId}/messages`, queryParams);
  },

  // 获取最近消息
  async getRecentMessages(roomId: string, limit: number = 50): Promise<ApiResponse<RoomMessage[]>> {
    return this.getMessages(roomId, { limit, sortBy: 'createdAt', order: 'desc' });
  },

  // 获取消息详情
  async getMessage(messageId: string): Promise<ApiResponse<RoomMessage>> {
    return apiClient.get<RoomMessage>(`/room-messages/message/${messageId}`);
  },

  // ========== 消息状态管理 ==========
  
  // 获取未读消息数量
  async getUnreadCount(roomId: string): Promise<ApiResponse<{ unreadCount: number }>> {
    return apiClient.get<{ unreadCount: number }>(`/room-messages/${roomId}/unread-count`);
  },

  // 标记消息为已读
  async markAsRead(messageId: string): Promise<ApiResponse<MessageOperationResponse>> {
    return apiClient.put<MessageOperationResponse>(`/room-messages/read/${messageId}`);
  },

  // 批量标记消息为已读
  async markMultipleAsRead(roomId: string, messageIds: string[]): Promise<ApiResponse<MessageOperationResponse>> {
    const requestData = { messageIds } as Record<string, unknown>;
    return apiClient.post<MessageOperationResponse>(`/room-messages/${roomId}/read/batch`, requestData);
  },

  // 标记房间内所有消息为已读
  async markAllAsRead(roomId: string): Promise<ApiResponse<MessageOperationResponse>> {
    return apiClient.post<MessageOperationResponse>(`/room-messages/${roomId}/read/all`);
  },

  // ========== 消息编辑与删除 ==========
  
  // 编辑消息
  async editMessage(messageId: string, content: string): Promise<ApiResponse<RoomMessage>> {
    return apiClient.put<RoomMessage>(`/room-messages/message/${messageId}/edit`, { content });
  },

  // 删除消息
  async deleteMessage(messageId: string): Promise<ApiResponse<MessageOperationResponse>> {
    return apiClient.delete<MessageOperationResponse>(`/room-messages/message/${messageId}`);
  },

  // 批量删除消息
  async deleteMultipleMessages(messageIds: string[]): Promise<ApiResponse<MessageOperationResponse>> {
    const requestData = { messageIds } as Record<string, unknown>;
    return apiClient.post<MessageOperationResponse>('/room-messages/delete/batch', requestData);
  },

  // ========== 消息搜索与过滤 ==========
  
  // 搜索消息
  async searchMessages(roomId: string, query: string, params?: MessagePagination): Promise<ApiResponse<SearchMessagesResponse>> {
    const queryParams: Record<string, string | number> = { query };
    
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.page) queryParams.page = params.page;
    if (params?.before) queryParams.before = params.before;
    if (params?.after) queryParams.after = params.after;
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.order) queryParams.order = params.order;
    
    return apiClient.get<SearchMessagesResponse>(`/room-messages/${roomId}/search`, queryParams);
  },

  // 按类型过滤消息
  async filterMessagesByType(roomId: string, type: string, params?: MessagePagination): Promise<ApiResponse<RoomMessage[]>> {
    const queryParams: Record<string, string | number> = { type };
    
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.page) queryParams.page = params.page;
    if (params?.before) queryParams.before = params.before;
    if (params?.after) queryParams.after = params.after;
    
    return apiClient.get<RoomMessage[]>(`/room-messages/${roomId}/filter`, queryParams);
  },

  // 获取提及我的消息
  async getMentionedMessages(roomId?: string): Promise<ApiResponse<RoomMessage[]>> {
    const endpoint = roomId 
      ? `/room-messages/mentions/${roomId}`
      : '/room-messages/mentions';
    
    return apiClient.get<RoomMessage[]>(endpoint);
  },

  // ========== 文件上传 ==========
  
  // 上传文件
  async uploadFile(roomId: string, file: File, type: 'image' | 'file' | 'voice' = 'file', onProgress?: (percent: number) => void): Promise<ApiResponse<UploadFileResponseData>> {
    // 客户端大小检查
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    
    if (type === 'image' && file.size > MAX_IMAGE_SIZE) {
      return { success: false, message: '图片大小不能超过10MB' };
    }
    
    if (type === 'file' && file.size > MAX_FILE_SIZE) {
      return { success: false, message: '文件大小不能超过50MB' };
    }

    try {
      let response;
      
      if (type === 'image') {
        response = await uploadService.uploadMessageImage(file, onProgress);
      } else {
        response = await uploadService.uploadMessageFile(file, onProgress);
      }
      
      if (response.success && response.data) {
        return {
          success: true,
          message: response.message,
          data: {
            url: response.data.url,
            filename: response.data.filename,
            size: response.data.size,
            type: type,
            uploadedName: response.data.uploadedName,
            icon: response.data.icon,
            duration: undefined // uploadService currently doesn't return duration
          }
        };
      }
      
      return {
        success: false,
        message: response.message || '上传失败'
      };
    } catch (error: any) {
      console.error('文件上传失败:', error);
      return {
        success: false,
        message: error.message || '文件上传失败'
      };
    }
  },

  // 批量上传文件
  async uploadMultipleFiles(roomId: string, files: File[], type: 'image' | 'file' = 'file', onProgress?: (percent: number) => void): Promise<ApiResponse<UploadFileResponseData[]>> {
    try {
      const response = await uploadService.uploadMultipleFiles(files, type, onProgress);
      
      if (response.success && response.data) {
        return {
          success: true,
          message: response.message,
          data: response.data.map(item => ({
            url: item.url,
            filename: item.filename,
            size: item.size,
            type: type === 'image' ? 'image' : 'file',
            uploadedName: item.uploadedName,
            icon: item.icon
          }))
        };
      }
      
      return {
        success: false,
        message: response.message || '批量上传失败'
      };
    } catch (error: any) {
      console.error('批量文件上传失败:', error);
      return {
        success: false,
        message: error.message || '批量文件上传失败'
      };
    }
  },

  // ========== 消息统计与分析 ==========
  
  // 获取消息统计
  async getMessageStats(roomId: string, period?: 'day' | 'week' | 'month' | 'year'): Promise<ApiResponse<MessageStats>> {
    const endpoint = period 
      ? `/room-messages/${roomId}/stats?period=${period}`
      : `/room-messages/${roomId}/stats`;
    
    return apiClient.get<MessageStats>(endpoint);
  },

  // 获取活跃时段
  async getActiveHours(roomId: string): Promise<ApiResponse<{ hour: number; count: number }[]>> {
    return apiClient.get<{ hour: number; count: number }[]>(`/room-messages/${roomId}/active-hours`);
  },

  // ========== 消息交互功能 ==========
  
  // 添加表情反应
  async addReaction(messageId: string, emoji: string): Promise<ApiResponse<RoomMessage>> {
    return apiClient.post<RoomMessage>(`/room-messages/${messageId}/reactions`, { emoji });
  },

  // 移除表情反应
  async removeReaction(messageId: string, emoji: string): Promise<ApiResponse<RoomMessage>> {
    return apiClient.delete<RoomMessage>(`/room-messages/${messageId}/reactions/${emoji}`);
  },

  // 获取消息反应统计
  async getMessageReactions(messageId: string): Promise<ApiResponse<{ emoji: string; count: number; users: string[] }[]>> {
    return apiClient.get(`/room-messages/${messageId}/reactions`);
  },

  // 转发消息
  async forwardMessage(messageId: string, targetRoomId: string): Promise<ApiResponse<RoomMessage>> {
    return apiClient.post<RoomMessage>(`/room-messages/${messageId}/forward`, { targetRoomId });
  },

  // 引用消息
  async replyToMessage(messageId: string, content: string): Promise<ApiResponse<RoomMessage>> {
    return apiClient.post<RoomMessage>(`/room-messages/${messageId}/reply`, { content });
  },

  // ========== 消息同步功能 ==========
  
  // 同步未读消息
  async syncUnreadMessages(roomId: string, lastSyncTime?: string): Promise<ApiResponse<RoomMessage[]>> {
    const queryParams: Record<string, string> = {};
    if (lastSyncTime) queryParams.since = lastSyncTime;
    
    return apiClient.get<RoomMessage[]>(`/room-messages/${roomId}/sync`, queryParams);
  },

  // 检查新消息
  async checkNewMessages(roomId: string, lastMessageId: string): Promise<ApiResponse<{ hasNew: boolean; count: number }>> {
    return apiClient.get<{ hasNew: boolean; count: number }>(`/room-messages/${roomId}/check-new/${lastMessageId}`);
  },

  // ========== 实用工具函数 ==========
  
  // 格式化文件大小
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 获取文件图标
  getFileIcon(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const iconMap: Record<string, string> = {
      'pdf': '📕',
      'doc': '📝',
      'docx': '📝',
      'xls': '📊',
      'xlsx': '📊',
      'ppt': '📽️',
      'pptx': '📽️',
      'txt': '📄',
      'md': '📄',
      'zip': '📦',
      'rar': '📦',
      '7z': '📦',
      'tar': '📦',
      'gz': '📦',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'bmp': '🖼️',
      'svg': '🖼️',
      'webp': '🖼️',
      'mp3': '🎵',
      'wav': '🎵',
      'ogg': '🎵',
      'm4a': '🎵',
      'mp4': '🎬',
      'mov': '🎬',
      'avi': '🎬',
      'mkv': '🎬',
      'webm': '🎬',
      'exe': '⚙️',
      'dmg': '💿',
      'apk': '📱',
      'ipa': '📱',
      'default': '📎'
    };
    
    return iconMap[ext || ''] || iconMap.default;
  },

  // 检查是否是图片文件
  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  },

  // 检查是否是音频文件
  isAudioFile(file: File): boolean {
    return file.type.startsWith('audio/');
  },

  // 检查是否是视频文件
  isVideoFile(file: File): boolean {
    return file.type.startsWith('video/');
  },

  // 获取文件类型分类
  getFileCategory(file: File): 'image' | 'audio' | 'video' | 'document' | 'archive' | 'other' {
    if (this.isImageFile(file)) return 'image';
    if (this.isAudioFile(file)) return 'audio';
    if (this.isVideoFile(file)) return 'video';
    
    const ext = file.name.toLowerCase().split('.').pop();
    const documentExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'];
    const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];
    
    if (documentExts.includes(ext || '')) return 'document';
    if (archiveExts.includes(ext || '')) return 'archive';
    
    return 'other';
  },

  // 格式化消息时间
  formatMessageTime(date: Date): string {
    const now = new Date();
    const messageDate = new Date(date);
    
    // 如果是今天
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // 如果是昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return '昨天 ' + messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // 如果是今年
    if (messageDate.getFullYear() === now.getFullYear()) {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
             ' ' + messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // 其他情况
    return messageDate.toLocaleDateString() + ' ' + 
           messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  // 生成临时消息ID
  generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // 检查消息是否已读
  isMessageRead(message: RoomMessage, userId: string): boolean {
    return message.readBy.includes(userId);
  },

  // 检查消息是否属于用户
  isOwnMessage(message: RoomMessage, userId: string): boolean {
    return message.sender._id === userId;
  },

  // 获取消息摘要（用于预览）
  getMessagePreview(content: string, maxLength: number = 50): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  },

  // 检查消息是否包含提及
  hasMentions(message: RoomMessage, userId: string): boolean {
    return message.mentions?.includes(userId) || false;
  },

  // 提取消息中的提及
  extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    return matches 
      ? matches.map(match => match.substring(1)) // 去掉@符号
      : [];
  },

  // 添加待处理消息（用于防止重复发送）
  addPendingMessage(tempId: string, content: string, roomId: string, type: string): void {
    if (typeof window === 'undefined') return;
    
    const pendingMessages = JSON.parse(localStorage.getItem('room-pending-messages') || '[]');
    pendingMessages.push({ tempId, content, roomId, type, timestamp: Date.now() });
    
    // 只保留最近20条记录
    const recentMessages = pendingMessages.slice(-20);
    localStorage.setItem('room-pending-messages', JSON.stringify(recentMessages));
  },

  // 移除待处理消息
  removePendingMessage(content: string, roomId: string, type: string): void {
    if (typeof window === 'undefined') return;
    
    const pendingMessages = JSON.parse(localStorage.getItem('room-pending-messages') || '[]');
    const updatedMessages = pendingMessages.filter((msg: any) => 
      !(msg.content === content && msg.roomId === roomId && msg.type === type)
    );
    
    localStorage.setItem('room-pending-messages', JSON.stringify(updatedMessages));
  },

  // 检查重复消息
  isDuplicateMessage(content: string, roomId: string, type: string): boolean {
    if (typeof window === 'undefined') return false;
    
    const pendingMessages = JSON.parse(localStorage.getItem('room-pending-messages') || '[]');
    return pendingMessages.some((msg: any) => 
      msg.content === content && msg.roomId === roomId && msg.type === type
    );
  },

  // 清理过期待处理消息（超过5分钟）
  cleanupPendingMessages(): void {
    if (typeof window === 'undefined') return;
    
    const pendingMessages = JSON.parse(localStorage.getItem('room-pending-messages') || '[]');
    const now = Date.now();
    const validMessages = pendingMessages.filter((msg: any) => 
      now - msg.timestamp < 5 * 60 * 1000 // 5分钟
    );
    
    localStorage.setItem('room-pending-messages', JSON.stringify(validMessages));
  },

  // 获取消息发送状态
  getMessageStatus(message: RoomMessage, userId: string): 'sending' | 'sent' | 'read' | 'failed' {
    // 临时消息表示发送中
    if (message._id.startsWith('temp_')) return 'sending';
    
    // 已读状态
    if (this.isMessageRead(message, userId)) return 'read';
    
    // 已发送但未读
    if (this.isOwnMessage(message, userId)) return 'sent';
    
    // 其他情况
    return 'sent';
  }
};