/**
 * 健澜科技 jlmedaios - 统一通知中心页（M148-B · 产品化收尾）
 *
 * 产品理念：聚合通知，不能每个系统发一条。
 *   全院各业务系统（医嘱/病历/审批/危急值/院感/药库/AI 推荐/同事协作）的消息
 *   统一收口到本页，按四大类 tab 聚合：
 *     todo       待办（新医嘱待审 / 新病历待签 / 新审批待批）
 *     alert      告警（危急值 / 院感 / 药品低库存）
 *     recommend  推荐（AI 推荐经验 / 学习材料）
 *     interact   互动（同事 @你 / 知识被引用）
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  Layout,
  List,
  Pagination,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  BulbOutlined,
  TeamOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { get, put } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const GOLD = '#faad14';
const GREEN = '#52c41a';
const RED = '#f5222d';

/* ------------------- 与 BFF GET /api/v1/notifications 对齐 ------------------- */

type UnifiedNotificationType = 'todo' | 'alert' | 'recommend' | 'interact';

interface UnifiedNotificationItem {
  id: string;
  staffId: string;
  type: UnifiedNotificationType;
  title: string;
  content: string;
  refType: string | null;
  refId: string | null;
  readAt: string | null;
  createdAt: string;
}

interface UnifiedNotificationPage {
  items: UnifiedNotificationItem[];
  total: number;
  unread: number;
  page: number;
  pageSize: number;
}

/** 大类元数据：标签 + 图标 + 色（与后端 UNIFIED_NOTIFICATION_TYPES 对齐） */
const TYPE_META: Record<
  UnifiedNotificationType,
  { label: string; color: string; icon: ReactElement }
> = {
  todo: { label: '待办', color: MID_BLUE, icon: <ClockCircleOutlined /> },
  alert: { label: '告警', color: RED, icon: <WarningOutlined /> },
  recommend: { label: '推荐', color: GOLD, icon: <BulbOutlined /> },
  interact: { label: '互动', color: GREEN, icon: <TeamOutlined /> },
};

/** 来源业务对象中文短名（refType 美化展示，未登记的原样显示） */
const REF_TYPE_LABEL: Record<string, string> = {
  order_review: '医嘱审核',
  record_sign: '病历签收',
  approval: '审批',
  critical_value: '危急值',
  infection: '院感',
  low_stock: '药品低库存',
  ai_experience: 'AI 经验',
  learning_material: '学习材料',
  mention: '@我',
  knowledge_cited: '知识被引用',
};

function refLabel(refType: string | null): string | null {
  if (!refType) return null;
  return REF_TYPE_LABEL[refType] ?? refType;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}

export default function NotificationCenterPage() {
  const [activeTab, setActiveTab] = useState<UnifiedNotificationType | 'all'>('all');
  const [data, setData] = useState<UnifiedNotificationPage | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(
    async (tab: UnifiedNotificationType | 'all', p: number, size: number) => {
      setLoading(true);
      setError('');
      try {
        const res = await get<UnifiedNotificationPage>(
          '/notifications',
          {
            ...(tab === 'all' ? {} : { type: tab }),
            page: p,
            pageSize: size,
          },
          { silent: true },
        );
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : '统一通知中心加载失败');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(activeTab, page, pageSize);
  }, [load, activeTab, page, pageSize]);

  /** 点击单条 → 置为已读并刷新（仅未读才请求） */
  const markRead = useCallback(
    async (item: UnifiedNotificationItem) => {
      if (item.readAt != null) return;
      try {
        await put(`/notifications/${item.id}/read`, undefined, { silent: true });
        await load(activeTab, page, pageSize);
      } catch {
        // 已读失败不打断用户，下次刷新自然纠正
      }
    },
    [activeTab, page, pageSize, load],
  );

  const unreadTotal = data?.unread ?? 0;

  const tabsItems = useMemo(
    () => [
      { key: 'all', label: `全部（${unreadTotal} 未读）` },
      ...(Object.keys(TYPE_META) as UnifiedNotificationType[]).map((t) => ({
        key: t,
        label: (
          <span>
            {TYPE_META[t].icon} {TYPE_META[t].label}
          </span>
        ),
      })),
    ],
    [unreadTotal],
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: DEEP_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          <BellOutlined style={{ marginRight: 8 }} />
          统一通知中心
          <Badge
            count={unreadTotal}
            overflowCount={99}
            style={{ background: RED, marginLeft: 12 }}
          />
        </Title>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load(activeTab, page, pageSize)}>
          刷新
        </Button>
      </Header>

      <Content style={{ padding: 24, background: '#f0f4f8' }}>
        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={error}
            action={
              <Button size="small" danger onClick={() => void load(activeTab, page, pageSize)}>
                重试
              </Button>
            }
          />
        )}

        <Card style={{ borderRadius: 8 }}>
          <Tabs
            activeKey={activeTab}
            items={tabsItems}
            onChange={(k) => {
              setActiveTab(k as UnifiedNotificationType | 'all');
              setPage(1);
            }}
          />

          {loading && !data ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <Spin size="large" tip="正在聚合全院消息…" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <Empty description="暂无通知：各系统的待办 / 告警 / 推荐 / 互动会自动汇聚到这里" />
          ) : (
            <>
              <List
                dataSource={data.items}
                renderItem={(item) => {
                  const meta = TYPE_META[item.type];
                  const ref = refLabel(item.refType);
                  const unread = item.readAt == null;
                  return (
                    <List.Item
                      onClick={() => void markRead(item)}
                      style={{
                        cursor: unread ? 'pointer' : 'default',
                        background: unread ? 'rgba(74,144,217,0.06)' : '#fff',
                        padding: '12px 16px',
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          <span
                            style={{
                              fontSize: 20,
                              color: meta.color,
                              marginTop: 6,
                            }}
                          >
                            {meta.icon}
                          </span>
                        }
                        title={
                          <span>
                            {unread && (
                              <Badge status="processing" style={{ marginRight: 6 }} />
                            )}
                            <Text strong={unread} style={{ color: unread ? DEEP_BG : 'rgba(0,0,0,0.65)' }}>
                              {item.title}
                            </Text>
                            <Tag color={meta.color} style={{ marginLeft: 8 }}>
                              {meta.label}
                            </Tag>
                            {ref && (
                              <Tag icon={<ExperimentOutlined />} style={{ marginLeft: 4 }}>
                                {ref}
                                {item.refId ? ` · ${item.refId}` : ''}
                              </Tag>
                            )}
                            {unread ? (
                              <Tag color="red" style={{ marginLeft: 4 }}>未读</Tag>
                            ) : (
                              <Tag icon={<CheckCircleOutlined />} color="green" style={{ marginLeft: 4 }}>
                                已读
                              </Tag>
                            )}
                          </span>
                        }
                        description={
                          <div>
                            <Paragraph type="secondary" style={{ marginBottom: 4, fontSize: 13 }}>
                              {item.content || '—'}
                            </Paragraph>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {formatTime(item.createdAt)}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
              <div style={{ textAlign: 'right', marginTop: 16 }}>
                <Pagination
                  current={data.page}
                  pageSize={data.pageSize}
                  total={data.total}
                  showSizeChanger
                  showTotal={(t) => `共 ${t} 条`}
                  onChange={(p, ps) => {
                    setPage(p);
                    setPageSize(ps);
                  }}
                />
              </div>
            </>
          )}
        </Card>

        <Alert
          style={{ marginTop: 16 }}
          type="info"
          showIcon
          message="统一收口：医嘱审核、病历签收、审批、危急值、院感、药库低库存、AI 推荐、同事 @ 等消息不再各自打扰，全部聚合到此处。"
        />
      </Content>
    </Layout>
  );
}
