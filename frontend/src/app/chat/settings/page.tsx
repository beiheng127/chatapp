// frontend/src/app/(chat)/settings/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Form,
  Switch,
  Select,
  Button,
  Typography,
  Divider,
  Radio,
  ColorPicker,
  message,
  Space,
  Row,
  Col,
  Input,
  Modal,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  BellOutlined,
  GlobalOutlined,
  SettingOutlined,
  DesktopOutlined,
  MoonOutlined,
  SunOutlined,
  MessageOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { settingsService, defaultSettings } from '@/services/settingsService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function SettingsPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  const { user } = useAuthStore();
  const {
    settings,
    loading,
    updateSettings,
    saveSettings,
    resetSettings,
    updateSetting,
  } = useSettingsStore();

  // 初始化表单
  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        theme: settings.theme,
        language: settings.language,
        fontSize: settings.fontSize,
        compactMode: settings.compactMode,
        colorScheme: settings.colorScheme,
        notificationEnabled: settings.notificationEnabled,
        notificationSound: settings.notificationSound,
        chatEnterToSend: settings.chatEnterToSend,
        privacyOnlineStatus: settings.privacyOnlineStatus,
      });
    }
  }, [settings, form]);

  // 处理保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      
      // 构建更新对象
      const updatedSettings = {
        theme: values.theme,
        language: values.language,
        fontSize: values.fontSize,
        compactMode: values.compactMode,
        colorScheme: values.colorScheme,
        notificationEnabled: values.notificationEnabled,
        notificationSound: values.notificationSound,
        chatEnterToSend: values.chatEnterToSend,
        privacyOnlineStatus: values.privacyOnlineStatus,
      };

      // 更新本地状态
      updateSettings(updatedSettings);
      
      // 保存到服务器
      const success = await saveSettings();
      
      if (success) {
        messageApi.success('设置已保存');
      } else {
        messageApi.error('保存设置失败，已保存到本地');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      messageApi.error('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  // 处理重置
  const handleReset = async () => {
    Modal.confirm({
      title: '重置设置',
      content: '确定要重置所有设置为默认值吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setResetting(true);
        try {
          const success = await resetSettings();
          
          if (success) {
            messageApi.success('设置已重置为默认值');
          } else {
            messageApi.error('重置设置失败');
          }
        } catch (error) {
          console.error('重置设置失败:', error);
          messageApi.error('重置设置失败');
        } finally {
          setResetting(false);
        }
      },
    });
  };

  // 立即应用主题更改
  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    updateSetting('theme', value);
    messageApi.success('主题已切换');
  };

  // 立即应用字体大小更改
  const handleFontSizeChange = (value: 'small' | 'medium' | 'large') => {
    updateSetting('fontSize', value);
    messageApi.success('字体大小已调整');
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  if (loading && !settings) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <SettingOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <Text type="secondary">加载设置中...</Text>
        </div>
      </div>
    );
  }

  const themeOptions = [
    {
      label: (
        <Space>
          <SunOutlined />
          浅色模式
        </Space>
      ),
      value: 'light',
      description: '适合白天使用',
    },
    {
      label: (
        <Space>
          <MoonOutlined />
          深色模式
        </Space>
      ),
      value: 'dark',
      description: '适合夜间使用',
    },
    {
      label: (
        <Space>
          <DesktopOutlined />
          跟随系统
        </Space>
      ),
      value: 'system',
      description: '自动匹配系统主题',
    },
  ];

  const fontSizeOptions = [
    { label: '小', value: 'small' },
    { label: '中', value: 'medium' },
    { label: '大', value: 'large' },
  ];

  return (
    <>
      {contextHolder}
      
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <Title level={2} style={{ marginBottom: 8 }}>
          <SettingOutlined /> 设置
        </Title>
        
        <Paragraph type="secondary" style={{ marginBottom: 32 }}>
          自定义您的聊天体验。设置会自动保存到您的账户，在任何设备上都能保持一致。
        </Paragraph>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          {/* 外观设置 */}
          <Card title="外观设置" style={{ marginBottom: 24 }} variant="borderless">
            <Row gutter={[24, 16]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="theme"
                  label="主题模式"
                >
                  <Radio.Group 
                    optionType="button"
                    buttonStyle="solid"
                    onChange={(e) => handleThemeChange(e.target.value)}
                  >
                    {themeOptions.map(option => (
                      <Radio.Button key={option.value} value={option.value}>
                        {option.label}
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </Form.Item>
                
                <Form.Item
                  name="fontSize"
                  label="字体大小"
                >
                  <Select onChange={handleFontSizeChange}>
                    {fontSizeOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} md={12}>
                <Form.Item
                  name="colorScheme"
                  label="主题颜色"
                >
                  <ColorPicker
                    showText
                    onChange={(color) => {
                      updateSetting('colorScheme', color.toHexString());
                    }}
                    presets={[
                      {
                        label: '推荐颜色',
                        colors: [
                          '#1890ff',
                          '#52c41a',
                          '#fa8c16',
                          '#f5222d',
                          '#722ed1',
                          '#13c2c2',
                          '#eb2f96',
                          '#fa541c',
                        ],
                      },
                    ]}
                  />
                </Form.Item>
                
                <Form.Item
                  name="compactMode"
                  valuePropName="checked"
                  label="布局选项"
                >
                  <Space orientation="vertical">
                    <Switch
                      checkedChildren="紧凑模式"
                      unCheckedChildren="常规模式"
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      减少元素间距，显示更多内容
                    </Text>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 聊天设置 */}
          <Card title="聊天设置" style={{ marginBottom: 24 }} variant="borderless">
            <Form.Item
              name="chatEnterToSend"
              valuePropName="checked"
              label={
                <Space>
                  <MessageOutlined />
                  消息发送方式
                </Space>
              }
            >
              <Switch
                checkedChildren="Enter发送消息"
                unCheckedChildren="Ctrl+Enter发送消息"
              />
            </Form.Item>
            
            <Text type="secondary" style={{ fontSize: 12, marginBottom: 16, display: 'block' }}>
              按Enter键发送消息，按Shift+Enter换行
            </Text>
          </Card>

          {/* 通知设置 */}
          <Card title="通知设置" style={{ marginBottom: 24 }} variant="borderless">
            <Form.Item
              name="notificationEnabled"
              valuePropName="checked"
              label={
                <Space>
                  <BellOutlined />
                  启用通知
                </Space>
              }
            >
              <Switch />
            </Form.Item>
            
            {settings?.notificationEnabled && (
              <>
                <Form.Item
                  name="notificationSound"
                  valuePropName="checked"
                  label="提示音"
                  style={{ marginLeft: 24 }}
                >
                  <Switch />
                </Form.Item>
              </>
            )}
          </Card>

          {/* 隐私设置 */}
          <Card title="隐私设置" style={{ marginBottom: 24 }} variant="borderless">
            <Form.Item
              name="privacyOnlineStatus"
              valuePropName="checked"
              label={
                <Space>
                  <LockOutlined />
                  在线状态
                </Space>
              }
            >
              <Switch
                checkedChildren="对所有人可见"
                unCheckedChildren="隐藏在线状态"
              />
            </Form.Item>
          </Card>

          {/* 语言和地区 */}
          <Card title="语言和地区" style={{ marginBottom: 32 }} variant="borderless">
            <Form.Item
              name="language"
              label={
                <Space>
                  <GlobalOutlined />
                  语言
                </Space>
              }
            >
              <Select>
                <Option value="zh-CN">简体中文</Option>
                <Option value="zh-TW">繁体中文</Option>
                <Option value="en-US">English</Option>
                <Option value="ja-JP">日本語</Option>
                <Option value="ko-KR">한국어</Option>
              </Select>
            </Form.Item>
          </Card>

          <Divider />

          {/* 操作按钮 */}
          <div style={{ 
            position: 'sticky', 
            bottom: 0, 
            background: 'white', 
            padding: '16px', 
            borderTop: '1px solid #f0f0f0',
            borderRadius: 8,
            boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
            marginTop: 24,
          }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Text type="secondary">
                  修改会立即应用到当前设备，保存后会在所有设备上同步
                </Text>
              </Col>
              <Col>
                <Space>
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={handleReset}
                    loading={resetting}
                  >
                    重置为默认
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<SaveOutlined />} 
                    htmlType="submit"
                    loading={saving}
                  >
                    保存设置
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>
        </Form>
      </div>
    </>
  );
}