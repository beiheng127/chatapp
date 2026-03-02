// app/(chat)/rooms/[roomId]/invite/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Input,
  Button,
  List,
  Avatar,
  Typography,
  Tag,
  message,
  Skeleton,
  Empty,
} from 'antd';
import {
  SearchOutlined,
  UserAddOutlined,
  ArrowLeftOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { roomService, type Room } from '@/services/roomService';
import { userService, type UserProfile } from '@/services/userService';

const { Title, Text } = Typography;
const { Search } = Input;

export default function InviteMembersPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const { user } = useAuthStore();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // 加载群聊详情
  const loadRoomDetails = useCallback(async () => {
    try {
      const result = await roomService.getRoomDetails(roomId);
      if (result.success && result.data) {
        setRoom(result.data);
      } else {
        messageApi.error(result.message || '群聊不存在');
        router.push('/chat/rooms');
      }
    } catch (error) {
      console.error('加载群聊详情失败:', error);
      messageApi.error('加载群聊详情失败');
      router.push('/chat/rooms');
    }
  }, [roomId, router, messageApi]);

  // 搜索用户
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setSearchLoading(true);
    try {
      const result = await userService.searchUsers(query);
      if (result.success && result.data) {
        // 过滤掉已经是群成员的用户
        const memberIds = new Set(room?.members.map(m => m._id));
        const filteredUsers = result.data.filter(u => 
          u._id !== user?.id && !memberIds.has(u._id)
        );
        setUsers(filteredUsers);
      }
    } catch (error) {
      console.error('搜索用户失败:', error);
      messageApi.error('搜索用户失败');
    } finally {
      setSearchLoading(false);
    }
  }, [room, user, messageApi]);

  // 邀请用户
  const inviteUsers = async () => {
    if (selectedUsers.length === 0 || !room) return;

    setInviting(true);
    try {
      const result = await roomService.inviteToRoom(roomId, selectedUsers);
      if (result.success) {
        messageApi.success(`成功邀请 ${selectedUsers.length} 位成员`);
        // 清空选择
        setSelectedUsers([]);
        // 刷新用户列表
        await loadRoomDetails();
        // 清空搜索
        setSearchText('');
        setUsers([]);
      } else {
        messageApi.error(result.message || '邀请失败');
      }
    } catch (error) {
      console.error('邀请用户失败:', error);
      messageApi.error('邀请用户失败');
    } finally {
      setInviting(false);
    }
  };

  // 切换用户选择
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await loadRoomDetails();
      } catch (error) {
        console.error('初始化失败:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [loadRoomDetails]);

  if (loading || !room) {
    return (
      <div style={{ padding: '40px' }}>
        <Skeleton active />
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* 返回按钮 */}
        <div style={{ marginBottom: '20px' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/chat/${roomId}`)}
          >
            返回聊天
          </Button>
        </div>

        <Card title={`邀请成员到 ${room.name}`}>
          {/* 当前群成员统计 */}
          <div style={{ marginBottom: '24px', padding: '16px', background: '#fafafa', borderRadius: '8px' }}>
            <Text strong>当前群成员: {room.memberCount}人</Text>
            <div style={{ marginTop: '8px' }}>
              {room.members.slice(0, 10).map(member => (
                <Tag key={member._id} style={{ marginBottom: '4px' }}>
                  <Avatar size="small" src={member.avatar} style={{ marginRight: '4px' }} />
                  {member.username}
                </Tag>
              ))}
              {room.members.length > 10 && (
                <Tag>...等{room.members.length - 10}人</Tag>
              )}
            </div>
          </div>

          {/* 搜索框 */}
          <Search
            placeholder="搜索用户名或邮箱..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              searchUsers(e.target.value);
            }}
            loading={searchLoading}
            allowClear
            size="large"
            style={{ marginBottom: '24px' }}
          />

          {/* 已选择的用户 */}
          {selectedUsers.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                已选择 ({selectedUsers.length})
              </Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {users
                  .filter(u => selectedUsers.includes(u._id))
                  .map(user => (
                    <Tag
                      key={user._id}
                      closable
                      onClose={() => toggleUserSelection(user._id)}
                      style={{ padding: '4px 8px', borderRadius: '16px' }}
                    >
                      <Avatar size="small" src={user.avatar} style={{ marginRight: '4px' }} />
                      {user.username}
                    </Tag>
                  ))}
              </div>
            </div>
          )}

          {/* 用户列表 */}
          <div style={{ marginBottom: '24px' }}>
            {searchText ? (
              users.length > 0 ? (
                <List
                  dataSource={users}
                  renderItem={(userItem) => (
                    <List.Item
                      actions={[
                        <Button
                          key="invite"
                          type={selectedUsers.includes(userItem._id) ? 'primary' : 'default'}
                          icon={selectedUsers.includes(userItem._id) ? <CheckOutlined /> : <UserAddOutlined />}
                          size="small"
                          onClick={() => toggleUserSelection(userItem._id)}
                        >
                          {selectedUsers.includes(userItem._id) ? '已选择' : '选择'}
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar src={userItem.avatar} />}
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Text strong>{userItem.username}</Text>
                            {userItem.isOnline && (
                              <Tag color="green">在线</Tag>
                            )}
                          </div>
                        }
                        description={userItem.email}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="未找到相关用户" />
              )
            ) : (
              <Empty description="请输入用户名或邮箱搜索用户" />
            )}
          </div>

          {/* 邀请按钮 */}
          <div style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<UserAddOutlined />}
              onClick={inviteUsers}
              loading={inviting}
              disabled={selectedUsers.length === 0}
            >
              邀请 {selectedUsers.length} 位用户加入
            </Button>
            <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
              注意：被邀请的用户需要同意才能加入群聊
            </Text>
          </div>
        </Card>
      </div>
    </>
  );
}