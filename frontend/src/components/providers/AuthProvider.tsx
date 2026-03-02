// components/providers/AuthProvider.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { checkAuth } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    console.log('AuthInitializer: 开始检查认证状态');
    
    const initializeAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('认证检查失败:', error);
      } finally {
        setInitialized(true);
        console.log('AuthInitializer: 认证检查完成');
      }
    };

    initializeAuth();
  }, [checkAuth]);

  // 如果还在初始化，显示加载状态
  if (!initialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '20px' }}>加载中...</div>
        <div>正在检查登录状态</div>
      </div>
    );
  }

  return <>{children}</>;
}