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
  message,
  Grid
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
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search, TextArea } = Input;
const { useBreakpoint } = Grid;

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
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 4px' : '0' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: isMobile ? '16px' : '24px',
          flexDirection: isMobile ? 'row' : 'row'
        }}>
          <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>聊天室</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowCreateModal(true)}
            size={isMobile ? 'middle' : 'large'}
          >
            {isMobile ? '创建' : '创建聊天室'}
          </Button>
        </div>

        <Card style={{ marginBottom: isMobile ? '16px' : '24px' }} styles={{ body: { padding: isMobile ? '12px' : '24px' } }}>
          <Search
            placeholder="搜索聊天室..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={() => mutatePublicRooms()}
            allowClear
            size={isMobile ? 'middle' : 'large'}
          />
        </Card>

        {/* 用户已加入的群聊 */}
        {rooms.length > 0 && (
          <>
            <Title level={isMobile ? 5 : 4} style={{ marginBottom: isMobile ? '12px' : '16px' }}>我的群聊</Title>
            <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}><Skeleton active /></div>
              ) : (
                <Row gutter={[16, 16]}>
                  {rooms.map((room: Room) => (
                    <Col key={room._id} xs={24} sm={12} md={12} lg={8} xl={6}>
                      <Card
                        hoverable
                        style={{ height: '100%' }}
                        styles={{ body: { padding: isMobile ? '12px' : '24px' } }}
                        actions={[
                          <Button 
                            key="chat" 
                            type="primary" 
                            icon={<MessageOutlined />}
                            onClick={() => router.push(`/chat/${room._id}`)}
                            size={isMobile ? 'middle' : 'middle'}
                          >
                            进入
                          </Button>,
                          <Button 
                            key="leave" 
                            danger 
                            size={isMobile ? 'middle' : 'small'}
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
                                size={isMobile ? 'default' : 'large'}
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
                              <Text strong style={{ color: 'var(--text-color)', fontSize: isMobile ? '15px' : '16px' }}>{room.name}</Text>
                              {room.isPrivate && <LockOutlined style={{ color: '#ff4d4f', fontSize: '14px' }} />}
                            </div>
                          }
                          description={
                            <div style={{ marginTop: '8px' }}>
                              <Text type="secondary" style={{ fontSize: isMobile ? '13px' : '14px', color: 'var(--text-secondary)' }}>
                                {room.description || '暂无描述'}
                              </Text>
                              
                              <Divider style={{ margin: isMobile ? '8px 0' : '12px 0', borderColor: 'var(--border-color)' }} />
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '11px' : '12px', color: 'var(--text-secondary)' }}>
                                <div>
                                  <UserAddOutlined /> {room.memberCount}/{room.maxMembers}
                                </div>
                                <div>
                                  {isMobile ? dayjs(room.createdAt).format('MM-DD') : new Date(room.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          }
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </div>
            <Divider style={{ margin: isMobile ? '16px 0' : '24px 0' }} />
          </>
        )}

        {/* 公开群聊 */}
        <Title level={isMobile ? 5 : 4} style={{ marginBottom: isMobile ? '12px' : '16px' }}>公开群聊</Title>
        <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}><Skeleton active /></div>
          ) : publicRooms.length > 0 ? (
            <Row gutter={[16, 16]}>
              {publicRooms.map((room: Room) => (
                <Col key={room._id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  <Card
                    hoverable
                    style={{ height: '100%' }}
                    styles={{ body: { padding: isMobile ? '12px' : '24px' } }}
                    actions={[
                      <Button 
                        key="join" 
                        type="primary" 
                        icon={<MessageOutlined />}
                        onClick={() => joinRoom(room._id)}
                        size={isMobile ? 'middle' : 'middle'}
                      >
                        加入
                      </Button>,
                      room.isPrivate && (
                        <LockOutlined key="lock" style={{ color: '#ff4d4f' }} />
                      ),
                    ]}
                  >
                    <Card.Meta
                      avatar={
                        <Avatar 
                          size={isMobile ? 'default' : 'large'}
                          src={room.avatar && !room.avatar.includes('default') ? room.avatar : undefined}
                          icon={<TeamOutlined />}
                          style={{ 
                            backgroundColor: room.isPrivate ? '#ff4d4f' : '#1890ff' 
                          }}
                        />
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ color: 'var(--text-color)', fontSize: isMobile ? '15px' : '16px' }}>{room.name}</Text>
                          {room.isPrivate && <LockOutlined style={{ color: '#ff4d4f', fontSize: '14px' }} />}
                        </div>
                      }
                      description={
                        <div style={{ marginTop: '8px' }}>
                          <Text type="secondary" style={{ fontSize: isMobile ? '13px' : '14px', color: 'var(--text-secondary)' }}>
                            {room.description || '暂无描述'}
                          </Text>
                          
                          <Divider style={{ margin: isMobile ? '8px 0' : '12px 0', borderColor: 'var(--border-color)' }} />
                          
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                            <Tag color="blue" style={{ fontSize: '11px' }}>{room.type === 'group' ? '群聊' : '频道'}</Tag>
                            {room.isPrivate && <Tag color="red" style={{ fontSize: '11px' }}>私密</Tag>}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '11px' : '12px', color: 'var(--text-secondary)' }}>
                            <div>
                              <UserAddOutlined /> {room.memberCount}/{room.maxMembers}
                            </div>
                            <div>
                              {isMobile ? dayjs(room.createdAt).format('MM-DD') : new Date(room.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Empty description="暂无聊天室" />
          )}
        </div>

        {/* 创建聊天室模态框 */}
        <Modal
          title="创建新聊天室"
          open={showCreateModal}
          onCancel={() => setShowCreateModal(false)}
          footer={null}
          width={isMobile ? '95%' : 600}
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

            <Row gutter={isMobile ? 0 : 16}>
              <Col span={isMobile ? 24 : 12}>
                <Form.Item
                  label="聊天室类型"
                  name="type"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag color="blue">群聊</Tag>
                    <Text type="secondary" style={{ fontSize: '12px' }}>多人聊天室</Text>
                  </div>
                </Form.Item>
              </Col>
              <Col span={isMobile ? 24 : 12}>
                <Form.Item
                  label="隐私设置"
                  name="isPrivate"
                  valuePropName="checked"
                >
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Switch checkedChildren="私密" unCheckedChildren="公开" onChange={(checked) => {form.setFieldsValue({ isPrivate: checked });}}/>
                      <Text strong>{form.getFieldValue('isPrivate') ? '私密' : '公开'}</Text>
                    </div>
                     <Text type="secondary" style={{ fontSize: '11px' }}>
                      {form.getFieldValue('isPrivate') 
                        ? '需要邀请加入' 
                        : '公开搜索并加入'}
                    </Text>
                  </div>
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: isMobile ? '12px 0' : '24px 0' }} />

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