/**
 * 健澜科技杠OS - 统一消息通知中心页（M134-C · 用户体验深化）
 *
 * 理念：不要太吵，重要通知才推送。
 *   顶部一个铃铛承载全部站内消息，未读红色角标一眼可见；
 *   点开下拉即见四类通知（待办任务 / 系统告警 / 经验推荐 / 同事互动），
 *   点击单条即标记已读、角标实时递减——克制、不打扰。
 *
 * 交互：
 *   - 进入页拉取 GET /api/v1/user/notifications；
 *   - 铃铛 Popover 下拉展示列表；未读行深海蓝加粗，已读行灰显；
 *   - 行内点击「标为已读」→ PUT /api/v1/user/notifications/:id/read → 刷新角标；
 *   - 顶部 Tabs 按类型筛选，分页器翻页。
 *
 * 深海蓝 VI：主色 #0A4D8C，未读角标用警示红 #F5222D。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  App as AntdApp,
  Badge,
  Button,
  List,
  Popover,
  Segmented,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
import { get, put } from '@/api';

/* ------------------------------------------------------------------ */
/* 类型（与 BFF notificationAggregator 对齐）                            */
/* ------------------------------------------------------------------ */

type NotificationType =
  | 'todo_task'
  | 'system_alert'
  | 'experience_rec'
  | 'peer_interact';

interface NotificationItem {
  id: string;
  staffId: string;
  type: NotificationType;
  title: string;
  content: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationListView {
  items: NotificationItem[];
  total: number;
  unread: number;
  page: number;
  pageSize: number;
}

/** 深海蓝 VI 主色 */
const SEA_BLUE = '#0A4D8C';
/** 未读警示红 */
const UNREAD_RED = '#F5222D';

/** 类型 → 中文标签 + 配色（与 BFF 四类通知一一对应） */
const TYPE_META: Record<NotificationType, { label: string; color: string }> = {
  todo_task: { label: '待办任务', color: SEA_BLUE },
  system_alert: { label: '系统告警', color: '#CF1322' },
  experience_rec: { label: '经验推荐', color: '#389E0D' },
  peer_interact: { label: '同事互动', color: '#722ED1' },
};

type TabKey = 'all' | NotificationType;

/** 相对时间：刚刚 / n 分钟前 / n 小时前 / n 天前 */
function fromNow(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  return `${Math.floor(hour / 24)} 天前`;
}

export default function NotificationsPage(): ReactElement {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<NotificationListView>({
    items: [],
    total: 0,
    unread: 0,
    page: 1,
    pageSize: 20,
  });
  const [tab, setTab] = useState<TabKey>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /** 拉取本人通知列表 */
  const refresh = useCallback(
    async (type: TabKey = tab): Promise<void> => {
      setLoading(true);
      try {
        const query: Record<string, string> = { pageSize: '20' };
        if (type !== 'all') query.type = type;
        const view = await get<NotificationListView>('/api/v1/user/notifications', query);
        setList(view);
      } catch (e) {
        message.error(e instanceof Error ? e.message : '通知中心加载失败');
      } finally {
        setLoading(false);
      }
    },
    [message, tab],
  );

  useEffect(() => {
    void refresh('all');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** 单条标记已读 */
  const markRead = async (n: NotificationItem): Promise<void> => {
    if (n.readAt) return; // 已读不重复请求
    try {
      await put<NotificationItem>(`/api/v1/user/notifications/${n.id}/read`);
      // 本地先收敛，再后台刷新，避免角标闪烁
      setList((l) => ({
        ...l,
        unread: Math.max(0, l.unread - 1),
        items: l.items.map((it) =>
          it.id === n.id ? { ...it, readAt: new Date().toISOString() } : it,
        ),
      }));
    } catch (e) {
      message.error(e instanceof Error ? e.message : '已读标记失败');
    }
  };

  /** 铃铛下拉内容：未读优先、最近在前 */
  const bellContent = (
    <div style={{ width: 360, maxHeight: 420, overflowY: 'auto' }}>
      {list.items.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
          暂无通知，重要消息会第一时间出现在这里。
        </div>
      ) : (
        list.items.slice(0, 8).map((n) => {
          const unread = !n.readAt;
          return (
            <div
              key={n.id}
              onClick={() => void markRead(n)}
              style={{
                padding: '10px 12px',
                borderLeft: `3px solid ${unread ? SEA_BLUE : 'transparent'}`,
                background: unread ? '#F0F6FC' : '#fff',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography.Text strong={unread} style={{ color: unread ? SEA_BLUE : '#333' }}>
                  {n.title}
                </Typography.Text>
                <Tag color={TYPE_META[n.type]?.color} style={{ marginInlineStart: 8 }}>
                  {TYPE_META[n.type]?.label}
                </Tag>
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {fromNow(n.createdAt)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <PageContainer title="消息通知" description="不要太吵，重要通知才推送">
      {/* 顶部铃铛 + 未读红色角标 + 下拉列表 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <Popover
          open={dropdownOpen}
          onOpenChange={setDropdownOpen}
          content={bellContent}
          trigger="click"
          placement="bottomLeft"
          title={
            <Space>
              <BellOutlined style={{ color: SEA_BLUE }} />
              未读 {list.unread} 条
            </Space>
          }
        >
          <Badge count={list.unread} size="small" offset={[2, 2]} color={UNREAD_RED}>
            <Button
              icon={<BellOutlined style={{ fontSize: 18, color: SEA_BLUE }} />}
              shape="circle"
            />
          </Badge>
        </Popover>
        <Typography.Text type="secondary">
          四类消息统一收口：待办任务 / 系统告警 / 经验推荐 / 同事互动
        </Typography.Text>
      </div>

      {/* 类型筛选 */}
      <Tabs
        activeKey={tab}
        onChange={(k) => {
          setTab(k as TabKey);
          void refresh(k as TabKey);
        }}
        items={[
          { key: 'all', label: `全部 (${list.total})` },
          { key: 'todo_task', label: '待办任务' },
          { key: 'system_alert', label: '系统告警' },
          { key: 'experience_rec', label: '经验推荐' },
          { key: 'peer_interact', label: '同事互动' },
        ]}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : (
        <List
          bordered
          dataSource={list.items}
          locale={{ emptyText: '暂无通知' }}
          renderItem={(n) => {
            const unread = !n.readAt;
            return (
              <List.Item
                actions={[
                  unread ? (
                    <Button
                      type="link"
                      icon={<CheckOutlined />}
                      onClick={() => void markRead(n)}
                      style={{ color: SEA_BLUE }}
                    >
                      标为已读
                    </Button>
                  ) : (
                    <Typography.Text type="secondary">已读</Typography.Text>
                  ),
                ]}
                style={{
                  background: unread ? '#F0F6FC' : '#fff',
                  borderLeft: `3px solid ${unread ? SEA_BLUE : 'transparent'}`,
                }}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Typography.Text strong={unread}>
                        {unread && (
                          <Badge status="error" style={{ marginInlineEnd: 4 }} />
                        )}
                        {n.title}
                      </Typography.Text>
                      <Tag color={TYPE_META[n.type]?.color}>{TYPE_META[n.type]?.label}</Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <div style={{ color: '#555' }}>{n.content || '—'}</div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {fromNow(n.createdAt)}
                        {n.link ? ` · ${n.link}` : ''}
                      </Typography.Text>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}

      {/* 底部未读总数概览 */}
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Segmented options={[`共 ${list.total} 条 · 未读 ${list.unread} 条`]} disabled />
      </div>
    </PageContainer>
  );
}
