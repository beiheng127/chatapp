// frontend/src/services/roomService.ts
import { apiClient, type ApiResponse } from './apiClient';

export interface RoomMember {
  _id: string;
  username: string;
  avatar: string;
  isOnline: boolean;
}

export interface Room {
  _id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  type: 'group' | 'channel';
  avatar: string;
  maxMembers: number;
  creator: {
    _id: string;
    username: string;
    avatar: string;
  };
  members: RoomMember[];
  adminMembers: Array<{
    _id: string;
    username: string;
    avatar: string;
  }>;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// 修复：添加字符串索引签名，兼容 Record<string, unknown>
export interface CreateRoomData extends Record<string, unknown> {
  name: string;
  description?: string;
  isPrivate?: boolean;
  type?: 'group' | 'channel';
  memberIds?: string[];
}

// 修复：添加字符串索引签名，兼容 Record<string, unknown>
export interface UpdateRoomData extends Record<string, unknown> {
  name?: string;
  description?: string;
  avatar?: string;
  isPrivate?: boolean;
  maxMembers?: number;
}

// 定义公开群聊列表的返回类型
interface PublicRoomsResponse {
  data: Room[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// 定义通用操作返回类型（如加入/离开/删除房间）
interface RoomOperationResponse {
  success: boolean;
  message: string;
  room?: Room;
}

// 定义邀请用户返回类型
interface InviteToRoomResponse {
  invitedCount: number;
  message: string;
}

// 定义管理员操作返回类型
interface ToggleAdminResponse {
  success: boolean;
  message: string;
  isAdmin: boolean;
}

export const roomService = {
  // 创建群聊（补全返回类型）
  async createRoom(data: CreateRoomData): Promise<ApiResponse<Room>> {
    return apiClient.post<Room>('/rooms/create', data);
  },

  // 获取用户加入的群聊列表（补全返回类型）
  async getUserRooms(): Promise<ApiResponse<Room[]>> {
    return apiClient.get<Room[]>('/rooms/my-rooms');
  },

  // 获取公开群聊列表（分页）（修复 any + 补全返回类型）
  async getPublicRooms(params?: { 
    page?: number; 
    limit?: number; 
    search?: string;
  }): Promise<ApiResponse<PublicRoomsResponse>> {
    // 修复：移除 any，指定查询参数类型为 string | number
    const queryParams: Record<string, string | number> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.search) queryParams.search = params.search;
    
    return apiClient.get<PublicRoomsResponse>('/rooms/public', queryParams);
  },

  // 获取群聊详情（补全返回类型）
  async getRoomDetails(roomId: string): Promise<ApiResponse<Room>> {
    return apiClient.get<Room>(`/rooms/${roomId}`);
  },

  // 更新群聊信息（补全返回类型）
  async updateRoom(roomId: string, data: UpdateRoomData): Promise<ApiResponse<Room>> {
    return apiClient.put<Room>(`/rooms/${roomId}`, data);
  },

  // 加入群聊（补全返回类型）
  async joinRoom(roomId: string): Promise<ApiResponse<RoomOperationResponse>> {
    return apiClient.post<RoomOperationResponse>(`/rooms/${roomId}/join`);
  },

  // 离开群聊（补全返回类型）
  async leaveRoom(roomId: string): Promise<ApiResponse<RoomOperationResponse>> {
    return apiClient.post<RoomOperationResponse>(`/rooms/${roomId}/leave`);
  },

  // 邀请用户加入群聊（补全返回类型 + 修复参数类型）
  async inviteToRoom(roomId: string, userIds: string[]): Promise<ApiResponse<InviteToRoomResponse>> {
    // 修复：userIds 所在对象添加索引签名（兼容 Record<string, unknown>）
    const requestData = { userIds } as Record<string, unknown>;
    return apiClient.post<InviteToRoomResponse>(`/rooms/${roomId}/invite`, requestData);
  },

  // 搜索群聊成员（补全返回类型）
  async searchMembers(roomId: string, search: string): Promise<ApiResponse<RoomMember[]>> {
    // 修复：移除 any，指定查询参数类型
    return apiClient.get<RoomMember[]>(`/rooms/${roomId}/members/search`, { search });
  },

  // 移除群聊成员（仅管理员）（补全返回类型）
  async removeMember(roomId: string, userId: string): Promise<ApiResponse<RoomOperationResponse>> {
    return apiClient.delete<RoomOperationResponse>(`/rooms/${roomId}/members/${userId}`);
  },

  // 设置/取消管理员（补全返回类型 + 修复参数类型）
  async toggleAdmin(roomId: string, userId: string, isAdmin: boolean): Promise<ApiResponse<ToggleAdminResponse>> {
    // 修复：isAdmin 所在对象添加索引签名（兼容 Record<string, unknown>）
    const requestData = { isAdmin } as Record<string, unknown>;
    return apiClient.patch<ToggleAdminResponse>(`/rooms/${roomId}/admins/${userId}`, requestData);
  },

  // 解散群聊（仅创建者）
  async deleteRoom(roomId: string): Promise<ApiResponse<RoomOperationResponse>> {
    return apiClient.delete<RoomOperationResponse>(`/rooms/${roomId}`);
  },
  // 上传群聊头像
  async uploadRoomAvatar(roomId: string, file: File): Promise<ApiResponse<{ avatarUrl: string; roomId: string }>> {
    try {
      console.log('上传群聊头像，房间ID:', roomId, '文件:', file.name);
      
      // 创建FormData
      const formData = new FormData();
      formData.append('avatar', file);
      
      // 直接使用原生fetch（ApiClient不支持FormData）
      const token = this.getToken();
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${API_BASE_URL}/room-upload/${roomId}/avatar`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `上传失败: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('上传群聊头像失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '上传失败'
      };
    }
  },

  // 获取当前用户token
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('chat-token');
  },
};