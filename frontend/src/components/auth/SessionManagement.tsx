import React, { useEffect, useState } from 'react';
import { List, Button, Tag, Typography, message, Modal, Tooltip, Card, Skeleton } from 'antd';
import { DesktopOutlined, MobileOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { authService, Session } from '@/services/authService';

const { Text } = Typography;

export const SessionManagement: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // 获取会话列表
  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await authService.getSessions();
      if (response.success && response.data) {
        setSessions(response.data.sessions);
        
        // 尝试从当前token中解析sessionId (简单实现，或者依赖后端返回的当前会话标记)
        // 由于后端没有直接返回当前sessionId，我们可以通过比较当前IP和UserAgent来推测，或者后端最好返回currentSessionId
        // 这里暂时通过简单的比较来实现，或者后端API改进
        // 实际上，为了准确，我们可以在后端login时返回sessionId并存储在localStorage
        // 现阶段我们假设后端返回的列表里包含所有会话，我们无法准确知道哪个是当前会话，除非后端标识
        // 但我们可以根据 "lastActive" 最近的时间来推测（不准确）
        // 更好的做法是后端在/sessions接口返回 { sessions: [], currentSessionId: "..." }
        // 鉴于目前后端接口未返回currentSessionId，我们暂时不做高亮，或者通过对比 IP 和 UA
      }
    } catch (error) {
      console.error('获取会话列表失败:', error);
      message.error('获取会话列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // 移除会话
  const handleRevoke = (sessionId: string) => {
    Modal.confirm({
      title: '确认移除设备',
      content: '确定要强制下线该设备吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await authService.revokeSession(sessionId);
          if (response.success) {
            message.success('设备已下线');
            setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
          } else {
            message.error(response.message || '操作失败');
          }
        } catch (error) {
          console.error('移除会话失败:', error);
          message.error('操作失败');
        }
      }
    });
  };

  const getDeviceIcon = (userAgent: string) => {
    if (/mobile|android|iphone|ipad/i.test(userAgent)) {
      return <MobileOutlined />;
    }
    return <DesktopOutlined />;
  };

  const parseUserAgent = (userAgent: string) => {
    // 简化的 UA 解析
    if (userAgent.includes('Windows')) return 'Windows Device';
    if (userAgent.includes('Mac')) return 'Mac Device';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Linux')) return 'Linux Device';
    return 'Unknown Device';
  };

  return (
    <Card title="登录设备管理" bordered={false} style={{ marginTop: 24 }}>
      <List
        loading={loading}
        itemLayout="horizontal"
        dataSource={sessions}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button 
                key="revoke" 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => handleRevoke(item.sessionId)}
              >
                下线
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={
                <div style={{ 
                  fontSize: 24, 
                  color: '#1890ff', 
                  background: '#e6f7ff', 
                  width: 48, 
                  height: 48, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {getDeviceIcon(item.userAgent)}
                </div>
              }
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong>{parseUserAgent(item.userAgent)}</Text>
                  {/* 如果能识别当前会话，显示Tag */}
                  {/* <Tag color="green">当前设备</Tag> */}
                </div>
              }
              description={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    IP: {item.ip}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    最近活跃: {new Date(item.lastActive).toLocaleString()}
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};
