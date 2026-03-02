// frontend/src/services/settingsService.ts
import { apiClient, type ApiResponse } from './apiClient';

// 用户设置接口
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  colorScheme?: string;
  notificationEnabled: boolean;
  notificationSound: boolean;
  chatEnterToSend: boolean;
  privacyOnlineStatus: boolean;
}

// 默认设置
export const defaultSettings: UserSettings = {
  theme: 'system',
  language: 'zh-CN',
  fontSize: 'medium',
  compactMode: false,
  colorScheme: '#1890ff',
  notificationEnabled: true,
  notificationSound: true,
  chatEnterToSend: true,
  privacyOnlineStatus: true
};

export const settingsService = {
  // 获取用户设置
  async getSettings(): Promise<ApiResponse<UserSettings>> {
    return apiClient.get<UserSettings>('/user/settings');
  },

  // 更新用户设置
  async updateSettings(settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
    return apiClient.put<UserSettings>('/user/settings', settings);
  },

  // 重置用户设置
  async resetSettings(): Promise<ApiResponse<UserSettings>> {
    return apiClient.post<UserSettings>('/user/settings/reset');
  },

  // 应用主题到文档
  applyTheme(theme: 'light' | 'dark' | 'system'): void {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const body = document.body;
    
    // 移除现有主题类
    root.classList.remove('theme-light', 'theme-dark');
    body.classList.remove('theme-light', 'theme-dark');
    
    // 应用新主题
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const themeClass = prefersDark ? 'theme-dark' : 'theme-light';
      root.classList.add(themeClass);
      body.classList.add(themeClass);
    } else {
      root.classList.add(`theme-${theme}`);
      body.classList.add(`theme-${theme}`);
    }
  },

  // 应用字体大小
  applyFontSize(fontSize: 'small' | 'medium' | 'large'): void {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    
    // 移除所有字体大小类
    root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    
    // 应用字体大小类
    root.classList.add(`font-size-${fontSize}`);
  },

  // 获取当前系统主题
  getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  // 监听系统主题变化
  watchSystemTheme: (callback: (isDark: boolean) => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {}; // 服务器端返回空函数
  }

  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handler = (e: MediaQueryListEvent) => {
      callback(e.matches);
    };
    
    // 检查 addEventListener 是否存在（旧浏览器兼容）
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      
      return () => {
        mediaQuery.removeEventListener('change', handler);
      };
    } else {
      // 旧浏览器兼容
      // @ts-ignore
      mediaQuery.addListener(handler);
      
      return () => {
        // @ts-ignore
        mediaQuery.removeListener(handler);
      };
    }
  } catch (error) {
    console.error('监听系统主题失败:', error);
    return () => {}; // 出错时返回空函数
  }
},

  // 保存设置到本地存储（作为备份）
  saveLocalSettings(settings: UserSettings): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('user-settings', JSON.stringify(settings));
  },

  // 从本地存储加载设置
  loadLocalSettings(): UserSettings | null {
    if (typeof window === 'undefined') return null;
    
    const settings = localStorage.getItem('user-settings');
    return settings ? JSON.parse(settings) : null;
  },

  // 清除本地设置
  clearLocalSettings(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('user-settings');
  }
};