// frontend/src/components/auth/SettingsInitializer.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';

export function SettingsInitializer() {
  const { isAuthenticated } = useAuthStore();
  const { loadSettings, applyCurrentTheme } = useSettingsStore();
  const loadedRef = useRef(false);

  // 初始化设置 - 只在组件挂载时执行一次
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      if (isAuthenticated) {
        loadSettings();
      } else {
        // 未登录时应用当前设置
        applyCurrentTheme();
      }
    }
  }, [isAuthenticated, loadSettings, applyCurrentTheme]);

  // 监听认证状态变化 - 只在状态真正改变时执行
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe(
      (state) => state.isAuthenticated,
      (newValue, oldValue) => {
        // 只有当认证状态真正改变时才执行
        if (newValue !== oldValue) {
          if (newValue) {
            loadSettings();
          } else {
            applyCurrentTheme(); // 如果未认证，应用当前主题
          }
        }
      }
    );
    return unsubscribe;
  }, [loadSettings, applyCurrentTheme]); // 确保依赖项完整
  return null;
}