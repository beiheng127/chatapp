//app/(chat)/page.tsx（主文件，处理懒加载）
'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from 'antd';

// 使用 dynamic 导入进行懒加载
const ChatHomePageContent = dynamic(() => import('./ChatHomePageContent'), {
  loading: () => (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '40px 20px' 
    }}>
      <div style={{ marginBottom: '32px' }}>
        <Skeleton.Input active style={{ width: 200, height: 40 }} />
        <Skeleton.Input active style={{ width: 150, height: 24, marginTop: 8 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <Skeleton active paragraph={{ rows: 4 }} />
        <Skeleton active paragraph={{ rows: 4 }} />
        <Skeleton active paragraph={{ rows: 5 }} style={{ gridColumn: '1 / -1' }} />
      </div>
    </div>
  ),
  ssr: false, // 只在客户端渲染
});

export default function ChatHomePage() {
  return <ChatHomePageContent />;
}