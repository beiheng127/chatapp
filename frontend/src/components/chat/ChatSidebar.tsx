// components/chat/ChatSidebar.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Input, Button, Avatar, Badge, Typography, Tooltip, Divider, Skeleton } from 'antd';
import {
  HomeOutlined,
  MessageOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  ProfileOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { roomService, type Room } from '@/services/roomService';

const { Text } = Typography;

interface ChatSidebarProps {
  collapsed: boolean;
}

export default function ChatSidebar({ collapsed }: ChatSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { rooms: storeRooms, setRooms, onlineUsers } = useChatStore();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [rooms, setLocalRooms] = useState<Room[]>([]);

  // 加载用户加入的群聊
  const loadUserRooms = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await roomService.getUserRooms();
      if (result.success && result.data) {
        const formattedRooms = result.data.map(room => ({
          id: room._id,
          name: room.name,
          description: room.description,
          memberCount: room.memberCount,
          isPrivate: room.isPrivate,
          avatar: room.avatar,
        }));
        setLocalRooms(result.data);
        setRooms(formattedRooms);
      }
    } catch (error) {
      // 只在开发环境打印日志
      if (process.env.NODE_ENV === 'development') {
        console.error('加载群聊失败:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [user, setRooms]);

  // 主菜单项
  const mainMenuItems = [
    {
      key: '/chat',
      icon: <HomeOutlined />,
      label: '聊天首页',
    },
    {
      key: '/chat/direct',
      icon: <MessageOutlined />,
      label: '私聊',
      badge: 0, // 可以根据实际未读数设置
    },
    {
      key: '/chat/rooms',
      icon: <TeamOutlined />,
      label: '群聊',
    },
    {
      key: '/chat/profile',
      icon: <ProfileOutlined />,
      label: '个人资料',
    },
    {
      key: '/chat/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  // 初始化加载
  useEffect(() => {
    if (user) {
      loadUserRooms();
    }
  }, [user, loadUserRooms]);

  // 过滤聊天室用于搜索
  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateRoom = () => {
    router.push('/chat/rooms');
  };

  const handleJoinRoom = (roomId: string) => {
    router.push(`/chat/${roomId}`);
  };

  // 获取当前活跃的聊天室ID（用于高亮显示）
  const getActiveRoomId = () => {
    const match = pathname.match(/\/chat\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const activeRoomId = getActiveRoomId();

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* 搜索和创建聊天室（仅在展开时显示） */}
      {!collapsed && (
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <Input
            placeholder="搜索群聊..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            size="small"
            style={{ backgroundColor: 'var(--background-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            size="small"
            style={{ marginTop: '12px' }}
            onClick={handleCreateRoom}
          >
            新建群聊
          </Button>
        </div>
      )}

      {/* 主菜单 */}
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        style={{ 
          flex: 1, 
          borderRight: 0,
          padding: collapsed ? '8px 4px' : '16px 8px',
          backgroundColor: 'transparent'
        }}
        items={mainMenuItems.map(item => ({
          key: item.key,
          icon: item.icon,
          label: collapsed ? null : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge 
                  count={item.badge} 
                  size="small" 
                  style={{ 
                    backgroundColor: '#52c41a',
                    marginLeft: '8px'
                  }} 
                />
              )}
            </div>
          ),
          onClick: () => router.push(item.key),
        }))}
      />

      {/* 最近群聊列表（仅在展开时显示） */}
      {!collapsed && (
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '12px' 
          }}>
            <Text strong style={{ fontSize: '14px', color: 'var(--text-color)' }}>
              我的群聊 {rooms.length > 0 && `(${rooms.length})`}
            </Text>
            <Button 
              type="link" 
              size="small" 
              onClick={() => router.push('/chat/rooms')}
              loading={loading}
            >
              全部
            </Button>
          </div>
          
          {loading ? (
            <div style={{ padding: '8px 0' }}>
              {[1, 2].map(i => (
                <Skeleton active avatar paragraph={{ rows: 1 }} key={i} />
              ))}
            </div>
          ) : filteredRooms.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredRooms.slice(0, 5).map(room => {
                const isActive = activeRoomId === room._id;
                return (
                  <div
                    key={room._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: isActive ? 'var(--primary-color-fade)' : 'transparent',
                      border: isActive ? '1px solid var(--primary-color)' : '1px solid transparent',
                    }}
                    onClick={() => handleJoinRoom(room._id)}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--hover-color)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar 
                        size="small" 
                        src={room.avatar && !room.avatar.includes('default') ? room.avatar : undefined}
                        icon={<TeamOutlined />}
                        style={{ 
                          backgroundColor: room.isPrivate ? '#ff4d4f' : '#1890ff',
                        }}
                      />
                      <div style={{ maxWidth: '120px' }}>
                        <Text 
                          ellipsis 
                          style={{ 
                            display: 'block', 
                            fontSize: '13px',
                            fontWeight: '500',
                            color: isActive ? 'var(--primary-color)' : 'var(--text-color)'
                          }}
                        >
                          {room.name}
                        </Text>
                        <Text 
                          type="secondary" 
                          ellipsis
                          style={{ 
                            display: 'block', 
                            fontSize: '11px',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {room.memberCount}人
                          {room.isPrivate && ' · 私密'}
                        </Text>
                      </div>
                    </div>
                    {/* 可以在这里添加未读消息计数 */}
                    {/* {room.unreadCount > 0 && (
                      <Badge 
                        count={room.unreadCount} 
                        size="small" 
                        style={{ 
                          backgroundColor: '#ff4d4f',
                          marginLeft: '8px'
                        }} 
                      />
                    )} */}
                  </div>
                );
              })}
            </div>
          ) : searchTerm ? (
            <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
              未找到匹配的群聊
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
              暂无群聊，点击上方按钮创建
            </Text>
          )}
        </div>
      )}

      {/* 在线用户列表（仅在展开时显示） */}
      {!collapsed && onlineUsers.length > 0 && (
        <div style={{ 
          padding: '16px', 
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--hover-color)'
        }}>
          <Text type="secondary" style={{ fontSize: '12px', marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
            在线用户 ({onlineUsers.length})
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {onlineUsers.slice(0, 8).map(onlineUser => (
              <Tooltip 
                key={onlineUser.id} 
                title={`${onlineUser.username}${onlineUser.id === user?.id ? ' (你)' : ''}`}
                placement="top"
              >
                <Avatar
                  src={onlineUser.avatar}
                  icon={<UserOutlined />}
                  size="small"
                  style={{ 
                    cursor: 'pointer',
                    border: onlineUser.id === user?.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)'
                  }}
                  onClick={() => {
                    if (onlineUser.id !== user?.id) {
                      router.push(`/chat/direct?userId=${onlineUser.id}`);
                    }
                  }}
                />
              </Tooltip>
            ))}
            {onlineUsers.length > 8 && (
              <Tooltip title={`查看更多在线用户 (${onlineUsers.length - 8})`}>
                <Avatar 
                  size="small" 
                  style={{ 
                    backgroundColor: 'var(--border-color)', 
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => router.push('/chat/direct')}
                >
                  +{onlineUsers.length - 8}
                </Avatar>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* 折叠时的简约视图 */}
      {collapsed && (
        <div style={{ 
          padding: '16px', 
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <Text type="secondary" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            在线: {onlineUsers.length}
          </Text>
        </div>
      )}
    </div>
  );
}