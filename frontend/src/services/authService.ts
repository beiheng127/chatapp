// frontend/src/services/authService.ts
import { apiClient, type ApiResponse, type RequestData } from './apiClient';

// 类型定义（与后端/IUser接口对齐）
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline?: boolean;
  bio?: string;
  lastSeen?: Date | string; // 兼容后端返回的字符串日期
  createdAt?: Date | string; // 新增：后端返回的创建时间
  updatedAt?: Date | string; // 新增：后端返回的更新时间
}

// 针对不同接口的响应数据类型
export interface LoginResponseData {
  token: string;
  user: User;
}

export interface ProfileResponseData {
  user: User;
}

export interface OnlineUsersResponseData {
  users: User[];
}

export interface AvatarUploadResponseData {
  avatarUrl: string;
}

export interface Session {
  sessionId: string;
  ip: string;
  userAgent: string;
  lastActive: Date | string;
  deviceType: string;
}

export interface SessionsResponseData {
  sessions: Session[];
}

// 定义错误响应类型
interface ErrorResponse {
  message?: string;
  [key: string]: unknown;
}

// 实际的服务方法 - 连接到真实后端
export const authService = {
  // 注册
  async register(data: { username: string; email: string; password: string }): Promise<ApiResponse<LoginResponseData>> {
    try {
      console.log('发送注册请求:', data);
      
      const response = await apiClient.post<LoginResponseData>('/auth/register', data as RequestData);
      console.log('注册响应:', response);
      
      if (response.success && response.data) {
        localStorage.setItem('chat-token', response.data.token);
      }
      
      return response;
    } catch (error) {
      console.error('注册失败:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : '注册失败，请检查网络连接';
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  // 登录
  async login(email: string, password: string): Promise<ApiResponse<LoginResponseData>> {
    try {
      console.log('发送登录请求，邮箱:', email);
      
      const response = await apiClient.post<LoginResponseData>('/auth/login', {
        email,
        password
      } as RequestData);
      
      console.log('登录响应:', response);
      
      if (response.success && response.data) {
        localStorage.setItem('chat-token', response.data.token);
      }
      
      return response;
    } catch (error) {
      console.error('登录失败:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : '登录失败，请检查邮箱和密码';
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  // 获取用户资料
  async getProfile(): Promise<ApiResponse<ProfileResponseData>> {
    try {
      console.log('获取用户资料...');
      const response = await apiClient.get<ProfileResponseData>('/auth/profile');
      console.log('用户资料响应:', response);
      
      return response;
    } catch (error) {
      console.error('获取用户资料失败:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : '获取用户资料失败';
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  // 更新用户资料（适配后端新增的updateProfile接口）
  async updateProfile(data: Partial<User>): Promise<ApiResponse<ProfileResponseData>> {
    try {
      console.log('更新用户资料:', data);
      
      // 调用后端PUT /auth/profile接口
      const response = await apiClient.put<ProfileResponseData>('/auth/profile', data as RequestData);
      console.log('更新用户资料响应:', response);
      
      return response;
    } catch (error) {
      console.error('更新用户资料失败:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : '更新用户资料失败';
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  // 获取在线用户列表（新增：对应后端getOnlineUsers接口）
  async getOnlineUsers(): Promise<ApiResponse<OnlineUsersResponseData>> {
    try {
      console.log('获取在线用户列表...');
      const response = await apiClient.get<OnlineUsersResponseData>('/auth/online-users');
      console.log('在线用户响应:', response);
      
      return response;
    } catch (error) {
      console.error('获取在线用户失败:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : '获取在线用户失败';
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  // 登出（调用后端logout接口）
  async logout(): Promise<ApiResponse<{ message: string }>> {
    try {
      console.log('执行登出...');
      const response = await apiClient.post<{ message: string }>('/auth/logout', {} as RequestData);
      console.log('登出响应:', response);
      
      localStorage.removeItem('chat-token');
      return response;
    } catch (error) {
      console.error('登出失败:', error);
      localStorage.removeItem('chat-token');
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : '登出失败';
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  // 头像上传（适配后端文件上传接口）- 修复参数错误
  async uploadAvatar(file: File): Promise<ApiResponse<AvatarUploadResponseData>> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      // 调试：打印 FormData 的内容
      // console.log('FormData 内容:');
      // for (const [key, value] of formData.entries()) {
      //   console.log(`${key}: ${value}`);
      // }
      
      //使用原生fetch
      const token = this.getToken();
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      
      const response = await fetch(`${API_BASE_URL}/upload/avatar`, {
        method: 'POST',
        headers: {
          // 不要设置Content-Type，浏览器会自动设置为multipart/form-data并添加boundary
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      // 处理响应
      if (!response.ok) {
        const errorText = await response.text();
        console.error('错误响应文本:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(errorData.message || `上传失败: HTTP ${response.status}`);
      }
      const data = await response.json() as ApiResponse<AvatarUploadResponseData>;
      
      return data;
    } catch (error) {
      console.error('头像上传失败:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : '头像上传失败';
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  // 发送验证码
  async sendVerificationCode(email: string, type: 'register' | 'reset_password' | 'change_password'): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/auth/send-code', { email, type });
  },

  // 修改密码
  async changePassword(data: any): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/auth/change-password', data);
  },

  // 获取会话列表
  async getSessions(): Promise<ApiResponse<SessionsResponseData>> {
    return apiClient.get<SessionsResponseData>('/auth/sessions');
  },

  // 移除会话
  async revokeSession(sessionId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/auth/sessions/${sessionId}`);
  },

  // 获取当前用户token
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('chat-token');
  },

  // 检查是否已登录
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('chat-token');
  },

  // 清除认证信息
  clearAuth(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chat-token');
    }
  },
};

export default authService;