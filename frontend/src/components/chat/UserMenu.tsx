// frontend/src/components/chat/UserMenu.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Avatar, Dropdown, Button, Typography, App, Space, Tooltip } from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  ProfileOutlined,
  MoonOutlined,
  SunOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';

const { Text } = Typography;

export default function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { settings, toggleTheme } = useSettingsStore();
  const { message } = App.useApp();

  const getThemeIcon = () => {
    if (settings.theme === 'system') return <DesktopOutlined />;
    return settings.theme === 'dark' ? <MoonOutlined /> : <SunOutlined />;
  };

  const getThemeLabel = () => {
    const labels = {
      light: '浅色模式',
      dark: '深色模式',
      system: '跟随系统',
    };
    return labels[settings.theme];
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <ProfileOutlined />,
      label: '个人资料',
      onClick: () => {
        router.push('/chat/profile');
      },
    },
    {
      key: 'theme',
      icon: getThemeIcon(),
      label: getThemeLabel(),
      onClick: toggleTheme,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => {
        router.push('/chat/settings');
      },
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        message.success('已退出登录');
      },
    },
  ];

  if (!user) {
    return null;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Tooltip title={`点击切换主题 (${getThemeLabel()})`}>
        <Button
          type="text"
          icon={getThemeIcon()}
          onClick={toggleTheme}
          size="small"
          style={{ padding: '4px' }}
        />
      </Tooltip>
      
      <div style={{ textAlign: 'right' }}>
        <Text strong style={{ display: 'block', fontSize: '14px' }}>
          {user.username}
        </Text>
        <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
          {user.email}
        </Text>
      </div>
      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
        <Button type="text" style={{ padding: '4px' }}>
          <Avatar 
            size="default" 
            src={user.avatar} 
            icon={<UserOutlined />}
            style={{ cursor: 'pointer' }}
          />
        </Button>
      </Dropdown>
    </div>
  );
}