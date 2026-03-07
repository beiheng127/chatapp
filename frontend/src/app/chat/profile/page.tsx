// frontend/src/app/chat/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Form,
  Input,
  Button,
  Upload,
  Avatar,
  Typography,
  Row,
  Col,
  Divider,
  Tag,
  App
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  CameraOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import authService from '@/services/authService';
import { ChangePassword } from '@/components/auth/ChangePassword';
import { SessionManagement } from '@/components/auth/SessionManagement';
import type { 
  UploadChangeParam, 
  UploadFile, 
  RcFile
} from 'antd/es/upload'; // 导入正确的类型

// 统一 User 类型定义（对齐后端返回格式，解决 lastSeen 类型冲突）
interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: Date | string; // 兼容 string/Date 类型
  createdAt?: Date | string; // 兼容 string/Date 类型
  updatedAt?: Date | string;
}

// 扩展 authService 类型（避免类型断言）
declare module '@/services/authService' {
  interface UpdateProfileData {
    username?: string;
    bio?: string;
    avatar?: string;
  }
  
  export function updateProfile(data: UpdateProfileData): Promise<{
    success: boolean;
    message?: string;
    data?: { user: User };
  }>;
}

// 定义上传响应类型（对齐后端真实返回格式）
interface UploadSuccessResponse {
  success: boolean;
  message?: string;
  data?: {
    avatarUrl: string; // 后端返回的前端本地可访问URL
  };
}

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore() as {
    user: User | null;
    updateUser: (user: User) => void;
  };
  const { message } = App.useApp();
  const [form] = Form.useForm<Partial<User>>(); // 指定表单类型
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // 改为允许null

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    // 初始化表单（统一类型，避免 Date/string 冲突）
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      bio: user.bio || '',
    });
    
    // 头像：后端默认是'default-avatar.png'，这里拼接完整URL
    // 如果 user.avatar 有值则使用，否则设为 null
    if (user.avatar) {
      setAvatarUrl(user.avatar);
    } else {
      // 这里你可以设置一个默认头像，或者直接设为 null
      // 例如：const defaultAvatar = '/uploads/avatars/default-avatar.png';
      setAvatarUrl(null); // 使用 null 而不是空字符串
    }

  }, [user, router, form]);

  // 处理表单提交（使用精准类型，解决 Partial<User> 冲突）
  const handleSave = async (values: Partial<User>) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 仅传递允许更新的字段（避免传递 lastSeen 等只读字段）
      const updateData = {
        username: values.username,
        bio: values.bio,
        ...(avatarUrl !== user.avatar && { avatar: avatarUrl || undefined }),
      };
      
      const response = await authService.updateProfile(updateData);
      
      if (response.success && response.data?.user) {
        // 转换日期字符串为 Date 对象（统一类型）
        const normalizedUser: User = {
          ...response.data.user,
          lastSeen: response.data.user.lastSeen ? new Date(response.data.user.lastSeen) : undefined,
          createdAt: response.data.user.createdAt ? new Date(response.data.user.createdAt) : undefined,
        };
        updateUser(normalizedUser); // 更新本地store
        message.success('个人资料更新成功！');
      } else {
        message.error(response.message || '保存失败，请重试');
      }
    } catch (error) {
      console.error('更新失败:', error);
      const errorMsg = error instanceof Error ? error.message : '保存失败，请重试';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 修复类型：使用 Ant Design 的 UploadChangeParam 类型
  const handleAvatarChange = async (info: UploadChangeParam<UploadFile<UploadSuccessResponse>>) => {
    const { file } = info;
    
    if (file.status === 'uploading') {
      setAvatarLoading(true);
      return;
    }

    if (file.status === 'done') {
      try {
        if (!user) return;
        
        const uploadResponse = file.response as UploadSuccessResponse;
        if (uploadResponse.success) {
          // 确保 avatarUrl 不为空字符串
          const newAvatarUrl = uploadResponse.data?.avatarUrl || null;
          
          if (newAvatarUrl) {
            setAvatarUrl(newAvatarUrl);
            
            // 更新用户资料，将新头像URL保存到用户记录中
            const updateRes = await authService.updateProfile({ 
              avatar: newAvatarUrl 
            });
            
            if (updateRes.success && updateRes.data?.user) {
              const normalizedUser: User = {
                ...updateRes.data.user,
                lastSeen: updateRes.data.user.lastSeen ? new Date(updateRes.data.user.lastSeen) : undefined,
                createdAt: updateRes.data.user.createdAt ? new Date(updateRes.data.user.createdAt) : undefined,
              };
              updateUser(normalizedUser);
            }
          }
          message.success(uploadResponse.message || '头像上传成功');
        } else {
          message.error(uploadResponse?.message || '头像上传失败');
        }
      } catch (error) {
        console.error('头像上传失败:', error);
        const errorMsg = error instanceof Error ? error.message : '头像上传失败';
        message.error(errorMsg);
      } finally {
        setAvatarLoading(false);
      }
    }

    if (file.status === 'error') {
      setAvatarLoading(false);
      message.error('头像上传失败');
    }
  };

  // 修复类型：使用 Ant Design 的 RcFile 类型和正确的函数签名
  const beforeUpload = (file: RcFile) => {
    const isImg = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    const isLt2M = file.size / 1024 / 1024 < 2; // 修正大小计算
    
    if (!isImg) {
      message.error('仅支持JPG/PNG/WEBP格式');
      return false;
    }
    
    if (!isLt2M) {
      message.error('图片不能超过2MB');
      return false;
    }
    
    return true;
  };

  // 自定义上传请求 - 使用正确的类型
  const customUploadRequest = async (options: any) => {
    if (!user) {
      options.onError?.(new Error('用户未登录，无法上传头像'), options.file as unknown as RcFile, {});
      return;
    }

    try {
      const result = await authService.uploadAvatar(options.file as unknown as File);
      
      if (result.success) {
        // 构建符合 UploadSuccessResponse 接口的响应对象
        const uploadResponse: UploadSuccessResponse = {
          success: true,
          data: result.data ? { avatarUrl: result.data.avatarUrl } : undefined,
          message: result.message
        };
        options.onSuccess?.(uploadResponse, options.file as unknown as RcFile, {});
      } else {
        options.onError?.(new Error(result.message || '上传失败'), options.file as unknown as RcFile, {});
      }
    } catch (error) {
      console.error('customUploadRequest 错误:', error);
      options.onError?.(
        error instanceof Error ? error : new Error('头像上传失败'),
        options.file as unknown as RcFile,
        {}
      );
    }
  };


  // 处理头像显示 - 确保不会传递空字符串给 Avatar 组件
  const getAvatarSource = () => {
    // 如果 avatarUrl 存在且不为空字符串，则使用它
    // 否则返回 undefined，让 Avatar 组件显示 UserOutlined 图标
    return avatarUrl && avatarUrl.trim() !== '' ? avatarUrl : undefined;
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
      <Title level={2}>个人资料</Title>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  size={120}
                  src={getAvatarSource()} // 使用处理过的头像源
                  icon={<UserOutlined />}
                  style={{ marginBottom: '16px' }}
                />
                <Upload
                  showUploadList={false}
                  onChange={handleAvatarChange}
                  customRequest={customUploadRequest}
                  beforeUpload={beforeUpload}
                  accept="image/jpeg,image/png,image/webp"
                >
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<CameraOutlined />}
                    size="small"
                    loading={avatarLoading}
                    style={{ position: 'absolute', bottom: 0, right: 0 }}
                  />
                </Upload>
              </div>
              
              <Title level={4}>{user.username}</Title>
              <Text type="secondary">{user.email}</Text>
              
              <Divider />
              
              <div style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: '12px' }}>
                  <Text strong>用户ID:</Text>
                  <div style={{ color: '#666', fontSize: '14px' }}>{user.id}</div>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <Text strong>账号状态:</Text>
                  <div>
                    <Tag color={user.isOnline ? "green" : "orange"}>
                      {user.isOnline ? "在线" : "离线"}
                    </Tag>
                  </div>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <Text strong>最后活跃:</Text>
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    {user.lastSeen ? new Date(user.lastSeen).toLocaleString() : '未知'}
                  </div>
                </div>
                
                <div>
                  <Text strong>注册时间:</Text>
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card title="编辑资料">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              initialValues={{
                username: user.username,
                email: user.email,
                bio: user.bio || '',
              }}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="用户名"
                    name="username"
                    rules={[
                      { required: true, message: '请输入用户名' },
                      { min: 3, message: '用户名至少3个字符' },
                      { max: 30, message: '用户名不能超过30个字符' },
                      { pattern: /^[a-zA-Z0-9_]+$/, message: '仅支持字母、数字、下划线' },
                    ]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
                  </Form.Item>
                </Col>
                
                <Col xs={24} md={12}>
                  <Form.Item
                    label="邮箱"
                    name="email"
                    rules={[{ required: true, message: '请输入邮箱' }, { type: 'email' }]}
                  >
                    <Input prefix={<MailOutlined />} placeholder="请输入邮箱" disabled />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="个人简介"
                name="bio"
                rules={[{ max: 160, message: '简介不能超过160个字符' }]}
              >
                <TextArea rows={4} placeholder="介绍一下自己吧..." maxLength={160} showCount />
              </Form.Item>

              <Divider />

              <div style={{ textAlign: 'right' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<SaveOutlined />}
                >
                  保存更改
                </Button>
              </div>
            </Form>
          </Card>

          <ChangePassword />
          
          <SessionManagement />

          <Card title="危险区域" variant="borderless" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong type="danger">注销账号</Text>
                <div style={{ color: '#999', fontSize: '14px' }}>永久删除账号，操作不可恢复</div>
              </div>
              <Button type="primary" danger ghost onClick={() => message.warning('此操作不可恢复，请谨慎操作')}>注销账号</Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}