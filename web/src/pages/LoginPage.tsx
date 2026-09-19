/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 登录页：账号密码 / SSO / 二维码 三种登录方式
 * 左侧品牌展示区 + 右侧登录表单区，深海蓝渐变，移动端单栏。
 */
import { useCallback, useEffect, useState } from 'react';
import { App as AntdApp, Button, Checkbox, Form, Input, Tabs, Typography, Grid } from 'antd';
import type { TabsProps } from 'antd';
import {
  SafetyCertificateOutlined,
  LockOutlined,
  UserOutlined,
  SafetyOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  LoadingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';
import { fetchCaptcha, fetchQrCode, mockSsoLogin, ssoProviders, LoginError } from '@/mock/authMock';
import type { Captcha, QrCodeSession, QrCodeStatus } from '@/types/auth';

const { useBreakpoint } = Grid;

interface AccountForm {
  username: string;
  password: string;
  captcha: string;
  rememberMe: boolean;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = AntdApp.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const login = useAuthStore((s) => s.login);
  const [form] = Form.useForm<AccountForm>();
  const [submitting, setSubmitting] = useState(false);
  // 当前登录方式 Tab。二维码自动轮询仅在用户主动切到二维码 Tab 时启动，
  // 避免登录页一挂载就在后台模拟扫码并自动登录（否则退出/未登录拦截会被绕过）。
  const [activeTab, setActiveTab] = useState('account');

  const [captcha, setCaptcha] = useState<Captcha>({ captchaId: '', image: '' });
  const refreshCaptcha = useCallback(async () => {
    setCaptcha(await fetchCaptcha());
  }, []);
  useEffect(() => {
    refreshCaptcha();
  }, [refreshCaptcha]);

  /* ---------------- 账号密码登录 ---------------- */
  const onFinish = async (values: AccountForm) => {
    setSubmitting(true);
    try {
      await login({
        username: values.username,
        password: values.password,
        captcha: values.captcha,
        captchaId: captcha.captchaId,
        rememberMe: values.rememberMe,
      });
      message.success(`欢迎回来，${values.username}`);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/dashboard', { replace: true });
    } catch (e) {
      if (e instanceof LoginError) {
        if (e.code === 'CAPTCHA') {
          message.error(e.message);
        } else {
          message.error(e.message);
        }
      } else {
        message.error('登录失败，请稍后重试');
      }
      refreshCaptcha();
      form.setFieldValue('captcha', '');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- SSO 登录 ---------------- */
  const onSso = async (providerId: string) => {
    const { url } = await mockSsoLogin(providerId);
    // 演示环境不真的跳转外部 IdP，直接模拟登录成功
    message.success('正在跳转医院统一身份认证…');
    setTimeout(async () => {
      await useAuthStore
        .getState()
        .login({ username: 'admin', password: 'sso-mock', captcha: 'SSOOK', rememberMe: true });
      navigate('/dashboard', { replace: true });
    }, 600);
    void url;
  };

  /* ---------------- 二维码登录 ---------------- */
  const [qr, setQr] = useState<QrCodeSession | null>(null);
  const [qrPolling, setQrPolling] = useState(false);

  const startQr = useCallback(async () => {
    const session = await fetchQrCode();
    setQr(session);
    setQrPolling(true);
  }, []);

  // 仅在用户主动切换到二维码 Tab 时才发起会话与轮询（账号密码/SSO Tab 不触发）
  useEffect(() => {
    if (activeTab === 'qrcode') void startQr();
  }, [activeTab, startQr]);

  useEffect(() => {
    if (activeTab !== 'qrcode' || !qr || !qrPolling) return undefined;
    const t = window.setInterval(async () => {
      const remain = qr.expiresAt - Date.now();
      if (remain <= 0) {
        setQr((prev) => (prev ? { ...prev, status: 'expired' } : prev));
        setQrPolling(false);
        window.clearInterval(t);
        return;
      }
      // 模拟扫码状态机推进：随机在 waiting -> scanned -> confirmed
      setQr((prev) => {
        if (!prev) return prev;
        if (prev.status === 'waiting' && Math.random() > 0.7) return { ...prev, status: 'scanned' };
        if (prev.status === 'scanned' && Math.random() > 0.6) {
          setQrPolling(false);
          setTimeout(async () => {
            await useAuthStore
              .getState()
              .login({ username: 'admin', password: 'qr-mock', captcha: 'QROK', rememberMe: true });
            message.success('扫码登录成功');
            navigate('/dashboard', { replace: true });
          }, 500);
          return { ...prev, status: 'confirmed' };
        }
        return prev;
      });
    }, 2500);
    return () => window.clearInterval(t);
  }, [qr, qrPolling, activeTab, message, navigate]);

  const qrStatusText: Record<
    QrCodeStatus,
    { text: string; type: 'info' | 'warning' | 'success' | 'error' }
  > = {
    waiting: { text: '请使用 微信 / 企业微信 / 钉钉 扫码登录', type: 'info' },
    scanned: { text: '已扫码，请在手机上确认登录', type: 'warning' },
    confirmed: { text: '登录成功，正在跳转…', type: 'success' },
    expired: { text: '二维码已过期，请点击刷新', type: 'error' },
  };

  /* ---------------- Tabs ---------------- */
  const accountTab = (
    <Form<AccountForm>
      form={form}
      layout="vertical"
      onFinish={onFinish}
      requiredMark={false}
      initialValues={{ username: 'admin', password: 'Jianlan@2026', rememberMe: true }}
    >
      <Form.Item name="username" rules={[{ required: true, message: '请输入工号 / 用户名' }]}>
        <Input
          size="large"
          prefix={<UserOutlined />}
          placeholder="工号 / 用户名"
          autoComplete="username"
        />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
        <Input.Password
          size="large"
          prefix={<LockOutlined />}
          placeholder="密码"
          autoComplete="current-password"
        />
      </Form.Item>
      <div style={{ display: 'flex', gap: 8 }}>
        <Form.Item
          name="captcha"
          rules={[{ required: true, message: '请输入验证码' }]}
          style={{ flex: 1 }}
        >
          <Input size="large" prefix={<SafetyOutlined />} placeholder="图形验证码" maxLength={6} />
        </Form.Item>
        <Button
          size="large"
          onClick={refreshCaptcha}
          style={{ width: 120, padding: 0 }}
          icon={<ReloadOutlined />}
        >
          {captcha.image && (
            <img
              src={captcha.image}
              alt="验证码"
              style={{ width: 96, height: 40, objectFit: 'cover', borderRadius: 4, marginRight: 4 }}
            />
          )}
        </Button>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Form.Item name="rememberMe" valuePropName="checked" noStyle>
          <Checkbox>7 天内自动登录</Checkbox>
        </Form.Item>
        <Link to="/forgot-password" style={{ color: '#1890FF' }}>
          忘记密码？
        </Link>
      </div>
      <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
        {submitting ? '登录中…' : '登 录'}
      </Button>
    </Form>
  );

  const ssoTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
      <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
        支持医院统一身份认证（OAuth2 / SAML / CAS）
      </Typography.Paragraph>
      {ssoProviders.map((p) => (
        <Button
          key={p.id}
          size="large"
          block
          icon={<SafetyCertificateOutlined />}
          onClick={() => onSso(p.id)}
          style={{ justifyContent: 'center' }}
        >
          {p.name}（{p.protocol}）
        </Button>
      ))}
    </div>
  );

  const qrTab = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '12px 0',
      }}
    >
      {qr && qr.status !== 'expired' ? (
        <img
          src={qr.image}
          alt="扫码登录"
          style={{ width: 180, height: 180, borderRadius: 12, border: '1px solid #e8ecf1' }}
        />
      ) : (
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: 12,
            border: '1px dashed #c8d0da',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <QrcodeOutlined style={{ fontSize: 40, color: '#8c8c8c' }} />
        </div>
      )}
      <div style={{ textAlign: 'center' }}>
        {qr?.status === 'confirmed' ? (
          <CheckCircleFilled style={{ color: '#52c41a', marginRight: 6 }} />
        ) : qr?.status === 'scanned' ? (
          <LoadingOutlined style={{ color: '#faad14', marginRight: 6 }} />
        ) : null}
        <Typography.Text
          type={qrStatusText[qr?.status ?? 'waiting'].type === 'error' ? 'danger' : 'secondary'}
        >
          {qrStatusText[qr?.status ?? 'waiting'].text}
        </Typography.Text>
      </div>
      {qr?.status === 'expired' && (
        <Button icon={<ReloadOutlined />} onClick={startQr}>
          刷新二维码
        </Button>
      )}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        扫码登录仅适用于已绑定企业微信 / 钉钉的医护人员
      </Typography.Text>
    </div>
  );

  const items: TabsProps['items'] = [
    { key: 'account', label: '账号密码登录', children: accountTab },
    { key: 'sso', label: 'SSO 登录', children: ssoTab },
    { key: 'qrcode', label: '二维码登录', children: qrTab },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #073a6b 0%, #0A4D8C 45%, #1a6bb8 100%)',
      }}
    >
      {/* 左侧品牌区 */}
      {!isMobile && (
        <div
          style={{
            flex: 1,
            color: '#fff',
            padding: '64px 56px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                健
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>健澜科技</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>数智医院智能体</div>
              </div>
            </div>
            <h1
              style={{
                color: '#fff',
                fontSize: 36,
                lineHeight: 1.35,
                marginTop: 64,
                fontWeight: 600,
              }}
            >
              AI 原生医院
              <br />
              让每一次诊疗更智能
            </h1>
            <p style={{ opacity: 0.85, marginTop: 20, fontSize: 15, maxWidth: 420 }}>
              融合临床数据、智能体与规则引擎，为医护提供工作台、患者 360、辅助决策与质控闭环。
            </p>
          </div>
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            © 2026 杭州健澜科技有限公司 · 医疗数据安全合规认证
          </div>
        </div>
      )}

      {/* 右侧表单区 */}
      <div
        style={{
          width: isMobile ? '100%' : 480,
          minWidth: isMobile ? '100%' : 480,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>
          {isMobile && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#0A4D8C' }}>
                健澜科技数智医院智能体
              </div>
            </div>
          )}
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            欢迎登录
          </Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            请使用工号或统一身份认证登录
          </Typography.Text>
          <Tabs items={items} centered activeKey={activeTab} onChange={setActiveTab} />
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
            演示账号：admin / 任意 6 位以上密码；验证码请按右侧图形输入（不区分大小写）
          </div>
        </div>
      </div>
    </div>
  );
}
