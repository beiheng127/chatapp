// app/(chat)/rooms/[roomId]/info/page.tsx
'use client';

import React,{ useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Avatar,
  Typography,
  Tag,
  List,
  Button,
  Skeleton,
  message,
  Descriptions,
  Badge
} from 'antd';
import {
  TeamOutlined,
  LockOutlined,
  SettingOutlined,
  ArrowLeftOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { roomService, type Room } from '@/services/roomService';

const { Title, Text } = Typography;

export default function RoomInfoPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  // 加载群聊详情
  const loadRoomDetails = async () => {
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
  };

  // 检查用户是否是管理员
  const isAdmin = room?.adminMembers?.some(admin => admin._id === user?.id);
  const isCreator = room?.creator._id === user?.id;

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
  }, [roomId]);

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

        {/* 群聊基本信息 */}
        <Card style={{ marginBottom: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Avatar
              size={120}
              src={room.avatar}
              icon={<TeamOutlined />}
              style={{ 
                backgroundColor: room.isPrivate ? '#ff4d4f' : '#1890ff',
                marginBottom: '16px'
              }}
            />
            <div style={{ marginBottom: '8px' }}>
              <Title level={3} style={{ margin: 0 }}>
                {room.name}
                {room.isPrivate && (
                  <LockOutlined style={{ color: '#ff4d4f', marginLeft: '8px' }} />
                )}
              </Title>
              <Text type="secondary">{room.type === 'group' ? '群聊' : '频道'}</Text>
            </div>
            
            {(isAdmin || isCreator) && (
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={() => router.push(`/chat/${roomId}/settings`)}
                style={{ marginTop: '12px' }}
              >
                群聊设置
              </Button>
            )}
          </div>

          <Descriptions bordered column={1}>
            <Descriptions.Item label="群聊描述">
              {room.description || '暂无描述'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(room.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="最近更新">
              {new Date(room.updatedAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="群聊状态">
              <Tag color={room.isPrivate ? 'red' : 'blue'}>
                {room.isPrivate ? '私密群聊' : '公开群聊'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="成员数量">
              {room.memberCount}/{room.maxMembers}
            </Descriptions.Item>
            <Descriptions.Item label="创建者">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Avatar size="small" src={room.creator.avatar} />
                <Text>
                  {room.creator.username}
                  {isCreator && <Tag color="gold" style={{ marginLeft: '4px' }}>你</Tag>}
                </Text>
              </div>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 管理员列表 */}
        <Card title="管理员" style={{ marginBottom: '24px' }}>
          <List
            dataSource={room.adminMembers || []}
            renderItem={(admin) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <div style={{ position: 'relative' }}>
                      <Avatar src={admin.avatar} />
                      {admin._id === room.creator._id && (
                        <Badge 
                          count={<CrownOutlined style={{ color: '#faad14' }} />}
                          style={{ 
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            backgroundColor: 'transparent'
                          }}
                        />
                      )}
                    </div>
                  }
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Text strong>{admin.username}</Text>
                      {admin._id === user?.id && <Tag color="blue">你</Tag>}
                      {admin._id === room.creator._id && <Tag color="gold">群主</Tag>}
                    </div>
                  }
                />
              </List.Item>
            )}
            locale={{ emptyText: '暂无管理员' }}
          />
        </Card>

        {/* 成员列表 */}
        <Card title={`群成员 (${room.members.length})`}>
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
            dataSource={room.members}
            renderItem={(member) => {
              const isAdmin = room.adminMembers?.some(admin => admin._id === member._id);
              const isCreator = room.creator._id === member._id;
              
              return (
                <List.Item>
                  <Card
                    size="small"
                    style={{ textAlign: 'center' }}
                    bodyStyle={{ padding: '12px' }}
                  >
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <Avatar size={64} src={member.avatar} />
                      {member.isOnline && (
                        <Badge 
                          dot 
                          color="green" 
                          style={{ 
                            position: 'absolute',
                            top: 2,
                            right: 2,
                          }}
                        />
                      )}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Text strong>{member.username}</Text>
                        {isCreator && (
                          <CrownOutlined style={{ color: '#faad14', fontSize: '12px' }} />
                        )}
                        {isAdmin && !isCreator && (
                          <Tag color="blue" >管理</Tag>
                        )}
                      </div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {member.isOnline ? '在线' : '离线'}
                      </Text>
                    </div>
                  </Card>
                </List.Item>
              );
            }}
          />
        </Card>
      </div>
    </>
  );
}