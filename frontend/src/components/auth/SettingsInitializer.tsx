// frontend/src/components/auth/SettingsInitializer.tsx
'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';

export function SettingsInitializer() {
  const { isAuthenticated } = useAuthStore();
  const { loadSettings, applyCurrentTheme } = useSettingsStore();

  // 初始化设置
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    } else {
      // 未登录时应用当前设置
      applyCurrentTheme();
    }
  }, [isAuthenticated, loadSettings, applyCurrentTheme]);

  // 监听认证状态变化
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe(
      (isAuthenticated) => { // 直接接收当前的认证状态
        if (isAuthenticated) {
          loadSettings();
        } else {
          applyCurrentTheme(); // 如果未认证，应用当前主题
        }
      }
    );
    return unsubscribe;
  }, [loadSettings, applyCurrentTheme]); // 确保依赖项完整
  return null;
}