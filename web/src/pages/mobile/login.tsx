/**
 * 健澜科技 jlmedaios - 移动护理护士登录（M16-A）
 * 复用现有 auth login（真实 BFF 签发 JWT）；大按钮、触摸友好、独立移动布局（无 PC 侧栏）。
 * 医疗安全：不生成伪造身份；失败透传后端真实原因，不假登录。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Alert, Typography } from 'antd';
import { Watermark } from 'antd';

import { useAuthStore } from '@/store/authStore';

const watermarkText = ['健澜科技', '移动护理', 'jlmedaios'];

export default function MobileLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ username: username.trim(), password });
      navigate('/m/patients', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试');
    }
  };

  return (
    <Watermark content={watermarkText}>
      <div
        style={{
          minHeight: '100vh',
          maxWidth: 480,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          padding: 24,
          background: '#f5f7fa',
        }}
      >
        <Card style={{ width: '100%' }}>
          <Typography.Title level={4} style={{ textAlign: 'center' }}>
            AI 移动护理执行端
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
            护士工号登录 · PDA 床旁闭环
          </Typography.Paragraph>
          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 12 }}>
              <Input
                data-testid="m-login-username"
                size="large"
                placeholder="护士工号（如 nurse_ma）"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Input.Password
                data-testid="m-login-password"
                size="large"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && (
              <Alert data-testid="m-login-error" type="error" showIcon style={{ marginBottom: 12 }} message={error} />
            )}
            <Button
              data-testid="m-login-submit"
              type="primary"
              size="large"
              htmlType="submit"
              block
              loading={loading}
            >
              登录床旁工作台
            </Button>
          </form>
        </Card>
      </div>
    </Watermark>
  );
}
