//frontend/src/app/(auth)/login/lazy.tsx
'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from 'antd';

// 懒加载登录页面组件
const LoginPage = dynamic(() => import('./page'), {
  loading: () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      <Skeleton active paragraph={{ rows: 4 }} />
      <div style={{ marginTop: '20px' }}>正在加载登录页面...</div>
    </div>
  ),
  ssr: false,
});

export default function LazyLoginPage() {
  return <LoginPage />;
}