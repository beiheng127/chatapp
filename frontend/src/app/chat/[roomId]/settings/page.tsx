// app/(chat)/rooms/[roomId]/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Switch,
  message,
  Skeleton,
  Modal,
  Divider,
  Avatar,
  Upload,
  Tabs,
  List,
  Tag,
  Space,
  Dropdown,
  MenuProps,
  InputNumber,
  Badge,
  Empty
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  LockOutlined,
  TeamOutlined,
  UploadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  CrownOutlined,
  UserAddOutlined,
  SettingOutlined,
  MoreOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { roomService, type Room, type RoomMember } from '@/services/roomService';
import { userService, type UserProfile } from '@/services/userService';
import type { UploadChangeParam, UploadFile, RcFile } from 'antd/es/upload';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { confirm } = Modal;

// 定义上传响应类型
interface UploadSuccessResponse {
  success: boolean;
  message?: string;
  data?: {
    avatarUrl: string;
    roomId: string;
  };
}

export default function RoomSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState('general');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [members, setMembers] = useState<RoomMember[]>([]);

  // 加载群聊详情
  const loadRoomDetails = async () => {
    try {
      const result = await roomService.getRoomDetails(roomId);
      if (result.success && result.data) {
        const roomData = result.data;
        setRoom(roomData);
        setMembers(roomData.members || []);
        
        // 设置表单初始值
        form.setFieldsValue({
          name: roomData.name,
          description: roomData.description,
          isPrivate: roomData.isPrivate,
          maxMembers: roomData.maxMembers,
        });
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

  // 保存基本设置
  const handleSaveSettings = async (values: any) => {
    setSaving(true);
    try {
      const result = await roomService.updateRoom(roomId, {
        name: values.name,
        description: values.description,
        isPrivate: values.isPrivate,
        maxMembers: values.maxMembers,
      });

      if (result.success) {
        messageApi.success('群聊设置已保存');
        await loadRoomDetails();
      } else {
        messageApi.error(result.message || '保存失败');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      messageApi.error('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  // 头像上传处理
  const handleAvatarChange = async (info: UploadChangeParam<UploadFile<UploadSuccessResponse>>) => {
    const { file } = info;
    
    if (file.status === 'uploading') {
      setAvatarLoading(true);
      return;
    }

    if (file.status === 'done') {
      try {
        const uploadResponse = file.response as UploadSuccessResponse;
        if (uploadResponse.success && uploadResponse.data?.avatarUrl) {
          const newAvatarUrl = uploadResponse.data.avatarUrl;
          
          // 更新本地状态
          setRoom(prev => prev ? { ...prev, avatar: newAvatarUrl } : null);
          
          // 发送消息通知
          messageApi.success('群聊头像更新成功');
        } else {
          messageApi.error(uploadResponse?.message || '头像上传失败');
        }
      } catch (error) {
        console.error('头像上传失败:', error);
        const errorMsg = error instanceof Error ? error.message : '头像上传失败';
        messageApi.error(errorMsg);
      } finally {
        setAvatarLoading(false);
      }
    }

    if (file.status === 'error') {
      setAvatarLoading(false);
      messageApi.error('头像上传失败');
    }
  };

  // 自定义头像上传请求
  const customAvatarUploadRequest = async (options: any) => {
    if (!roomId || !user) {
      options.onError?.(new Error('未登录或房间不存在'), options.file as unknown as RcFile, {});
      return;
    }

    try {
      const result = await roomService.uploadRoomAvatar(roomId, options.file as unknown as File);
      
      if (result.success) {
        const uploadResponse: UploadSuccessResponse = {
          success: true,
          data: result.data ? { avatarUrl: result.data.avatarUrl, roomId: result.data.roomId } : undefined,
          message: result.message
        };
        options.onSuccess?.(uploadResponse, options.file as unknown as RcFile, {});
      } else {
        options.onError?.(new Error(result.message || '上传失败'), options.file as unknown as RcFile, {});
      }
    } catch (error) {
      options.onError?.(
        error instanceof Error ? error : new Error('头像上传失败'),
        options.file as unknown as RcFile,
        {}
      );
    }
  };

  // 搜索用户
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const result = await userService.searchUsers(query);
      if (result.success && result.data) {
        // 过滤掉已经是群成员的用户
        const memberIds = new Set(members.map(m => m._id));
        const filteredUsers = result.data.filter(u => !memberIds.has(u._id));
        setSearchResults(filteredUsers);
      }
    } catch (error) {
      console.error('搜索用户失败:', error);
      messageApi.error('搜索用户失败');
    } finally {
      setSearchLoading(false);
    }
  };

  // 邀请用户加入群聊
  const handleInviteUsers = async () => {
    if (selectedUsers.length === 0) {
      messageApi.warning('请选择要邀请的用户');
      return;
    }

    try {
      const result = await roomService.inviteToRoom(roomId, selectedUsers);
      if (result.success) {
        messageApi.success(`成功邀请 ${result.data?.invitedCount || 0} 位用户`);
        setInviteModalVisible(false);
        setSelectedUsers([]);
        await loadRoomDetails(); // 重新加载群聊详情
      } else {
        messageApi.error(result.message || '邀请失败');
      }
    } catch (error) {
      console.error('邀请用户失败:', error);
      messageApi.error('邀请用户失败');
    }
  };

  // 移除群成员
  const handleRemoveMember = (memberId: string, memberName: string) => {
    confirm({
      title: '确认移除成员',
      icon: <ExclamationCircleOutlined />,
      content: `确定要将 ${memberName} 移除出群聊吗？`,
      okText: '确定移除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await roomService.removeMember(roomId, memberId);
          if (result.success) {
            messageApi.success('成员已移除');
            await loadRoomDetails();
          } else {
            messageApi.error(result.message || '移除失败');
          }
        } catch (error) {
          console.error('移除成员失败:', error);
          messageApi.error('移除成员失败');
        }
      },
    });
  };

  // 设置/取消管理员
  const handleToggleAdmin = async (memberId: string, memberName: string, isCurrentlyAdmin: boolean) => {
    const action = isCurrentlyAdmin ? '取消管理员' : '设为管理员';
    
    confirm({
      title: `确认${action}`,
      icon: <ExclamationCircleOutlined />,
      content: `确定要将 ${memberName} ${action}吗？`,
      okText: `确定${action}`,
      okType: 'primary',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await roomService.toggleAdmin(roomId, memberId, !isCurrentlyAdmin);
          if (result.success) {
            messageApi.success(`${action}成功`);
            await loadRoomDetails();
          } else {
            messageApi.error(result.message || `${action}失败`);
          }
        } catch (error) {
          console.error(`${action}失败:`, error);
          messageApi.error(`${action}失败`);
        }
      },
    });
  };

  // 离开群聊
  const handleLeaveRoom = () => {
    confirm({
      title: '确认退出群聊',
      icon: <ExclamationCircleOutlined />,
      content: '确定要退出这个群聊吗？退出后将无法接收该群聊的消息。',
      okText: '确定退出',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setLeaving(true);
        try {
          const result = await roomService.leaveRoom(roomId);
          if (result.success) {
            messageApi.success('已退出群聊');
            router.push('/chat/rooms');
          } else {
            messageApi.error(result.message || '退出失败');
          }
        } catch (error) {
          console.error('退出群聊失败:', error);
          messageApi.error('退出群聊失败');
        } finally {
          setLeaving(false);
        }
      },
    });
  };

  // 解散群聊（仅创建者）
  const handleDeleteRoom = () => {
    confirm({
      title: '确认解散群聊',
      icon: <ExclamationCircleOutlined />,
      content: '确定要解散这个群聊吗？此操作不可恢复，所有消息将被删除。',
      okText: '确定解散',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await roomService.deleteRoom(roomId);
          if (result.success) {
            messageApi.success(result.message || '群聊已解散');
            router.push('/chat/rooms');
          } else {
            messageApi.error(result.message || '解散失败');
          }
        } catch (error) {
          console.error('解散群聊失败:', error);
          messageApi.error('解散群聊失败');
        }
      },
    });
  };

  // 权限检查
  const isAdmin = room?.adminMembers?.some(admin => admin._id === user?.id) || room?.creator._id === user?.id;
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

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#faad14', marginBottom: '16px' }} />
            <Title level={3}>权限不足</Title>
            <Text type="secondary">只有管理员可以修改群聊设置</Text>
            <div style={{ marginTop: '24px' }}>
              <Button onClick={() => router.push(`/chat/${roomId}`)}>
                返回聊天
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // 成员操作菜单
  const getMemberActions = (member: RoomMember) => {
    const items: MenuProps['items'] = [];
    
    if (user?.id !== member._id) {
      const isTargetAdmin = room.adminMembers?.some(admin => admin._id === member._id);
      // 可以移除成员的条件：(我是群主) OR (我是管理员且目标不是管理员)
      const canRemove = isCreator || (isAdmin && !isTargetAdmin);

      // 移除成员（不能移除创建者）
      if (member._id !== room.creator._id && canRemove) {
        items.push({
          key: 'remove',
          label: '移除成员',
          danger: true,
          icon: <DeleteOutlined />,
          onClick: () => handleRemoveMember(member._id, member.username)
        });
      }
      
      // 设置/取消管理员（只能由创建者操作，且不能对创建者自己操作）
      if (isCreator && member._id !== room.creator._id) {
        const isMemberAdmin = room.adminMembers?.some(admin => admin._id === member._id);
        items.push({
          key: 'toggleAdmin',
          label: isMemberAdmin ? '取消管理员' : '设为管理员',
          icon: <CrownOutlined />,
          onClick: () => handleToggleAdmin(member._id, member.username, isMemberAdmin)
        });
      }
    }
    
    return items;
  };

  return (
    <>
      {contextHolder}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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

        <Card>
          {/* 顶部信息 */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Avatar
                size={120}
                src={room.avatar}
                icon={<TeamOutlined />}
                style={{ 
                  backgroundColor: room.isPrivate ? '#ff4d4f' : '#1890ff',
                  marginBottom: '16px',
                  border: '4px solid #fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              />
              <Upload
                showUploadList={false}
                onChange={handleAvatarChange}
                customRequest={customAvatarUploadRequest}
                beforeUpload={(file: RcFile) => {
                  const isImg = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
                  const isLt2M = file.size / 1024 / 1024 < 2;
                  if (!isImg) {
                    messageApi.error('仅支持JPG/PNG/WEBP格式');
                    return false;
                  }
                  if (!isLt2M) {
                    messageApi.error('图片不能超过2MB');
                    return false;
                  }
                  return true;
                }}
                accept="image/jpeg,image/png,image/webp"
              >
                <Button
                  type="primary"
                  shape="circle"
                  icon={<UploadOutlined />}
                  size="small"
                  loading={avatarLoading}
                  style={{ 
                    position: 'absolute', 
                    bottom: 10, 
                    right: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                />
              </Upload>
            </div>
            
            <Title level={2} style={{ marginBottom: '8px' }}>{room.name}</Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              {room.description || '暂无描述'}
            </Text>
            <div style={{ marginTop: '12px' }}>
              <Tag color={room.isPrivate ? "red" : "blue"}>
                {room.isPrivate ? "私密群聊" : "公开群聊"}
              </Tag>
              <Tag color="green">
                {room.memberCount || room.members?.length || 0} 位成员
              </Tag>
              {room.type === 'channel' && <Tag color="orange">频道</Tag>}
            </div>
          </div>

          {/* 标签页 */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'general',
                label: '基本设置',
                icon: <SettingOutlined />,
                children: (
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSaveSettings}
                    style={{ maxWidth: '600px', margin: '0 auto' }}
                  >
                    <Form.Item
                      label="群聊名称"
                      name="name"
                      rules={[
                        { required: true, message: '请输入群聊名称' },
                        { min: 3, max: 30, message: '名称长度在3-30个字符之间' },
                      ]}
                    >
                      <Input 
                        prefix={<EditOutlined />}
                        placeholder="请输入群聊名称" 
                      />
                    </Form.Item>

                    <Form.Item
                      label="群聊描述"
                      name="description"
                      rules={[{ max: 200, message: '描述不能超过200个字符' }]}
                    >
                      <TextArea
                        rows={3}
                        placeholder="请输入群聊描述"
                        maxLength={200}
                        showCount
                      />
                    </Form.Item>

                    <Form.Item
                      label="最大成员数"
                      name="maxMembers"
                      help="设置群聊最大成员数限制"
                    >
                      <InputNumber
                        min={2}
                        max={5000}
                        style={{ width: '100%' }}
                        placeholder="请输入最大成员数"
                      />
                    </Form.Item>

                    <Form.Item
                      label="隐私设置"
                      name="isPrivate"
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Switch 
                          checkedChildren={<LockOutlined />} 
                          unCheckedChildren={<TeamOutlined />}
                          checked={form.getFieldValue('isPrivate')}
                          onChange={(checked) => {form.setFieldsValue({ isPrivate: checked });}}                       
                        />
                        <div>
                          <Text strong>{form.getFieldValue('isPrivate') ? '私密群聊' : '公开群聊'}</Text>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {form.getFieldValue('isPrivate') 
                              ? '仅限邀请加入，不会出现在公开群聊列表' 
                              : '公开可见，所有用户都可以搜索并加入'}
                          </div>
                        </div>
                      </div>
                    </Form.Item>

                    <Divider />

                    <div style={{ textAlign: 'center' }}>
                      <Button
                        type="primary"
                        size="large"
                        icon={<SaveOutlined />}
                        htmlType="submit"
                        loading={saving}
                        style={{ minWidth: '200px' }}
                      >
                        保存设置
                      </Button>
                    </div>
                  </Form>
                )
              },
              {
                key: 'members',
                label: '成员管理',
                icon: <TeamOutlined />,
                children: (
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '24px' 
                    }}>
                      <Title level={4} style={{ margin: 0 }}>
                        群成员 ({members.length})
                      </Title>
                      <Button
                        type="primary"
                        icon={<UserAddOutlined />}
                        onClick={() => setInviteModalVisible(true)}
                      >
                        邀请成员
                      </Button>
                    </div>

                    <List
                      dataSource={members}
                      renderItem={(member) => {
                        const isCreatorMember = member._id === room.creator._id;
                        const isAdminMember = room.adminMembers?.some(admin => admin._id === member._id);
                        const isSelf = member._id === user?.id;
                        
                        return (
                          <List.Item
                            actions={
                              !isSelf && isAdmin ? [
                                <Dropdown 
                                  key="actions" 
                                  menu={{ items: getMemberActions(member) }} 
                                  placement="bottomRight"
                                >
                                  <Button type="text" icon={<MoreOutlined />} />
                                </Dropdown>
                              ] : []
                            }
                          >
                            <List.Item.Meta
                              avatar={
                                <Badge 
                                  dot={member.isOnline} 
                                  color="green" 
                                  offset={[-2, 32]}
                                >
                                  <Avatar 
                                    src={member.avatar} 
                                    icon={<UserOutlined />}
                                    size="large"
                                  />
                                </Badge>
                              }
                              title={
                                <Space>
                                  <Text strong>{member.username}</Text>
                                  {isCreatorMember && (
                                    <Tag icon={<CrownOutlined />} color="gold">
                                      群主
                                    </Tag>
                                  )}
                                  {isAdminMember && !isCreatorMember && (
                                    <Tag icon={<SettingOutlined />} color="blue">
                                      管理员
                                    </Tag>
                                  )}
                                  {isSelf && <Tag color="green">自己</Tag>}
                                </Space>
                              }
                              description={
                                <Space direction="vertical" size={0}>
                                  <Text type="secondary">
                                    ID: {member._id}
                                  </Text>
                                  <Text type="secondary">
                                    状态: {member.isOnline ? '在线' : '离线'}
                                  </Text>
                                </Space>
                              }
                            />
                          </List.Item>
                        );
                      }}
                      locale={{ emptyText: '暂无成员' }}
                    />
                  </div>
                )
              },
              {
                key: 'danger',
                label: '危险操作',
                icon: <ExclamationCircleOutlined />,
                children: (
                  <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <Card title="退出群聊" type="inner" style={{ marginBottom: '24px' }}>
                      <div style={{ marginBottom: '16px' }}>
                        <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                          退出群聊
                        </Text>
                        <Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>
                          退出后将不再接收该群聊的消息，但可以重新加入（如果是公开群聊）
                        </Text>
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={handleLeaveRoom}
                          loading={leaving}
                        >
                          退出群聊
                        </Button>
                      </div>
                    </Card>

                    {isCreator && (
                      <Card title="解散群聊" type="inner">
                        <div style={{ marginBottom: '16px' }}>
                          <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                            解散群聊
                          </Text>
                          <Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>
                            此操作将永久删除群聊，所有消息和历史记录将无法恢复
                          </Text>
                          <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={handleDeleteRoom}
                          >
                            解散群聊
                          </Button>
                        </div>
                      </Card>
                    )}
                  </div>
                )
              }
            ]}
          />
        </Card>
      </div>

      {/* 邀请成员模态框 */}
      <Modal
        title="邀请成员"
        open={inviteModalVisible}
        onCancel={() => {
          setInviteModalVisible(false);
          setSelectedUsers([]);
          setSearchResults([]);
        }}
        footer={[
          <Button key="cancel" onClick={() => setInviteModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="invite" 
            type="primary" 
            onClick={handleInviteUsers}
            disabled={selectedUsers.length === 0}
          >
            邀请 ({selectedUsers.length})
          </Button>,
        ]}
        width={600}
      >
        <div style={{ marginBottom: '16px' }}>
          <Input.Search
            placeholder="搜索用户（用户名或邮箱）"
            enterButton="搜索"
            size="large"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSearch={searchUsers}
            loading={searchLoading}
          />
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {searchLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Skeleton active />
            </div>
          ) : searchResults.length > 0 ? (
            <List
              dataSource={searchResults}
              renderItem={(userItem) => (
                <List.Item
                  actions={[
                    <Button
                      key="select"
                      type={selectedUsers.includes(userItem._id) ? 'primary' : 'default'}
                      onClick={() => {
                        if (selectedUsers.includes(userItem._id)) {
                          setSelectedUsers(prev => prev.filter(id => id !== userItem._id));
                        } else {
                          setSelectedUsers(prev => [...prev, userItem._id]);
                        }
                      }}
                    >
                      {selectedUsers.includes(userItem._id) ? '已选择' : '选择'}
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar src={userItem.avatar} icon={<UserOutlined />} />}
                    title={<Text strong>{userItem.username}</Text>}
                    description={
                      <div>
                        <div>{userItem.email}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          ID: {userItem._id}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: '搜索结果为空' }}
            />
          ) : (
            <Empty
              description={searchQuery ? '未找到匹配的用户' : '搜索用户以邀请'}
              style={{ padding: '40px 0' }}
            />
          )}
        </div>

        {selectedUsers.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f6ffed', borderRadius: '8px' }}>
            <Text strong>已选择 {selectedUsers.length} 位用户：</Text>
            <div style={{ marginTop: '8px' }}>
              {searchResults
                .filter(u => selectedUsers.includes(u._id))
                .map(user => (
                  <Tag key={user._id} style={{ marginBottom: '4px' }}>
                    {user.username}
                  </Tag>
                ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}