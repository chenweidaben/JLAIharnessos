/**
 * 健澜科技 jlmedaios - 设置中心页（M158-D · 用户体验深化 / 个性化与通知）
 *
 * v4.x近期：聚合五组个性化偏好，修改即时生效、随账号漫游：
 *   - 外观主题：深海蓝 / 浅色 / 高对比（无障碍）
 *   - 通知方式：站内 / 邮件 / 短信（可多选）
 *   - 默认首页：工作台 / 患者列表 / 驾驶舱
 *   - 每页条数：10 / 20 / 50
 *   - 助手开关：AI 辅助 / 语音录入 / 智能提示
 * 另侧栏展示按本人已开启通道收敛后的统一收件箱与未读数。
 *
 * 交互：进入页拉取 GET /api/v1/user/preferences；任一控件改动即调用
 *   PUT /api/v1/user/preferences，以响应中的最新 preferences 回写本地。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  App as AntdApp,
  Badge,
  Card,
  Col,
  List,
  Row,
  Segmented,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { BellOutlined, HomeOutlined, RobotOutlined, SkinOutlined } from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
import { get, put } from '@/api';

/* ------------------------------------------------------------------ */
/* 类型（与 BFF userPrefAggregator M158-D 对齐）                        */
/* ------------------------------------------------------------------ */

type ThemeMode = 'seaBlue' | 'light' | 'highContrast';
type NotifyChannel = 'inApp' | 'email' | 'sms';
type DefaultHome = 'workbench' | 'patientList' | 'cockpit';
type PageSize = 10 | 20 | 50;

interface AssistantToggles {
  aiAssist: boolean;
  voiceInput: boolean;
  smartTips: boolean;
}
interface Preferences {
  theme: ThemeMode;
  notifyChannels: NotifyChannel[];
  defaultHome: DefaultHome;
  pageSize: PageSize;
  assistant: AssistantToggles;
}
interface UnifiedNotification {
  id: string;
  type: string;
  title: string;
  summary: string;
  level: 'info' | 'warning' | 'critical';
  read: boolean;
  channel: NotifyChannel;
  createdAt: string;
}
interface PreferencesView {
  userId: string;
  preferences: Preferences;
  notificationSettings: { inApp: boolean; email: boolean; sms: boolean };
  inbox: UnifiedNotification[];
  unreadCount: number;
  updatedAt: string;
}

/** 深海蓝 VI 主色 */
const SEA_BLUE = '#0A4D8C';

/** 外观主题选项 */
const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: '深海蓝', value: 'seaBlue' },
  { label: '浅色', value: 'light' },
  { label: '高对比', value: 'highContrast' },
];

/** 通知方式选项 */
const CHANNEL_OPTIONS: { label: string; value: NotifyChannel }[] = [
  { label: '站内消息', value: 'inApp' },
  { label: '邮件', value: 'email' },
  { label: '短信', value: 'sms' },
];

/** 默认首页选项 */
const HOME_OPTIONS: { label: string; value: DefaultHome }[] = [
  { label: '工作台', value: 'workbench' },
  { label: '患者列表', value: 'patientList' },
  { label: '驾驶舱', value: 'cockpit' },
];

/** 每页条数选项 */
const PAGE_SIZE_OPTIONS: { label: string; value: PageSize }[] = [
  { label: '10 条/页', value: 10 },
  { label: '20 条/页', value: 20 },
  { label: '50 条/页', value: 50 },
];

/** 助手开关项 */
const ASSISTANT_ITEMS: { key: keyof AssistantToggles; label: string; desc: string }[] = [
  { key: 'aiAssist', label: 'AI 辅助', desc: '病历生成、诊断建议等 AI 写作能力' },
  { key: 'voiceInput', label: '语音录入', desc: '在病历与交班场景使用语音转写' },
  { key: 'smartTips', label: '智能提示', desc: '用药、危急值等被动智能提醒' },
];

/** 拉取中兜底默认值（避免受控组件 undefined） */
const FALLBACK: Preferences = {
  theme: 'seaBlue',
  notifyChannels: ['inApp'],
  defaultHome: 'workbench',
  pageSize: 20,
  assistant: { aiAssist: true, voiceInput: true, smartTips: true },
};

/** 通知级别标签色 */
function levelColor(level: UnifiedNotification['level']): string {
  return level === 'critical' ? 'red' : level === 'warning' ? 'orange' : 'blue';
}

export default function UserSettingsPage(): ReactElement {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Preferences>(FALLBACK);
  const [inbox, setInbox] = useState<UnifiedNotification[]>([]);
  const [unread, setUnread] = useState(0);

  /** 拉取本人偏好与统一收件箱 */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const view = await get<PreferencesView>('/api/v1/user/preferences');
      setPrefs(view.preferences);
      setInbox(view.inbox ?? []);
      setUnread(view.unreadCount ?? 0);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '设置中心加载失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** 部分保存：PUT /api/v1/user/preferences，以响应最新 preferences 回写 */
  const persist = useCallback(
    async (patch: Partial<Preferences>): Promise<void> => {
      try {
        const view = await put<PreferencesView>('/api/v1/user/preferences', { preferences: patch });
        setPrefs(view.preferences);
      } catch (e) {
        message.error(e instanceof Error ? e.message : '偏好保存失败，已还原');
        void refresh();
      }
    },
    [message, refresh],
  );

  /** 通知方式多选：翻转某通道后提交完整数组 */
  const toggleChannel = useCallback(
    (ch: NotifyChannel, on: boolean): void => {
      const next = on
        ? Array.from(new Set([...prefs.notifyChannels, ch]))
        : prefs.notifyChannels.filter((c) => c !== ch);
      void persist({ notifyChannels: next });
    },
    [prefs.notifyChannels, persist],
  );

  if (loading) {
    return (
      <PageContainer title="设置中心" description="个性化偏好与通知方式">
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="设置中心" description="修改即时生效，仅本人可见、随账号漫游">
      <Row gutter={[16, 16]}>
        {/* 左列：五组偏好 */}
        <Col xs={24} lg={16}>
          <Row gutter={[16, 16]}>
            {/* 外观主题 */}
            <Col xs={24} md={12}>
              <Card
                title={
                  <Space>
                    <SkinOutlined style={{ color: SEA_BLUE }} />
                    外观主题
                  </Space>
                }
              >
                <Segmented
                  block
                  value={prefs.theme}
                  onChange={(v) => void persist({ theme: v as ThemeMode })}
                  options={THEME_OPTIONS}
                />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  高对比模式面向视力较弱场景，提升文字与背景对比度。
                </Typography.Text>
              </Card>
            </Col>

            {/* 默认首页 */}
            <Col xs={24} md={12}>
              <Card
                title={
                  <Space>
                    <HomeOutlined style={{ color: SEA_BLUE }} />
                    默认首页
                  </Space>
                }
              >
                <Segmented
                  block
                  value={prefs.defaultHome}
                  onChange={(v) => void persist({ defaultHome: v as DefaultHome })}
                  options={HOME_OPTIONS}
                />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  登录后默认落地的工作页面。
                </Typography.Text>
              </Card>
            </Col>

            {/* 通知方式 */}
            <Col xs={24} md={12}>
              <Card
                title={
                  <Space>
                    <BellOutlined style={{ color: SEA_BLUE }} />
                    通知方式
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {CHANNEL_OPTIONS.map((opt) => (
                    <Row key={opt.value} justify="space-between" align="middle">
                      <Col>{opt.label}</Col>
                      <Col>
                        <Switch
                          checked={prefs.notifyChannels.includes(opt.value)}
                          onChange={(on) => toggleChannel(opt.value, on)}
                        />
                      </Col>
                    </Row>
                  ))}
                </Space>
              </Card>
            </Col>

            {/* 每页条数 */}
            <Col xs={24} md={12}>
              <Card title="列表每页条数">
                <Segmented
                  block
                  value={prefs.pageSize}
                  onChange={(v) => void persist({ pageSize: v as PageSize })}
                  options={PAGE_SIZE_OPTIONS}
                />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  患者列表、待办等分页列表默认每页展示条数。
                </Typography.Text>
              </Card>
            </Col>

            {/* 助手开关 */}
            <Col xs={24}>
              <Card
                title={
                  <Space>
                    <RobotOutlined style={{ color: SEA_BLUE }} />
                    助手开关
                  </Space>
                }
              >
                <Row gutter={[16, 16]}>
                  {ASSISTANT_ITEMS.map((item) => (
                    <Col xs={24} md={8} key={item.key}>
                      <Row justify="space-between" align="middle">
                        <Col>
                          {item.label}
                          <br />
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {item.desc}
                          </Typography.Text>
                        </Col>
                        <Col>
                          <Switch
                            checked={prefs.assistant[item.key]}
                            onChange={(on) => void persist({ assistant: { ...prefs.assistant, [item.key]: on } })}
                          />
                        </Col>
                      </Row>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row>
        </Col>

        {/* 右列：统一收件箱预览 */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                统一通知
                <Badge count={unread} size="small" offset={[4, -2]} />
              </Space>
            }
          >
            <List
              size="small"
              dataSource={inbox}
              locale={{ emptyText: '暂无通知' }}
              renderItem={(n) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space size={6}>
                        <Tag color={levelColor(n.level)} style={{ marginInlineEnd: 0 }}>
                          {n.type}
                        </Tag>
                        <span style={{ fontWeight: n.read ? 400 : 600 }}>{n.title}</span>
                      </Space>
                    }
                    description={
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {n.summary}
                      </Typography.Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Tag color="blue">修改即时生效 · 无需刷新 · 仅本人可见</Tag>
      </div>
    </PageContainer>
  );
}
