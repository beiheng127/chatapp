// app/(chat)/rooms/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  List,
  Avatar,
  Typography,
  Tag,
  Button,
  Input,
  Modal,
  Form,
  Badge,
  Divider,
  Row,
  Col,
  Switch,
  message
} from 'antd';
import {
  TeamOutlined,
  SearchOutlined,
  PlusOutlined,
  LockOutlined,
  UserAddOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { roomService, type Room } from '@/services/roomService';
import useSWR from 'swr';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

interface CreateRoomForm {
  name: string;
  description?: string;
  isPrivate: boolean;
  type: 'group';
}

export default function ChatRoomsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchText, setSearchText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form] = Form.useForm();

  // 使用 SWR 加载用户加入的群聊
  const { data: userRoomsData, mutate: mutateUserRooms, isLoading: loadingUserRooms } = useSWR(
    user ? '/rooms/my-rooms' : null,
    () => roomService.getUserRooms().then(res => res.data || [])
  );

  // 使用 SWR 加载公开群聊
  const { data: publicRoomsData, mutate: mutatePublicRooms, isLoading: loadingPublicRooms } = useSWR(
    user ? ['/rooms/public', searchText] : null,
    () => roomService.getPublicRooms({ search: searchText }).then(res => res.data?.data || [])
  );

  const rooms = userRoomsData || [];
  const publicRooms = publicRoomsData || [];
  const loading = loadingUserRooms || loadingPublicRooms;

  // 创建群聊
  const handleCreateRoom = async (values: CreateRoomForm) => {
    try {
      const result = await roomService.createRoom({
        name: values.name,
        description: values.description,
        isPrivate: values.isPrivate,
        type: 'group',
      });
      
      if (result.success && result.data) {
        messageApi.success('聊天室创建成功！');
        setShowCreateModal(false);
        form.resetFields();
        
        // 使用 mutate 立即刷新数据
        mutateUserRooms();
        
        // 跳转到新创建的群聊
        router.push(`/chat/${result.data._id}`);
      } else {
        messageApi.error(result.message || '创建失败');
      }
    } catch (error) {
      console.error('创建群聊失败:', error);
      messageApi.error('创建失败，请重试');
    }
  };

  // 加入群聊
  const joinRoom = async (roomId: string) => {
    try {
      const result = await roomService.joinRoom(roomId);
      if (result.success) {
        messageApi.success('加入群聊成功！');
        // 重新加载群聊列表
        mutateUserRooms();
        mutatePublicRooms();
        // 跳转到群聊
        router.push(`/chat/${roomId}`);
      } else {
        messageApi.error(result.message || '加入失败');
      }
    } catch (error) {
      console.error('加入群聊失败:', error);
      messageApi.error('加入群聊失败');
    }
  };

  // 离开群聊
  const leaveRoom = async (roomId: string) => {
    try {
      const result = await roomService.leaveRoom(roomId);
      if (result.success) {
        messageApi.success('已退出群聊');
        // 重新加载群聊列表
        mutateUserRooms();
      } else {
        messageApi.error(result.message || '退出失败');
      }
    } catch (error) {
      console.error('退出群聊失败:', error);
      messageApi.error('退出群聊失败');
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <>
      {contextHolder}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={2}>聊天室</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowCreateModal(true)}
          >
            创建聊天室
          </Button>
        </div>

        <Card style={{ marginBottom: '24px' }}>
          <Search
            placeholder="搜索聊天室..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={() => mutatePublicRooms()}
            allowClear
            size="large"
          />
        </Card>

        {/* 用户已加入的群聊 */}
        {rooms.length > 0 && (
          <>
            <Title level={4} style={{ marginBottom: '16px' }}>我的群聊</Title>
            <List
              loading={loading}
              grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
              dataSource={rooms}
              renderItem={(room) => (
                <List.Item>
                  <Card
                    hoverable
                    style={{ height: '100%' }}
                    actions={[
                      <Button 
                        key="chat" 
                        type="primary" 
                        icon={<MessageOutlined />}
                        onClick={() => router.push(`/chat/${room._id}`)}
                      >
                        进入聊天
                      </Button>,
                      <Button 
                        key="leave" 
                        danger 
                        size="small"
                        onClick={() => leaveRoom(room._id)}
                      >
                        退出
                      </Button>,
                    ]}
                  >
                    <Card.Meta
                      avatar={
                        <Badge count={0} offset={[-10, 10]}>
                          <Avatar 
                            size="large" 
                            src={room.avatar && !room.avatar.includes('default') ? room.avatar : undefined}
                            icon={<TeamOutlined />}
                            style={{ 
                              backgroundColor: room.isPrivate ? '#ff4d4f' : '#1890ff' 
                            }}
                          />
                        </Badge>
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ color: 'var(--text-color)' }}>{room.name}</Text>
                          {room.isPrivate && <LockOutlined style={{ color: '#ff4d4f' }} />}
                        </div>
                      }
                      description={
                        <div style={{ marginTop: '8px' }}>
                          <Text type="secondary" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {room.description || '暂无描述'}
                          </Text>
                          
                          <Divider style={{ margin: '12px 0', borderColor: 'var(--border-color)' }} />
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <div>
                              <UserAddOutlined /> {room.memberCount}/{room.maxMembers}
                            </div>
                            <div>
                              创建于 {new Date(room.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </List.Item>
              )}
            />
            <Divider />
          </>
        )}

        {/* 公开群聊 */}
        <Title level={4} style={{ marginBottom: '16px' }}>公开群聊</Title>
        <List
          loading={loading}
          grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
          dataSource={publicRooms}
          renderItem={(room) => (
            <List.Item>
              <Card
                hoverable
                style={{ height: '100%' }}
                actions={[
                      <Button 
                        key="join" 
                        type="primary" 
                        icon={<MessageOutlined />}
                        onClick={() => joinRoom(room._id)}
                      >
                        加入聊天
                      </Button>,
                      room.isPrivate && (
                        <LockOutlined key="lock" style={{ color: '#ff4d4f' }} />
                      ),
                    ]}
                  >
                    <Card.Meta
                      avatar={
                        <Avatar 
                          size="large" 
                          src={room.avatar && !room.avatar.includes('default') ? room.avatar : undefined}
                          icon={<TeamOutlined />}
                          style={{ 
                            backgroundColor: room.isPrivate ? '#ff4d4f' : '#1890ff' 
                          }}
                        />
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ color: 'var(--text-color)' }}>{room.name}</Text>
                          {room.isPrivate && <LockOutlined style={{ color: '#ff4d4f' }} />}
                        </div>
                      }
                      description={
                        <div style={{ marginTop: '8px' }}>
                          <Text type="secondary" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {room.description || '暂无描述'}
                          </Text>
                          
                          <Divider style={{ margin: '12px 0', borderColor: 'var(--border-color)' }} />
                          
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                            <Tag color="blue">{room.type === 'group' ? '群聊' : '频道'}</Tag>
                            {room.isPrivate && <Tag color="red">私密</Tag>}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <div>
                              <UserAddOutlined /> {room.memberCount}/{room.maxMembers}
                            </div>
                            <div>
                              创建于 {new Date(room.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </List.Item>
              )}
          locale={{ emptyText: '暂无聊天室' }}
        />

        {/* 创建聊天室模态框 */}
        <Modal
          title="创建新聊天室"
          open={showCreateModal}
          onCancel={() => setShowCreateModal(false)}
          footer={null}
          width={600}
          destroyOnHidden
          maskClosable={false}
          centered
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateRoom}
            initialValues={{
              isPrivate: false,
              type: 'group',
            }}
          >
            <Form.Item
              label="聊天室名称"
              name="name"
              rules={[
                { required: true, message: '请输入聊天室名称' },
                { min: 3, max: 30, message: '名称长度在3-30个字符之间' },
              ]}
            >
              <Input placeholder="请输入聊天室名称" />
            </Form.Item>

            <Form.Item
              label="描述"
              name="description"
              rules={[{ max: 200, message: '描述不能超过200个字符' }]}
            >
              <TextArea
                rows={3}
                placeholder="请输入聊天室描述"
                maxLength={200}
                showCount
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="聊天室类型"
                  name="type"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag color="blue">群聊</Tag>
                    <Text type="secondary">多人聊天室</Text>
                  </div>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="隐私设置"
                  name="isPrivate"
                  valuePropName="checked"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Switch checkedChildren="私密" unCheckedChildren="公开" onChange={(checked) => {form.setFieldsValue({ isPrivate: checked });}}/>
                     <Text type="secondary">
                      {form.getFieldValue('isPrivate') 
                        ? '私密房间需要邀请才能加入' 
                        : '公开房间，所有用户都可以搜索并加入'}
                    </Text>
                  </div>
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <div style={{ textAlign: 'right' }}>
              <Button onClick={() => setShowCreateModal(false)} style={{ marginRight: '8px' }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建聊天室
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </>
  );
}