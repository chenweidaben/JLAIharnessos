/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 登录页 —— AI 原生未来医院操作系统
 */
import { Button, Card, Form, Input, message, Typography } from 'antd';
import { LockOutlined, UserOutlined, HeartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';
import { LoginError } from '@/types/auth';
import type { LoginRequest } from '@/types/user';

const { Title, Text } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form] = Form.useForm<LoginRequest>();

  const onFinish = async (values: LoginRequest) => {
    try {
      await login({
        username: values.username,
        password: values.password,
      });
      message.success('登录成功，欢迎回来');
      navigate('/dashboard', { replace: true });
    } catch (e) {
      message.error(e instanceof LoginError ? e.message : '登录失败，请检查账号');
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #052E5C 0%, #0A4D8C 45%, #1890FF 100%)',
      }}
    >
      {/* 背景装饰光晕 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 20% 50%, rgba(24,144,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(0,212,255,0.1) 0%, transparent 40%)',
        }}
      />
      {/* 网格线装饰 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <Card
        style={{
          width: 420,
          border: 'none',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.97)',
        }}
      >
        <div className="mb-8 text-center">
          {/* Logo */}
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #0A4D8C 0%, #1890FF 100%)',
              boxShadow: '0 8px 24px rgba(10,77,140,0.4)',
            }}
          >
            <HeartOutlined style={{ fontSize: 28 }} />
          </div>
          <Title level={3} style={{ marginBottom: 4, color: '#0A4D8C' }}>
            健澜科技 · jlmedaios
          </Title>
          <Text strong style={{ color: '#1890FF', fontSize: 15 }}>
            AI 原生未来医院操作系统
          </Text>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              微服务云原生 HIS·EMR 一体化 · 数智医院高质量发展新引擎
            </Text>
          </div>
        </div>

        <Form
          form={form}
          onFinish={onFinish}
          size="large"
          initialValues={{ username: 'doctor_chen', password: '123456' }}
        >
          <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input prefix={<UserOutlined />} placeholder="工号 / 账号" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            style={{
              background: 'linear-gradient(135deg, #0A4D8C 0%, #1890FF 100%)',
              border: 'none',
              fontWeight: 600,
              letterSpacing: 4,
            }}
          >
            登 录
          </Button>
        </Form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            © 2026 杭州健澜科技有限公司 · 医疗 AI 大模型及应用前沿实验室
          </Text>
        </div>
      </Card>
    </div>
  );
}
