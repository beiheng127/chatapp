//frontend/src/components/auth/AuthInitializer.tsx
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // 页面加载时检查认证状态
    console.log('页面加载，检查认证状态...');
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}