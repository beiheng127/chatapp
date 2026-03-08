// app/(chat)/layout.tsx
'use client';

import React from 'react';
import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Layout, Button, theme, Spin, Drawer, Grid } from 'antd';
import { MenuUnfoldOutlined, MenuFoldOutlined, CloseOutlined } from '@ant-design/icons';
import ChatSidebar from '@/components/chat/ChatSidebar';
import UserMenu from '@/components/chat/UserMenu';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

export default function ChatLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md is 768px in Ant Design
  
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    setMounted(true);
  }, []);

  // 当屏幕尺寸变化时，如果变成桌面端，关闭抽屉
  useEffect(() => {
    if (!isMobile && drawerVisible) {
      setDrawerVisible(false);
    }
  }, [isMobile, drawerVisible]);

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

  const toggleSidebar = () => {
    if (isMobile) {
      setDrawerVisible(!drawerVisible);
    } else {
      setCollapsed(!collapsed);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={280}
          style={{
            background: colorBgContainer,
            borderRight: '1px solid #f0f0f0',
            position: 'fixed',
            height: '100vh',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
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
      )}

      {/* 移动端抽屉侧边栏 */}
      {isMobile && (
        <Drawer
          placement="left"
          closable={false}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={280}
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ 
            padding: '16px', 
            height: '64px', 
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#1890ff'
            }}>
              ChatApp
            </h2>
            <Button 
              type="text" 
              icon={<CloseOutlined />} 
              onClick={() => setDrawerVisible(false)} 
            />
          </div>
          <ChatSidebar collapsed={false} />
        </Drawer>
      )}
      
      <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 280), transition: 'margin-left 0.2s' }}>
        <Header style={{ 
          padding: 0, 
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 99,
          width: '100%',
        }}>
          <Button
            type="text"
            icon={isMobile ? (drawerVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />) : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
            onClick={toggleSidebar}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <div style={{ paddingRight: isMobile ? '12px' : '24px' }}>
            <UserMenu />
          </div>
        </Header>
        
        <Content
          style={{
            margin: isMobile ? '8px' : '24px 16px',
            padding: isMobile ? 12 : 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: isMobile ? 8 : borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}