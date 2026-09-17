/**
 * 健澜科技杠OS - 多因素认证（MFA / TOTP）绑定与管理
 *
 * 流程：发起绑定（获得密钥与 otpauth 二维码）→ 验证器扫码 → 输入 6 位动态码确认 →
 *       一次性展示备份码（提示离线保存）→ 已启用；停用需再次校验动态码/备份码。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司.
 */
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import { CopyOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';

import PageContainer from '@/components/common/PageContainer';
import {
  confirmMfa,
  disableMfa,
  enrollMfa,
  getMfaStatus,
  type MfaEnroll,
} from '@/services/api/auth';

type Phase = 'loading' | 'disabled' | 'enroll' | 'enabled';

/**
 * 个人中心 - 安全设置中的 MFA 卡片。可独立使用（自带卡片边框）。
 */
export default function MfaSettings(): ReactElement {
  const { message } = AntdApp.useApp();
  const [phase, setPhase] = useState<Phase>('loading');
  const [remaining, setRemaining] = useState(0);
  const [enroll, setEnroll] = useState<MfaEnroll | null>(null);
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableToken, setDisableToken] = useState('');

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const s = await getMfaStatus();
      setRemaining(s.remainingBackupCodes);
      setPhase(s.enabled ? 'enabled' : 'disabled');
    } catch {
      setPhase('disabled');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startEnroll = async (): Promise<void> => {
    setBusy(true);
    try {
      setEnroll(await enrollMfa());
      setToken('');
      setPhase('enroll');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '发起绑定失败');
    } finally {
      setBusy(false);
    }
  };

  const doConfirm = async (): Promise<void> => {
    if (!/^\d{6}$/.test(token)) {
      message.warning('请输入验证器生成的 6 位动态码');
      return;
    }
    setBusy(true);
    try {
      const r = await confirmMfa(token);
      setBackupCodes(r.backupCodes);
      setEnroll(null);
      setPhase('enabled');
      setRemaining(r.backupCodes.length);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '动态码校验失败');
    } finally {
      setBusy(false);
    }
  };

  const copyAll = async (): Promise<void> => {
    if (!backupCodes) return;
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      message.success('备份码已复制，请离线妥善保存');
    } catch {
      message.warning('复制失败，请手动记录备份码');
    }
  };

  const doDisable = async (): Promise<void> => {
    setBusy(true);
    try {
      await disableMfa(disableToken.trim());
      message.success('已关闭多因素认证');
      setDisableOpen(false);
      setDisableToken('');
      await refresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '校验失败，无法停用');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title={
        <Space>
          <SafetyCertificateOutlined />
          多因素认证（MFA / TOTP）
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {phase === 'enabled' && (
        <>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="认证状态">
              <Tag color="success">已开启</Tag>
              <span style={{ marginLeft: 8, color: '#888' }}>
                登录与敏感操作需输入动态码
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="剩余备份码">{remaining} 个</Descriptions.Item>
          </Descriptions>
          <Space style={{ marginTop: 16 }}>
            <Button danger onClick={() => setDisableOpen(true)}>
              关闭 MFA
            </Button>
          </Space>
        </>
      )}

      {phase === 'disabled' && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="开启后，登录及处方、医嘱等敏感操作需要输入验证器动态码，可显著降低账号被盗用风险。"
          />
          <Button type="primary" loading={busy} onClick={startEnroll}>
            开始绑定
          </Button>
        </Space>
      )}

      {phase === 'enroll' && enroll && (
        <Row gutter={24} align="middle">
          <Col flex="none">
            <div
              style={{
                padding: 12,
                background: '#fff',
                border: '1px solid #eee',
                borderRadius: 8,
                display: 'inline-block',
              }}
            >
              <QRCodeSVG value={enroll.otpauthUri} size={168} />
            </div>
          </Col>
          <Col flex="auto">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                1. 使用 Google Authenticator、微软 Authenticator、钉钉等 TOTP 验证器扫码；
              </Typography.Paragraph>
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                2. 无法扫码时手动输入密钥：
                <Typography.Text code copyable>
                  {enroll.secret}
                </Typography.Text>
              </Typography.Paragraph>
              <Form layout="inline" style={{ marginTop: 8 }}>
                <Form.Item label="输入 6 位动态码">
                  <Input
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    style={{ width: 160 }}
                    onPressEnter={() => void doConfirm()}
                  />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button type="primary" loading={busy} onClick={() => void doConfirm()}>
                      确认绑定
                    </Button>
                    <Button
                      onClick={() => {
                        setPhase('disabled');
                        setEnroll(null);
                      }}
                    >
                      取消
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Space>
          </Col>
        </Row>
      )}

      {phase === 'loading' && <Tag>加载中…</Tag>}

      {/* 一次性备份码展示 */}
      <Modal
        title="绑定成功 · 请立即保存备份码"
        open={backupCodes !== null}
        width={560}
        closable={false}
        maskClosable={false}
        cancelText="关闭"
        cancelButtonProps={{ 'data-testid': 'backup-codes-close' } as Record<string, string>}
        okText="复制全部并关闭"
        okButtonProps={{ icon: <CopyOutlined /> }}
        onOk={async () => {
          await copyAll();
          setBackupCodes(null);
        }}
        onCancel={() => setBackupCodes(null)}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="备份码用于丢失验证器时应急登录，每个仅可使用一次。请离线抄写或打印保存，系统不会再次展示。"
        />
        <Row gutter={[8, 8]}>
          {backupCodes?.map((c) => (
            <Col span={8} key={c}>
              <Typography.Text code style={{ fontSize: 14 }}>
                {c}
              </Typography.Text>
            </Col>
          ))}
        </Row>
      </Modal>

      {/* 停用二次校验 */}
      <Modal
        title="关闭多因素认证"
        open={disableOpen}
        confirmLoading={busy}
        okText="确认关闭"
        okButtonProps={{ danger: true }}
        onOk={() => void doDisable()}
        onCancel={() => {
          setDisableOpen(false);
          setDisableToken('');
        }}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="关闭后账号安全性下降，请输入当前动态码或任一未使用备份码以确认。"
        />
        <Input
          value={disableToken}
          onChange={(e) => setDisableToken(e.target.value)}
          placeholder="6 位动态码或 XXXX-XXXX 备份码"
          onPressEnter={() => void doDisable()}
        />
      </Modal>
    </Card>
  );
}

/** 便于在非页面场景（如标签页）内嵌时复用的轻量包装 */
export function MfaSettingsPage(): ReactElement {
  return (
    <PageContainer title="多因素认证" description="绑定 TOTP 动态口令，保护账号与敏感操作">
      <MfaSettings />
    </PageContainer>
  );
}
