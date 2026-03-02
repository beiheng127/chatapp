// frontend/src/components/providers/ThemeProvider.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useSettingsStore } from '@/store/settingsStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

// 自定义主题配置
const customThemeConfig = {
  light: {
    algorithm: antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#1890ff',
      borderRadius: 6,
      colorBgContainer: '#ffffff',
      colorBgLayout: '#f5f5f5',
    },
  },
  dark: {
    algorithm: antdTheme.darkAlgorithm,
    token: {
      colorPrimary: '#1890ff',
      borderRadius: 6,
      colorBgContainer: '#141414',
      colorBgLayout: '#000000',
    },
  },
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [isSystemDark, setIsSystemDark] = useState(false);
  const settings = useSettingsStore((state) => state.settings);
  
  // 只在客户端执行
  useEffect(() => {
    setMounted(true);
    
    // 应用主题到文档
    const applyTheme = () => {
      if (typeof window === 'undefined') return;
      
      const root = document.documentElement;
      const body = document.body;
      
      // 移除现有主题类
      root.classList.remove('theme-light', 'theme-dark');
      body.classList.remove('theme-light', 'theme-dark');
      
      let currentTheme = settings.theme;
      
      // 如果是系统主题，检测系统主题
      if (currentTheme === 'system' && typeof window !== 'undefined') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsSystemDark(prefersDark);
        currentTheme = prefersDark ? 'dark' : 'light';
      }
      
      // 应用新主题
      root.classList.add(`theme-${currentTheme}`);
      body.classList.add(`theme-${currentTheme}`);
      
      // 应用字体大小
      root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
      root.classList.add(`font-size-${settings.fontSize}`);
    };
    
    applyTheme();
    
    // 监听系统主题变化
    if (settings.theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        setIsSystemDark(e.matches);
        applyTheme();
      };
      
      // 添加事件监听器
      mediaQuery.addEventListener('change', handleChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [settings.theme, settings.fontSize]);
  
  // 获取当前实际主题
  const getCurrentTheme = () => {
    if (settings.theme === 'system') {
      return isSystemDark ? 'dark' : 'light';
    }
    return settings.theme;
  };
  
  const currentTheme = getCurrentTheme();
  
  // 构建主题配置
  const themeConfig = {
    ...customThemeConfig[currentTheme],
    token: {
      ...customThemeConfig[currentTheme].token,
      colorPrimary: settings.colorScheme || '#1890ff',
      fontSize: settings.fontSize === 'small' ? 12 : 
                settings.fontSize === 'medium' ? 14 : 16,
    },
    components: {
      Layout: {
        headerBg: currentTheme === 'dark' ? '#141414' : '#ffffff',
        siderBg: currentTheme === 'dark' ? '#1f1f1f' : '#ffffff',
        bodyBg: currentTheme === 'dark' ? '#000000' : '#f5f5f5',
      },
      Card: {
        colorBgContainer: currentTheme === 'dark' ? '#141414' : '#ffffff',
      },
    },
  };

  if (!mounted) {
    // 服务器端渲染时不应用主题
    return (
      <ConfigProvider locale={zhCN}>
        {children}
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider
      theme={themeConfig}
      locale={zhCN}
      componentSize={settings.compactMode ? 'small' : 'middle'}
    >
      {children}
    </ConfigProvider>
  );
}