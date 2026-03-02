// app/(chat)/layout.tsx
'use client';

import React from 'react';
import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Layout, Button, theme, Spin } from 'antd';
import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import ChatSidebar from '@/components/chat/ChatSidebar';
import UserMenu from '@/components/chat/UserMenu';

const { Header, Sider, Content } = Layout;

export default function ChatLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // 如果未认证，跳转到登录页
    if (mounted && !isLoading && !isAuthenticated) {
      console.log('ChatLayout: 未认证，跳转到登录页');
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, mounted]);

  // 显示加载状态
  if (isLoading || !mounted) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  // 如果未认证，显示空白（会自动跳转）
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={280}
        style={{
          background: colorBgContainer,
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div style={{ 
          padding: '16px', 
          height: '64px', 
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start'
        }}>
          <h2 style={{ 
            margin: 0, 
            opacity: collapsed ? 0 : 1, 
            transition: 'opacity 0.2s',
            fontSize: collapsed ? '0' : '18px',
            fontWeight: 'bold',
            color: '#1890ff'
          }}>
            {collapsed ? 'CA' : 'ChatApp'}
          </h2>
        </div>
        <ChatSidebar collapsed={collapsed} />
      </Sider>
      
      <Layout>
        <Header style={{ 
          padding: 0, 
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <div style={{ paddingRight: '24px' }}>
            <UserMenu />
          </div>
        </Header>
        
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}