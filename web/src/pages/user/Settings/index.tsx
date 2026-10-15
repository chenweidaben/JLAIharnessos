/**
 * 健澜科技杠OS - 个人设置页（M132-D · 产品化收尾）
 *
 * 聚合四类个人偏好，开箱即用、随个人习惯自适应：
 *   - 通知偏好：站内 / 邮件 / 短信 / 提示音
 *   - 界面偏好：主题（浅色/深色/跟随系统）、字号（小/中/大）
 *   - 智能助手：总开关、自动诊疗建议
 *   - 工作台：默认科室 / 默认病房
 *
 * 交互：进入页拉取 GET /api/v1/user/settings（未保存则后端按角色给默认值）；
 *   修改后点「保存设置」整组 PUT，成功即提示。简单直观，深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Col,
  Divider,
  Input,
  Row,
  Segmented,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { BellOutlined, DesktopOutlined, SaveOutlined, SettingOutlined, SmileOutlined } from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
import { get, put } from '@/api';

/* ------------------------------------------------------------------ */
/* 类型（与 BFF userSettingsAggregator 对齐）                            */
/* ------------------------------------------------------------------ */

type ThemeMode = 'light' | 'dark' | 'auto';
type FontSize = 'small' | 'medium' | 'large';

interface NotificationSettings {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  sound: boolean;
}
interface AppearanceSettings {
  theme: ThemeMode;
  fontSize: FontSize;
}
interface AssistantSettings {
  enabled: boolean;
  autoSuggest: boolean;
}
interface WorkspaceSettings {
  defaultDeptCode: string;
  defaultWardCode: string;
}
interface Settings {
  notification: NotificationSettings;
  appearance: AppearanceSettings;
  assistant: AssistantSettings;
  workspace: WorkspaceSettings;
}
interface SettingsView {
  userId: string;
  settings: Settings;
  updatedAt: string;
  isDefault: boolean;
}

/** 深海蓝 VI 主色 */
const SEA_BLUE = '#0A4D8C';

/** 占位默认值（拉取中兜底，避免受控组件 undefined） */
const FALLBACK: Settings = {
  notification: { inApp: true, email: true, sms: false, sound: true },
  appearance: { theme: 'light', fontSize: 'medium' },
  assistant: { enabled: true, autoSuggest: true },
  workspace: { defaultDeptCode: '', defaultWardCode: '' },
};

export default function UserSettingsPage(): ReactElement {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [settings, setSettings] = useState<Settings>(FALLBACK);

  /** 拉取本人设置 */
  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const view = await get<SettingsView>('/api/v1/user/settings');
      setSettings(view.settings);
      setIsDefault(view.isDefault);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '个人设置加载失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** 保存整组设置 */
  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const view = await put<SettingsView>('/api/v1/user/settings', settings);
      setSettings(view.settings);
      setIsDefault(false);
      message.success('个人设置已保存');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="个人设置" description="通知、界面、智能助手与工作台偏好">
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="个人设置" description="通知、界面、智能助手与工作台偏好，仅本人可见">
      {isDefault && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="当前为按你的角色生成的默认设置，稍作调整后保存即可个性化。"
        />
      )}

      <Row gutter={[16, 16]}>
        {/* 通知偏好 */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <BellOutlined style={{ color: SEA_BLUE }} />
                通知偏好
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Row justify="space-between" align="middle">
                <Col>站内消息通知</Col>
                <Col>
                  <Switch
                    checked={settings.notification.inApp}
                    onChange={(v) =>
                      setSettings((s) => ({ ...s, notification: { ...s.notification, inApp: v } }))
                    }
                  />
                </Col>
              </Row>
              <Row justify="space-between" align="middle">
                <Col>邮件通知</Col>
                <Col>
                  <Switch
                    checked={settings.notification.email}
                    onChange={(v) =>
                      setSettings((s) => ({ ...s, notification: { ...s.notification, email: v } }))
                    }
                  />
                </Col>
              </Row>
              <Row justify="space-between" align="middle">
                <Col>短信通知</Col>
                <Col>
                  <Switch
                    checked={settings.notification.sms}
                    onChange={(v) =>
                      setSettings((s) => ({ ...s, notification: { ...s.notification, sms: v } }))
                    }
                  />
                </Col>
              </Row>
              <Row justify="space-between" align="middle">
                <Col>消息提示音</Col>
                <Col>
                  <Switch
                    checked={settings.notification.sound}
                    onChange={(v) =>
                      setSettings((s) => ({ ...s, notification: { ...s.notification, sound: v } }))
                    }
                  />
                </Col>
              </Row>
            </Space>
          </Card>
        </Col>

        {/* 界面偏好 */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <DesktopOutlined style={{ color: SEA_BLUE }} />
                界面偏好
              </Space>
            }
          >
            <Typography.Text type="secondary">主题</Typography.Text>
            <Segmented
              block
              style={{ margin: '8px 0 16px' }}
              value={settings.appearance.theme}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  appearance: { ...s.appearance, theme: v as ThemeMode },
                }))
              }
              options={[
                { label: '浅色', value: 'light' },
                { label: '深色', value: 'dark' },
                { label: '跟随系统', value: 'auto' },
              ]}
            />
            <Typography.Text type="secondary">字号</Typography.Text>
            <Segmented
              block
              style={{ marginTop: 8 }}
              value={settings.appearance.fontSize}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  appearance: { ...s.appearance, fontSize: v as FontSize },
                }))
              }
              options={[
                { label: '小', value: 'small' },
                { label: '中', value: 'medium' },
                { label: '大', value: 'large' },
              ]}
            />
          </Card>
        </Col>

        {/* 智能助手 */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <SmileOutlined style={{ color: SEA_BLUE }} />
                智能助手
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Row justify="space-between" align="middle">
                <Col>
                  启用智能助手
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    关闭后工作台不再展示 AI 辅助能力
                  </Typography.Text>
                </Col>
                <Col>
                  <Switch
                    checked={settings.assistant.enabled}
                    onChange={(v) =>
                      setSettings((s) => ({ ...s, assistant: { ...s.assistant, enabled: v } }))
                    }
                  />
                </Col>
              </Row>
              <Divider style={{ margin: '4px 0' }} />
              <Row justify="space-between" align="middle">
                <Col>
                  自动诊疗建议
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    开方 / 病历场景下主动给出建议
                  </Typography.Text>
                </Col>
                <Col>
                  <Switch
                    disabled={!settings.assistant.enabled}
                    checked={settings.assistant.autoSuggest && settings.assistant.enabled}
                    onChange={(v) =>
                      setSettings((s) => ({ ...s, assistant: { ...s.assistant, autoSuggest: v } }))
                    }
                  />
                </Col>
              </Row>
            </Space>
          </Card>
        </Col>

        {/* 默认科室 / 病房 */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <SettingOutlined style={{ color: SEA_BLUE }} />
                默认科室与病房
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Typography.Text type="secondary">默认科室编码</Typography.Text>
                <Input
                  style={{ marginTop: 6 }}
                  placeholder="如 DEPT-INTERNAL"
                  value={settings.workspace.defaultDeptCode}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      workspace: { ...s.workspace, defaultDeptCode: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Typography.Text type="secondary">默认病房编码</Typography.Text>
                <Input
                  style={{ marginTop: 6 }}
                  placeholder="如 WARD-3W-EAST"
                  value={settings.workspace.defaultWardCode}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      workspace: { ...s.workspace, defaultWardCode: e.target.value },
                    }))
                  }
                />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 保存栏 */}
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Tag color="blue">仅本人可见 · 随账号漫游</Tag>
          <Button onClick={() => void refresh()}>还原</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void save()}>
            保存设置
          </Button>
        </Space>
      </div>
    </PageContainer>
  );
}
