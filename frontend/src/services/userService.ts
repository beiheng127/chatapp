// frontend/src/services/userService.ts
import { apiClient,type ApiResponse } from './apiClient';

export interface UserProfile {
  _id: string;
  username: string;
  email: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: Date;
  bio?: string;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileData {
  username?: string;
  avatar?: string;
  bio?: string;
  status?: string;
}

export const userService = {
  // 搜索用户
  async searchUsers(query: string, limit: number = 20): Promise<ApiResponse<UserProfile[]>> {
    if (!query.trim()) {
      return { success: true, data: [] };
    }
    
    return apiClient.get<UserProfile[]>('/users/search', {
      query,
      limit
    });
  },

  // 获取用户详情
  async getUser(userId: string): Promise<ApiResponse<UserProfile>> {
    return apiClient.get<UserProfile>(`/users/${userId}`);
  },

  // 获取在线用户列表
  async getOnlineUsers(): Promise<ApiResponse<UserProfile[]>> {
    return apiClient.get<UserProfile[]>('/users/online');
  },

  // 获取最近活跃用户
  async getRecentUsers(limit: number = 20): Promise<ApiResponse<UserProfile[]>> {
    return apiClient.get<UserProfile[]>('/users/search', {
      query: '',
      limit
    });
  },

  // 更新用户在线状态
  async updateOnlineStatus(isOnline: boolean) {
    return apiClient.post('/users/online-status', { isOnline });
  },

  // 获取用户统计
  async getUserStats() {
    return apiClient.get<{
      totalUsers: number;
      onlineUsers: number;
      todayActiveUsers: number;
    }>('/users/stats');
  },
};