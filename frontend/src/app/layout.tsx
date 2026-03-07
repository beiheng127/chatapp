// app/layout.tsx
import React from 'react';
import type { Metadata } from 'next';
// import { Inter } from 'next/font/google';
import './global.css';
import Providers from './providers';
import { AuthInitializer } from '@/components/auth/AuthInitializer';
import AntdRegistry from './AntdRegistry';

export const metadata: Metadata = {
  title: 'ChatApp - 实时聊天室',
  description: '基于Next.js和WebSocket的实时聊天应用',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      {/* <body className={inter.className}> */}
      <body>
        <AntdRegistry>
          <AuthInitializer>
            <Providers>
            {children}
            </Providers>
          </AuthInitializer>
        </AntdRegistry>
      </body>
    </html>
  );
}