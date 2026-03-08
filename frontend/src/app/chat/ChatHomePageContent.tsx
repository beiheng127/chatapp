//app/chat/ChatHomePageContent.tsx
'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Empty, Card, List, Avatar, Typography, Tag, Space, theme, Grid, Badge } from 'antd';
import { 
  MessageOutlined, 
  TeamOutlined, 
  RocketOutlined, 
  UserOutlined,
  SettingOutlined,
  PlusOutlined,
  ProfileOutlined,
  DownOutlined,
  UpOutlined
} from '@ant-design/icons';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { roomService } from '@/services/roomService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function ChatHomePageContent() {
  const router = useRouter();
  const { rooms, messages, currentRoom, setCurrentRoom } = useChatStore();
  const { user } = useAuthStore();
  const { isConnected } = useWebSocket();
  const [recentRooms, setRecentRooms] = useState<any[]>([]);
  const [messagesExpanded, setMessagesExpanded] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  const { token } = theme.useToken();

  // 刷新房间数据
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await roomService.getUserRooms();
        if (response.data) {
          const mappedRooms = response.data.map((r: any) => ({
             ...r,
             id: r._id || r.id
          }));
          useChatStore.getState().setRooms(mappedRooms);
        }
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
      }
    };
    
    // 如果房间列表为空，或者距离上次更新超过一定时间（这里简单处理为每次挂载都刷新）
    fetchRooms();
  }, []);

  useEffect(() => {
    // 获取最近活跃的聊天室
    const sortedRooms = [...rooms]
      .sort((a, b) => {
        const timeA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const timeB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return timeB - timeA; // 降序排列，最新的在前面
      })
      .slice(0, 5);
    setRecentRooms(sortedRooms);
  }, [rooms]);

  const joinRoom = (roomId: string) => {
    setCurrentRoom(roomId);
    router.push(`/chat/${roomId}`);
  };

  const handleCreateRoom = () => {
    // 跳转到聊天室创建页面或显示模态框
    router.push('/chat/rooms');
  };

  const getRoomDisplayInfo = (room: any) => {
    let displayAvatar = room.avatar;
    let displayName = room.name;

    // 如果是私聊且有成员信息，尝试获取对方的头像和名字
    if (room.isPrivate && room.members && Array.isArray(room.members) && user) {
      const otherMember = room.members.find(
        (m: any) => (m.userId || m.id || m._id) !== user.id
      );
      
      if (otherMember) {
        // 优先使用成员头像，如果没有则回退到房间头像
        if (otherMember.avatar && !otherMember.avatar.includes('default')) {
          displayAvatar = otherMember.avatar;
        }
        
        // 尝试获取对方名字
        if (otherMember.username) {
          displayName = otherMember.username;
        } else if (otherMember.name) {
          displayName = otherMember.name;
        }
      }
    }
    
    return { avatar: displayAvatar, name: displayName };
  };

  if (!user) {
    return (
      <Empty
        description="请先登录"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Button type="primary" onClick={() => router.push('/login')}>
          去登录
        </Button>
      </Empty>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 4px' : '0' }}>
      <div style={{ marginBottom: isMobile ? '16px' : '32px' }}>
        <Title level={isMobile ? 3 : 2}>欢迎回来，{user.username}！</Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Text type="secondary">
            WebSocket连接状态: 
          </Text>
          <Tag color={isConnected ? 'success' : 'error'} style={{ margin: 0 }}>
            {isConnected ? '已连接' : '未连接'}
          </Tag>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '16px' : '24px' }}>
        {/* 最近聊天室 */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TeamOutlined />
              <span>最近聊天室</span>
            </div>
          }
          extra={<Button type="link" onClick={() => router.push('/chat/rooms')}>查看全部</Button>}
          styles={{ body: { padding: isMobile ? '8px' : '24px' } }}
        >
          {recentRooms.length > 0 ? (
            <List
              dataSource={recentRooms}
              renderItem={(room) => {
                const { avatar, name } = getRoomDisplayInfo(room);
                return (
                  <List.Item
                    style={{ 
                      cursor: 'pointer', 
                      padding: isMobile ? '8px' : '12px 16px',
                      transition: 'background-color 0.3s',
                      borderRadius: '8px',
                      marginBottom: '4px'
                    }}
                    className="room-item"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = token.colorFillTertiary}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => joinRoom(room.id)}
                    actions={isMobile ? [] : [
                      <Tag key="members" color="blue">{room.memberCount || 0}人</Tag>,
                      room.unreadCount > 0 && (
                        <Tag key="unread" color="red">{room.unreadCount}条未读</Tag>
                      ),
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          src={avatar && !avatar.includes('default') ? avatar : undefined} 
                          icon={<TeamOutlined />} 
                          style={{ backgroundColor: room.isPrivate ? '#ff4d4f' : '#1890ff' }}
                        />
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ color: token.colorText, fontSize: isMobile ? '14px' : '15px' }}>{name}</Text>
                          {isMobile && room.unreadCount > 0 && (
                            <Badge count={room.unreadCount} size="small" />
                          )}
                        </div>
                      }
                      description={
                        <Text ellipsis style={{ color: token.colorTextSecondary, fontSize: isMobile ? '11px' : '12px' }}>
                          {room.lastMessage || '暂无消息'}
                        </Text>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          ) : (
            <Empty description="暂无聊天室" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '20px 0' }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleCreateRoom}
              >
                创建第一个聊天室
              </Button>
            </Empty>
          )}
        </Card>

        {/* 快速开始 */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RocketOutlined />
              <span>快速开始</span>
            </div>
          }
          styles={{ body: { padding: isMobile ? '16px' : '24px' } }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr', gap: '12px' }}>
            <Button
              type="primary"
              size={isMobile ? 'middle' : 'large'}
              icon={<TeamOutlined />}
              block
              onClick={() => router.push('/chat/rooms')}
            >
              创建聊天室
            </Button>
            
            <Button
              size={isMobile ? 'middle' : 'large'}
              icon={<MessageOutlined />}
              block
              onClick={() => router.push('/chat/direct')}
            >
              发起私聊
            </Button>
            
            <Button
              size={isMobile ? 'middle' : 'large'}
              icon={<ProfileOutlined />}
              block
              onClick={() => router.push('/chat/profile')}
            >
              个人资料
            </Button>
            
            <Button
              size={isMobile ? 'middle' : 'large'}
              icon={<SettingOutlined />}
              block
              onClick={() => router.push('/chat/settings')}
            >
              系统设置
            </Button>
          </div>
        </Card>

        {/* 最近消息 */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageOutlined />
              <span>最近消息</span>
            </div>
          }
          style={{ gridColumn: '1 / -1' }}
          styles={{ body: { padding: isMobile ? '8px' : '24px' } }}
          extra={
            messages.length > 3 && (
              <Button 
                type="text" 
                onClick={() => setMessagesExpanded(!messagesExpanded)}
                icon={messagesExpanded ? <UpOutlined /> : <DownOutlined />}
                size="small"
              >
                {messagesExpanded ? '收起' : '展开'}
              </Button>
            )
          }
        >
          {messages.length > 0 ? (
            <div style={{ 
              maxHeight: messagesExpanded ? '600px' : '240px', 
              overflowY: 'auto',
              transition: 'max-height 0.3s ease-in-out',
              paddingRight: '4px'
            }}>
              <List
                dataSource={messages.slice(-20).reverse()}
                split={false}
                renderItem={(msg) => (
                  <List.Item 
                    style={{ 
                      padding: isMobile ? '8px' : '12px',
                      marginBottom: '8px',
                      borderRadius: '8px',
                      backgroundColor: token.colorFillQuaternary,
                      border: `1px solid ${token.colorBorderSecondary}`
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          src={msg.senderAvatar} 
                          size={isMobile ? 'default' : 'large'} 
                          icon={<UserOutlined />}
                          style={{ backgroundColor: token.colorPrimary }}
                        />
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ color: token.colorText, fontSize: isMobile ? '13px' : '14px' }}>{msg.userName}</Text>
                          <Text type="secondary" style={{ fontSize: '10px' }}>
                            {isMobile ? dayjs(msg.timestamp).format('HH:mm') : new Date(msg.timestamp).toLocaleString()}
                          </Text>
                        </div>
                      }
                      description={
                        <div style={{ marginTop: '4px' }}>
                          <Text style={{ color: token.colorTextSecondary, fontSize: isMobile ? '12px' : '13px' }}>
                            {msg.content}
                          </Text>
                          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Tag color="blue" style={{ fontSize: '9px', lineHeight: '16px' }}>
                              {msg.roomName || '未知群聊'}
                            </Tag>
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          ) : (
            <Empty description="暂无消息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      </div>
    </div>
  );
}