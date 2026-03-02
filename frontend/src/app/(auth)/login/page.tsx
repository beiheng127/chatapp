//app/(auth)/login/page.tsx
'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, Divider, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

type LoginFormValues = {
  email: string;
  password: string;
  remember: boolean;
};

export default function LoginPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { login } = useAuthStore();

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    setErrorDetail(null);
    setLoginSuccess(false);
    
    try {
      const result = await login(values.email, values.password);
      console.log('登录结果:', result);
      
      if (result.success) {
        console.log('登录成功！等待跳转...');
        setLoginSuccess(true);
      } else {
        setErrorDetail(result.message || '未知错误');
      }
    } catch (error: any) {
      console.error('登录错误:', error);
      const errorMsg = error.message || '未知错误';
      setErrorDetail(`错误详情: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>欢迎回来</h2>
        <div style={{ color: '#666', fontSize: '14px' }}>请输入您的账号密码登录</div>
      </div>

      {loginSuccess && (
        <Alert
          message="登录成功"
          description="正在跳转到聊天页面..."
          type="success"
          showIcon
          style={{ marginBottom: '20px' }}
        />
      )}

      {errorDetail && (
        <Alert
          message="登录失败"
          description={errorDetail}
          type="error"
          showIcon
          style={{ marginBottom: '20px' }}
        />
      )}

      <Form
        form={form}
        name="login"
        onFinish={onFinish}
        layout="vertical"
        requiredMark={false}
        initialValues={{ remember: true }}
        disabled={loading}
      >
        <Form.Item<LoginFormValues>
          name="email"
          rules={[
            { required: true, message: '请输入邮箱地址' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input
            prefix={<MailOutlined style={{ color: '#999' }} />}
            placeholder="邮箱地址"
            size="large"
            autoComplete="email"
          />
        </Form.Item>

        <Form.Item<LoginFormValues>
          name="password"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#999' }} />}
            placeholder="密码"
            size="large"
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item<LoginFormValues> name="remember" valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Checkbox disabled={loading}>记住我</Checkbox>
            <Link href="/forgot-password" style={{ fontSize: '14px' }}>
              忘记密码？
            </Link>
          </div>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            style={{ height: '48px', fontSize: '16px' }}
          >
            {loading ? '登录中...' : '登录'}
          </Button>
        </Form.Item>
      </Form>

      <Divider plain>或</Divider>

      <div style={{ textAlign: 'center' }}>
        还没有账号？{' '}
        <Link href="/register" style={{ fontWeight: '500', color: '#1890ff' }}>
          立即注册
        </Link>
      </div>

      {/* 调试信息（开发环境显示） */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#999' }}>
          <div>API地址: {process.env.NEXT_PUBLIC_API_URL}</div>
          <div>调试模式: 开启</div>
          <div>状态: {loading ? '登录中...' : loginSuccess ? '登录成功' : '等待登录'}</div>
        </div>
      )}
    </>
  );
}