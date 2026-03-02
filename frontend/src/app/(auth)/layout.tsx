'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Layout, Typography, Spin } from 'antd';
import { useAuthStore } from '@/store/authStore';

const { Content } = Layout;
const { Title } = Typography;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (hasRedirected.current) return;

    if (mounted && isAuthenticated && !isLoading ) {
      console.log('AuthLayout: 检测到已登录，开始跳转到 /chat');
      
      
      // 使用 setTimeout 确保状态更新完成后再跳转
      const timer = setTimeout(() => {
        console.log('AuthLayout: 执行跳转到 /chat');
        hasRedirected.current = true;
        router.push('/chat');
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, router, mounted]);

  // 显示加载状态
  if (isLoading) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large"  />
        </Content>
      </Layout>
    );
  }

  // 如果已认证且正在跳转，显示跳转提示
  if (isAuthenticated ) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Card style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '20px', fontSize: '16px', color: '#666' }}>
              登录成功，正在跳转到聊天页面...
            </div>
            <div style={{ marginTop: '10px', fontSize: '14px', color: '#999' }}>
              如果跳转失败，<a href="/chat">点击这里</a>
            </div>
          </Card>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <Card
            style={{
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <Title level={2} style={{ marginBottom: '8px', color: '#1890ff' }}>
                ChatApp
              </Title>
              <p style={{ color: '#666' }}>实时聊天应用</p>
            </div>
            {children}
          </Card>
          <div style={{ textAlign: 'center', marginTop: '20px', color: 'rgba(255,255,255,0.8)' }}>
            <p>© 2024 ChatApp - 基于 Next.js & WebSocket</p>
          </div>
        </div>
      </Content>
    </Layout>
  );
}