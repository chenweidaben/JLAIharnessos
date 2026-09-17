/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 登录页
 */
import { Button, Card, Form, Input, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { loginApi } from '@/services/api/auth';
import { tokenStorage } from '@/utils/auth';
import { useUserStore } from '@/store/userStore';
import type { LoginRequest } from '@/types/user';

export default function Login() {
  const navigate = useNavigate();
  const setUser = useUserStore((s) => s.setUser);
  const [form] = Form.useForm<LoginRequest>();

  const onFinish = async (values: LoginRequest) => {
    try {
      const res = await loginApi(values);
      tokenStorage.set(res.tokens);
      setUser(res.user);
      message.success(`欢迎，${res.user.realName}`);
      navigate('/dashboard', { replace: true });
    } catch {
      message.error('登录失败，请检查账号');
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0A4D8C 0%, #1890FF 100%)' }}
    >
      <Card style={{ width: 400 }} bordered={false}>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-jl-primary text-xl font-bold text-white">
            健
          </div>
          <h1 className="m-0 text-xl font-semibold text-ink-primary">健澜科技数智医院智能体</h1>
          <p className="mt-1 mb-0 text-sm text-ink-secondary">AI 原生智慧医疗平台</p>
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
          <Button type="primary" htmlType="submit" block style={{ background: '#0A4D8C' }}>
            登 录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
