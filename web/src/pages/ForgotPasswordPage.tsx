/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 忘记密码 / 重置密码：三步式（身份验证 → 重置密码 → 完成）
 */
import { useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Button, Form, Input, Progress, Result, Steps, Typography } from 'antd';
import { LockOutlined, MailOutlined, MobileOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';

import { mockResetPassword, mockSendSms } from '@/mock/authMock';

interface IdentityForm {
  username: string;
  contact: string;
  code: string;
}

interface ResetForm {
  newPassword: string;
  confirmPassword: string;
}

function passwordStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (pwd.length >= 12) score += 1;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;
  if (!pwd) return { score: 0, label: '', color: '#e8ecf1' };
  if (score <= 2) return { score: 25, label: '弱', color: '#f5222d' };
  if (score <= 3) return { score: 60, label: '中', color: '#faad14' };
  return { score: 100, label: '强', color: '#52c41a' };
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [step, setStep] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [identity] = useState<IdentityForm>({ username: '', contact: '', code: '' });

  const [resetForm] = Form.useForm<ResetForm>();
  const newPwd = Form.useWatch('newPassword', resetForm) ?? '';
  const strength = useMemo(() => passwordStrength(newPwd), [newPwd]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  const sendCode = async () => {
    if (!identity.contact && !identity.username) {
      message.warning('请先填写用户名或手机号');
      return;
    }
    await mockSendSms(identity.contact || identity.username);
    message.success('验证码已发送（演示：任意 6 位数字）');
    setCountdown(60);
  };

  const onVerify = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    setStep(1);
  };

  const onReset = async (values: ResetForm) => {
    setSubmitting(true);
    try {
      await mockResetPassword(identity.username, '123456', values.newPassword);
      message.success('密码重置成功');
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e6f0fb 100%)',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: '100%',
          background: '#fff',
          borderRadius: 12,
          padding: 32,
          boxShadow: '0 8px 32px rgba(10,77,140,0.08)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Typography.Title level={3} style={{ color: '#0A4D8C', marginBottom: 0 }}>
            重置密码
          </Typography.Title>
          <Typography.Text type="secondary">请按步骤完成身份验证与密码重置</Typography.Text>
        </div>

        <Steps
          current={step}
          items={[{ title: '身份验证' }, { title: '重置密码' }, { title: '完成' }]}
          style={{ marginBottom: 32 }}
        />

        {step === 0 && (
          <Form layout="vertical" onFinish={onVerify} requiredMark={false}>
            <Form.Item
              label="工号 / 用户名"
              name="username"
              rules={[{ required: true, message: '请输入工号' }]}
            >
              <Input size="large" prefix={<UserOutlined />} placeholder="请输入工号" />
            </Form.Item>
            <Form.Item
              label="绑定手机号 / 邮箱"
              name="contact"
              rules={[{ required: true, message: '请输入手机号或邮箱' }]}
            >
              <Input size="large" prefix={<MobileOutlined />} placeholder="手机号或邮箱" />
            </Form.Item>
            <Form.Item label="验证码" required>
              <div style={{ display: 'flex', gap: 8 }}>
                <Form.Item
                  name="code"
                  noStyle
                  rules={[{ required: true, message: '请输入验证码' }]}
                >
                  <Input
                    size="large"
                    prefix={<MailOutlined />}
                    placeholder="6 位验证码"
                    style={{ flex: 1 }}
                  />
                </Form.Item>
                <Button size="large" onClick={sendCode} disabled={countdown > 0}>
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Button>
              </div>
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              下一步
            </Button>
          </Form>
        )}

        {step === 1 && (
          <Form<ResetForm>
            form={resetForm}
            layout="vertical"
            onFinish={onReset}
            requiredMark={false}
          >
            <Form.Item
              label="新密码"
              name="newPassword"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 8, max: 20, message: '密码长度需 8-20 位' },
                {
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,20}$/,
                  message: '需包含大小写字母、数字、特殊字符',
                },
              ]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="8-20 位，含大小写字母、数字、特殊字符"
              />
            </Form.Item>
            {newPwd && (
              <div style={{ marginBottom: 16 }}>
                <Progress
                  percent={strength.score}
                  strokeColor={strength.color}
                  size="small"
                  showInfo={false}
                />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  密码强度：{strength.label}
                </Typography.Text>
              </div>
            )}
            <Form.Item
              label="确认新密码"
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请再次输入新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password size="large" prefix={<LockOutlined />} placeholder="再次输入新密码" />
            </Form.Item>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="large" block onClick={() => setStep(0)}>
                上一步
              </Button>
              <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
                确认重置
              </Button>
            </div>
          </Form>
        )}

        {step === 2 && (
          <Result
            status="success"
            title="密码重置成功"
            subTitle="为保障账号安全，其他设备已自动下线，请使用新密码重新登录。"
            extra={
              <Button type="primary" onClick={() => navigate('/login', { replace: true })}>
                返回登录
              </Button>
            }
          />
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login" style={{ color: '#1890FF' }}>
            返回登录
          </Link>
        </div>
      </div>
    </div>
  );
}
