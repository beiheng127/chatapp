// frontend/src/app/providers.tsx
'use client';

import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { SettingsInitializer } from '@/components/auth/SettingsInitializer';

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ConfigProvider locale={zhCN} theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
          colorLink: '#1890ff',
        },
        components: {
          Button: {
            colorPrimary: '#1890ff',
            algorithm: true,
          },
          Input: {
            colorPrimary: '#1890ff',
            algorithm: true,
          },
          Card: {
            headerBg: 'transparent',
          },
        },
      }}>
        <AntdApp style={{ height: '100%' }}>
          <SettingsInitializer />
          {children}
        </AntdApp>
      </ConfigProvider>
    </ThemeProvider>
  );
}