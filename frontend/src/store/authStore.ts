// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/services/authService';
import { ApiResponse } from '@/services/apiClient'

// 1. 定义后端返回的原始数据类型（兼容字符串/Date）
interface BackendUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline?: boolean;
  bio?: string;
  lastSeen?: string | Date; // 后端返回可能是字符串（JSON序列化）
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// 2. 定义登录/注册响应的原始数据类型
interface AuthResponseData {
  token: string;
  user: BackendUser; // 使用兼容类型
}

// 3. 前端使用的User类型（统一转为Date）
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline?: boolean;
  bio?: string;
  lastSeen?: Date;
  createdAt?: Date; 
  updatedAt?: Date; 
}

// 4. 工具函数：将后端返回的用户数据转为前端User类型（处理字符串转Date）
const transformUser = (backendUser: BackendUser): User => {
  return {
    ...backendUser,
    lastSeen: backendUser.lastSeen ? new Date(backendUser.lastSeen) : undefined,
    createdAt: backendUser.createdAt ? new Date(backendUser.createdAt) : undefined,
    updatedAt: backendUser.updatedAt ? new Date(backendUser.updatedAt) : undefined,
  };
};

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (userData: { username: string; email: string; password: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        try {
          set({ isLoading: true });
          console.log('开始登录，邮箱:', email);
          
          const response: ApiResponse<AuthResponseData> = await authService.login(email, password);
          
          console.log('登录store处理响应:', {
            response,
            hasData: !!response.data,
            hasToken: !!response.data?.token,
            hasUser: !!response.data?.user
          });
          
          if (response.success && response.data?.token && response.data?.user) {
            console.log('登录成功，更新store状态');
            const transformedUser = transformUser(response.data.user);
            
            set({
              token: response.data.token,
              user: transformedUser,
              isAuthenticated: true,
              isLoading: false,
            });
            
            console.log('Store更新完成:', {
              token: response.data.token?.substring(0, 20) + '...',
              user: transformedUser
            });
            
            return { success: true, message: '登录成功' };
          } else {
            console.warn('登录失败，响应结构不完整:', response);
            set({ isLoading: false });
            return { 
              success: false, 
              message: response.message || '登录失败，服务器返回数据不完整' 
            };
          }
        } catch (error: unknown) { // 修复：移除 any，改为 unknown
          // 类型守卫：判断 error 是 Error 类型
          const errorMessage = error instanceof Error ? error.message : '登录失败，请检查网络';
          console.error('登录store错误详情:', {
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
          });
          set({ isLoading: false });
          return {
            success: false,
            message: errorMessage,
          };
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true });
          const response: ApiResponse<AuthResponseData> = await authService.register(userData);
          console.log('注册store响应:', response);
          
          if (response.success && response.data?.token && response.data?.user) {
            const transformedUser = transformUser(response.data.user);
            set({
              token: response.data.token,
              user: transformedUser,
              isAuthenticated: true,
              isLoading: false,
            });
            return { success: true, message: '注册成功' };
          } else {
            set({ isLoading: false });
            return { 
              success: false, 
              message: response.message || '注册失败，服务器返回数据不完整' 
            };
          }
        } catch (error: unknown) { // 修复：移除 any，改为 unknown
          // 类型守卫：判断 error 是 Error 类型
          const errorMessage = error instanceof Error ? error.message : '注册失败，请检查网络';
          console.error('注册store错误:', error);
          set({ isLoading: false });
          return {
            success: false,
            message: errorMessage,
          };
        }
      },

      logout: () => {
        console.log('执行退出登录...');
        
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
        
        localStorage.removeItem('chat-token');
        localStorage.removeItem('auth-storage');
        
        if (typeof window !== 'undefined') {
          console.log('跳转到登录页...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('chat-token');
        console.log('检查认证，token:', token);
        
        if (token) {
          try {
            set({ isLoading: true });
            const response: ApiResponse<{ user: BackendUser }> = await authService.getProfile();
            
            if (response.success && response.data?.user) {
              console.log('认证成功，用户:', response.data.user);
              const transformedUser = transformUser(response.data.user);
              set({
                token,
                user: transformedUser,
                isAuthenticated: true,
                isLoading: false,
              });
            } else {
              console.log('认证失败，清除状态');
              get().logout();
            }
          } catch (error: unknown) { // 修复：移除 any，改为 unknown
            console.error('认证检查错误:', error);
            get().logout();
          } finally {
            set({ isLoading: false });
          }
        }
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user 
      }),
    }
  )
);