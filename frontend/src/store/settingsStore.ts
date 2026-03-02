// frontend/src/store/settingsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsService, type UserSettings, defaultSettings } from '@/services/settingsService';
import { useAuthStore } from './authStore';

interface SettingsStore {
  // 状态
  settings: UserSettings;
  loading: boolean;
  error: string | null;
  
  // 操作
  setSettings: (settings: UserSettings) => void;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  
  // 异步操作
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
  
  // 主题相关
  toggleTheme: () => void;
  applyCurrentTheme: () => void;
  getCurrentTheme: () => 'light' | 'dark';
  applySettings: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      settings: defaultSettings,
      loading: false,
      error: null,
      
      // 同步操作
      setSettings: (settings) => {
        set({ settings });
        // 保存到本地存储
        settingsService.saveLocalSettings(settings);
        // 应用设置
        get().applySettings();
      },
      
      updateSetting: (key, value) => {
        set((state) => {
          const newSettings = { ...state.settings, [key]: value };
          
          // 如果是主题变更，立即应用
          if (key === 'theme') {
            settingsService.applyTheme(value as 'light' | 'dark' | 'system');
          }
          
          // 如果是字体大小变更，立即应用
          if (key === 'fontSize') {
            settingsService.applyFontSize(value as 'small' | 'medium' | 'large');
          }
          
          return { settings: newSettings };
        });
      },
      
      updateSettings: (newSettings) => {
        set((state) => {
          const mergedSettings = { ...state.settings, ...newSettings };
          
          // 应用变更的设置
          if (newSettings.theme !== undefined) {
            settingsService.applyTheme(newSettings.theme);
          }
          
          if (newSettings.fontSize !== undefined) {
            settingsService.applyFontSize(newSettings.fontSize);
          }
          
          return { settings: mergedSettings };
        });
      },
      
      // 异步操作
      loadSettings: async () => {
        const { isAuthenticated } = useAuthStore.getState();
        
        if (!isAuthenticated) {
          // 未登录时使用本地设置或默认设置
          const localSettings = settingsService.loadLocalSettings();
          if (localSettings) {
            set({ settings: localSettings });
            get().applySettings();
          }
          return;
        }
        
        set({ loading: true, error: null });
        
        try {
          const result = await settingsService.getSettings();
          
          if (result.success && result.data) {
            set({ settings: result.data });
            get().applySettings();
          } else {
            // 如果服务器失败，使用本地设置
            const localSettings = settingsService.loadLocalSettings();
            if (localSettings) {
              set({ settings: localSettings });
              get().applySettings();
            }
          }
        } catch (error) {
          console.error('加载设置失败:', error);
          set({ error: '加载设置失败' });
          
          // 使用本地设置作为回退
          const localSettings = settingsService.loadLocalSettings();
          if (localSettings) {
            set({ settings: localSettings });
            get().applySettings();
          }
        } finally {
          set({ loading: false });
        }
      },
      
      saveSettings: async () => {
        const { isAuthenticated } = useAuthStore.getState();
        
        if (!isAuthenticated) {
          // 未登录时只保存到本地
          settingsService.saveLocalSettings(get().settings);
          return true;
        }
        
        set({ loading: true, error: null });
        
        try {
          const result = await settingsService.updateSettings(get().settings);
          
          if (result.success) {
            // 同时保存到本地作为备份
            settingsService.saveLocalSettings(get().settings);
            return true;
          } else {
            set({ error: result.message || '保存设置失败' });
            return false;
          }
        } catch (error) {
          console.error('保存设置失败:', error);
          set({ error: '保存设置失败' });
          return false;
        } finally {
          set({ loading: false });
        }
      },
      
      resetSettings: async () => {
        const { isAuthenticated } = useAuthStore.getState();
        
        if (!isAuthenticated) {
          set({ settings: defaultSettings });
          get().applySettings();
          return true;
        }
        
        set({ loading: true, error: null });
        
        try {
          const result = await settingsService.resetSettings();
          
          if (result.success && result.data) {
            set({ settings: result.data });
            get().applySettings();
            return true;
          } else {
            set({ error: result.message || '重置设置失败' });
            return false;
          }
        } catch (error) {
          console.error('重置设置失败:', error);
          set({ error: '重置设置失败' });
          return false;
        } finally {
          set({ loading: false });
        }
      },
      
      // 主题相关
      toggleTheme: () => {
        const { settings } = get();
        const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(settings.theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        
        get().updateSetting('theme', themes[nextIndex]);
      },
      
      applyCurrentTheme: () => {
        const { settings } = get();
        settingsService.applyTheme(settings.theme);
        settingsService.applyFontSize(settings.fontSize);
        
        // 监听系统主题变化
        if (settings.theme === 'system') {
          settingsService.watchSystemTheme(() => {
            settingsService.applyTheme('system');
          });
        }
      },
      
      getCurrentTheme: () => {
        const { theme } = get().settings;
        
        if (theme === 'system') {
          return settingsService.getSystemTheme();
        }
        
        return theme;
      },
      
      // 应用所有设置
      applySettings: () => {
        const { settings } = get();
        
        // 应用主题
        settingsService.applyTheme(settings.theme);
        
        // 应用字体大小
        settingsService.applyFontSize(settings.fontSize);
        
        // 监听系统主题变化
        if (settings.theme === 'system') {
          settingsService.watchSystemTheme(() => {
            settingsService.applyTheme('system');
          });
        }
      }
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);

// 导出常用的选择器
export const useCurrentTheme = () => useSettingsStore((state) => state.getCurrentTheme());
export const useTheme = () => useSettingsStore((state) => state.settings.theme);
export const useSettings = () => useSettingsStore((state) => state.settings);