import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Row, Col, Typography } from 'antd';
import { LockOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

const { Text } = Typography;

export const ChangePassword: React.FC = () => {
  const [form] = Form.useForm();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 倒计时逻辑
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // 发送验证码
  const sendCode = async () => {
    if (!user?.email) {
      message.error('无法获取用户邮箱');
      return;
    }

    setSendingCode(true);
    try {
      const response = await authService.sendVerificationCode(user.email, 'change_password');
      if (response.success) {
        message.success('验证码已发送至您的邮箱');
        setCountdown(60); // 60秒倒计时
      } else {
        message.error(response.message || '发送失败');
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      message.error('发送验证码失败');
    } finally {
      setSendingCode(false);
    }
  };

  // 提交修改密码
  const onFinish = async (values: any) => {
    if (!user?.email) return;

    setLoading(true);
    try {
      const response = await authService.changePassword({
        email: user.email,
        code: values.code,
        newPassword: values.newPassword
      });

      if (response.success) {
        message.success('密码修改成功，请重新登录');
        form.resetFields();
        // 可选：强制登出
        // authService.logout();
        // window.location.href = '/login';
      } else {
        message.error(response.message || '修改失败');
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      message.error('修改密码失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="修改密码" bordered={false} style={{ marginTop: 24 }}>
      <Form
        form={form}
        name="change_password"
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item label="邮箱">
          <Input 
            prefix={<MailOutlined />} 
            value={user?.email} 
            disabled 
          />
        </Form.Item>

        <Form.Item
          name="code"
          label="验证码"
          rules={[{ required: true, message: '请输入邮箱验证码' }]}
        >
          <Row gutter={8}>
            <Col flex="auto">
              <Input 
                prefix={<SafetyCertificateOutlined />} 
                placeholder="请输入6位验证码" 
                maxLength={6}
              />
            </Col>
            <Col>
              <Button 
                onClick={sendCode} 
                disabled={sendingCode || countdown > 0}
                loading={sendingCode}
              >
                {countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}
              </Button>
            </Col>
          </Row>
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码长度不能少于6位' }
          ]}
        >
          <Input.Password 
            prefix={<LockOutlined />} 
            placeholder="请输入新密码" 
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="确认新密码"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password 
            prefix={<LockOutlined />} 
            placeholder="请再次输入新密码" 
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            确认修改
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
