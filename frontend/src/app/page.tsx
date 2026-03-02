// frontend/src/app/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { useAuthStore } from '@/store/authStore';
import React from 'react';


/**
 * 应用首页 (根路由 /)
 * 功能：根据用户的认证状态，自动重定向到登录页或聊天主页。
 */
export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // 仅在状态加载完成后进行重定向，避免不必要的跳转
    if (!isLoading) {
      if (isAuthenticated) {
        // 已登录，重定向到聊天主页
        router.push('/chat');
      } else {
        // 未登录，重定向到登录页
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // 在检查状态和准备重定向期间，显示一个加载指示器
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f0f2f5' // 使用 Ant Design 的背景色
    }}>
      <Spin size="large" />
    </div>
  );
}