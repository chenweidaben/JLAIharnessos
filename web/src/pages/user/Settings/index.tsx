/**
 * 健澜科技 jlmedaios - 个人设置页（M148-A · 产品化收尾）
 *
 * 聚合四类个人偏好，即时生效、无需刷新：
 *   - 通知偏好：短信 / 微信 / 站内信
 *   - 界面偏好：主题色（深海蓝 VI 色板）/ 字号 / 密度
 *   - 助手偏好：AI 总开关 / 建议展示
 *   - 工作台偏好：默认首页 / 常用功能置顶
 *
 * 交互：进入页拉取 GET /api/v1/user/settings；任一控件改动即调用
 *   PUT /api/v1/user/settings/:key 单键保存，以响应中的最新 settings 回写本地。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  App as AntdApp,
  Card,
  Col,
  Divider,
  Segmented,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { AppstoreOutlined, BellOutlined, DesktopOutlined, RobotOutlined } from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
import { get, put } from '@/api';

/* ------------------------------------------------------------------ */
/* 类型（与 BFF userSettingsAggregator M148-A 对齐）                     */
/* ------------------------------------------------------------------ */

type ThemeColor = 'seaBlue' | 'teal' | 'violet' | 'slate';
type FontSize = 'small' | 'medium' | 'large';
type Density = 'compact' | 'normal' | 'spacious';
type DefaultHome = 'workbench' | 'dashboard' | 'todos' | 'notifications';

interface NotificationSettings {
  sms: boolean;
  wechat: boolean;
  inApp: boolean;
}
interface AppearanceSettings {
  themeColor: ThemeColor;
  fontSize: FontSize;
  density: Density;
}
interface AssistantSettings {
  aiEnabled: boolean;
  suggestVisible: boolean;
}
interface WorkspaceSettings {
  defaultHome: DefaultHome;
  pinnedFavorites: string[];
}
interface Settings {
  notification: NotificationSettings;
  appearance: AppearanceSettings;
  assistant: AssistantSettings;
  workspace: WorkspaceSettings;
}
interface SettingsView {
  staffId: string;
  settings: Settings;
  updatedAt: string;
}

/** 深海蓝 VI 主色 */
const SEA_BLUE = '#0A4D8C';

/** 主题色色板（与后端 ThemeColor 枚举对齐） */
const THEME_COLOR_OPTIONS: { label: string; value: ThemeColor; dot: string }[] = [
  { label: '深海蓝', value: 'seaBlue', dot: '#0A4D8C' },
  { label: '松石青', value: 'teal', dot: '#0F766E' },
  { label: '靛紫', value: 'violet', dot: '#5B4FCF' },
  { label: '石墨灰', value: 'slate', dot: '#475569' },
];

/** 默认首页选项 */
const HOME_OPTIONS: { label: string; value: DefaultHome }[] = [
  { label: '个人工作台', value: 'workbench' },
  { label: '运营 Dashboard', value: 'dashboard' },
  { label: '我的待办', value: 'todos' },
  { label: '站内信', value: 'notifications' },
];

/** 可置顶的常用功能候选 */
const PINNABLE_OPTIONS = [
  { label: '个人工作台', value: 'workbench' },
  { label: '我的待办', value: 'todos' },
  { label: '站内信', value: 'notifications' },
  { label: '门诊工作台', value: 'outpatient' },
  { label: '住院工作台', value: 'inpatient' },
  { label: '医嘱中心', value: 'orders' },
  { label: '病历文书', value: 'emr' },
  { label: '统计报表', value: 'reports' },
];

/** 占位默认值（拉取中兜底，避免受控组件 undefined） */
const FALLBACK: Settings = {
  notification: { sms: false, wechat: false, inApp: true },
  appearance: { themeColor: 'seaBlue', fontSize: 'medium', density: 'normal' },
  assistant: { aiEnabled: true, suggestVisible: true },
  workspace: { defaultHome: 'workbench', pinnedFavorites: [] },
};

export default function UserSettingsPage(): ReactElement {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>(FALLBACK);

  /** 拉取本人完整偏好 */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const view = await get<SettingsView>('/api/v1/user/settings');
      setSettings(view.settings);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '个人设置加载失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** 单键即时保存：PUT /api/v1/user/settings/:key，以响应最新 settings 回写 */
  const persist = useCallback(
    async (key: string, value: unknown): Promise<void> => {
      try {
        const view = await put<SettingsView>(`/api/v1/user/settings/${key}`, { value });
        setSettings(view.settings);
      } catch (e) {
        message.error(e instanceof Error ? e.message : '偏好保存失败，已还原');
        // 失败回滚本地，避免界面与后端不一致
        void refresh();
      }
    },
    [message, refresh],
  );

  if (loading) {
    return (
      <PageContainer title="个人设置" description="通知、界面、助手与工作台偏好">
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="个人设置" description="修改即时生效，仅本人可见、随账号漫游">
      <Row gutter={[16, 16]}>
        {/* 通知偏好：短信 / 微信 / 站内信 */}
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
                <Col>短信通知</Col>
                <Col>
                  <Switch
                    checked={settings.notification.sms}
                    onChange={(v) => void persist('notification.sms', v)}
                  />
                </Col>
              </Row>
              <Row justify="space-between" align="middle">
                <Col>微信通知</Col>
                <Col>
                  <Switch
                    checked={settings.notification.wechat}
                    onChange={(v) => void persist('notification.wechat', v)}
                  />
                </Col>
              </Row>
              <Row justify="space-between" align="middle">
                <Col>站内信通知</Col>
                <Col>
                  <Switch
                    checked={settings.notification.inApp}
                    onChange={(v) => void persist('notification.inApp', v)}
                  />
                </Col>
              </Row>
            </Space>
          </Card>
        </Col>

        {/* 界面偏好：主题色 / 字号 / 密度 */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <DesktopOutlined style={{ color: SEA_BLUE }} />
                界面偏好
              </Space>
            }
          >
            <Typography.Text type="secondary">主题色</Typography.Text>
            <div style={{ margin: '8px 0 16px' }}>
              <Space size="middle">
                {THEME_COLOR_OPTIONS.map((opt) => (
                  <Tag.CheckableTag
                    key={opt.value}
                    checked={settings.appearance.themeColor === opt.value}
                    onChange={() => void persist('appearance.themeColor', opt.value)}
                    style={{
                      background: opt.dot,
                      border: 'none',
                      color: '#fff',
                      padding: '4px 12px',
                    }}
                  >
                    {opt.label}
                  </Tag.CheckableTag>
                ))}
              </Space>
            </div>
            <Typography.Text type="secondary">字号</Typography.Text>
            <Segmented
              block
              style={{ margin: '8px 0 16px' }}
              value={settings.appearance.fontSize}
              onChange={(v) => void persist('appearance.fontSize', v)}
              options={[
                { label: '小', value: 'small' },
                { label: '中', value: 'medium' },
                { label: '大', value: 'large' },
              ]}
            />
            <Typography.Text type="secondary">界面密度</Typography.Text>
            <Segmented
              block
              style={{ marginTop: 8 }}
              value={settings.appearance.density}
              onChange={(v) => void persist('appearance.density', v)}
              options={[
                { label: '紧凑', value: 'compact' },
                { label: '标准', value: 'normal' },
                { label: '宽松', value: 'spacious' },
              ]}
            />
          </Card>
        </Col>

        {/* 助手偏好：AI 开关 / 建议展示 */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <RobotOutlined style={{ color: SEA_BLUE }} />
                助手偏好
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Row justify="space-between" align="middle">
                <Col>
                  AI 助手总开关
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    关闭后工作台不再展示任何 AI 辅助能力
                  </Typography.Text>
                </Col>
                <Col>
                  <Switch
                    checked={settings.assistant.aiEnabled}
                    onChange={(v) => void persist('assistant.aiEnabled', v)}
                  />
                </Col>
              </Row>
              <Divider style={{ margin: '4px 0' }} />
              <Row justify="space-between" align="middle">
                <Col>
                  展示 AI 建议
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    在开方 / 病历等场景下主动展示建议
                  </Typography.Text>
                </Col>
                <Col>
                  <Switch
                    disabled={!settings.assistant.aiEnabled}
                    checked={settings.assistant.suggestVisible && settings.assistant.aiEnabled}
                    onChange={(v) => void persist('assistant.suggestVisible', v)}
                  />
                </Col>
              </Row>
            </Space>
          </Card>
        </Col>

        {/* 工作台偏好：默认首页 / 常用功能置顶 */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <AppstoreOutlined style={{ color: SEA_BLUE }} />
                工作台偏好
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Typography.Text type="secondary">登录后默认首页</Typography.Text>
                <Select
                  style={{ width: '100%', marginTop: 6 }}
                  value={settings.workspace.defaultHome}
                  onChange={(v: DefaultHome) => void persist('workspace.defaultHome', v)}
                  options={HOME_OPTIONS}
                />
              </div>
              <div>
                <Typography.Text type="secondary">常用功能置顶（最多 12 个）</Typography.Text>
                <Select
                  mode="multiple"
                  style={{ width: '100%', marginTop: 6 }}
                  value={settings.workspace.pinnedFavorites}
                  onChange={(v: string[]) => void persist('workspace.pinnedFavorites', v)}
                  options={PINNABLE_OPTIONS}
                  maxTagCount={4}
                  placeholder="选择需要置顶展示的常用功能"
                />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Tag color="blue">修改即时生效 · 无需刷新 · 仅本人可见</Tag>
      </div>
    </PageContainer>
  );
}
