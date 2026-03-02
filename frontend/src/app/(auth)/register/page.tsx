// app/(auth)/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Form, Input, Button, Checkbox, App } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';

type RegisterFormValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
};

export default function RegisterPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const router = useRouter();

  const onFinish = async (values: RegisterFormValues) => {
    if (values.password !== values.confirmPassword) {
      console.log('两次输入的密码不一致！');
      return;
    }
    if (!values.agreeToTerms) {
      console.log('请阅读并同意服务条款');
      return;
    }

    setLoading(true);
    const result = await register({
      username: values.username,
      email: values.email,
      password: values.password,
    });
    setLoading(false);

    if (result.success) {
      router.push('/chat');
    } else {
      console.log(result.message || '注册失败')
    }
  };

  return (
    <>
      <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>创建新账户</h2>
      <Form
        form={form}
        name="register"
        onFinish={onFinish}
        layout="vertical"
        requiredMark={false}
      >
        {/* 表单内容保持不变 */}
        <Form.Item<RegisterFormValues>
          name="username"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' },
            { max: 20, message: '用户名不能超过20个字符' },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="用户名"
            size="large"
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item<RegisterFormValues>
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="邮箱地址"
            size="large"
            autoComplete="email"
          />
        </Form.Item>

        <Form.Item<RegisterFormValues>
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少6个字符' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="密码"
            size="large"
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item<RegisterFormValues>
          name="confirmPassword"
          rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致！'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="确认密码"
            size="large"
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item<RegisterFormValues>
          name="agreeToTerms"
          valuePropName="checked"
          rules={[{ required: true, message: '请阅读并同意服务条款' }]}
        >
          <Checkbox>
            我已阅读并同意 <Link href="/terms" target="_blank">服务条款</Link>
          </Checkbox>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
          >
            注册
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        已有账户？ <Link href="/login">立即登录</Link>
      </div>
    </>
  );
}