/**
 * 健澜科技 jlmedaios - 医院内部即时通讯屏（M138-C）
 *
 * 【新业务场景】医护内部点对点 IM：左侧同事会话列表 + 右侧聊天对话框。
 *   - 消息经 BFF 加密存储（AES-256-GCM），本页只接触密文解密后的明文视图；
 *   - 支持文字 / 图片 / 文件 / 系统通知四类气泡；
 *   - 深海蓝 VI（主色 #0a4d8c）。
 *
 * 不触碰 WebSocket：本版为拉取式（选会话拉历史、发消息后刷新当前会话）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Badge, Button, Input, Layout, List, Tag, Typography } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { get, post } from '@/api/client';
import { usePermission } from '@/router/guards';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

/** 对外消息视图（与后端 imAggregator.ImMessage 对齐） */
interface ImMessage {
  id: string;
  senderId: string;
  receiverId: string;
  type: 'text' | 'image' | 'file' | 'system';
  content: string;
  readAt: string | null;
  createdAt: string;
}

/** 院内同事通讯录（演示用：真实环境由 staff 目录接口下发） */
interface Contact {
  id: string;
  name: string;
  role: string;
}

const DEMO_CONTACTS: Contact[] = [
  { id: 'u_doc_zhang', name: '张医生', role: '内科 · 主治医师' },
  { id: 'u_nurse_li', name: '李护士', role: '呼吸科 · 责任护士' },
  { id: 'u_pharm_wang', name: '王药师', role: '药学部 · 主管药师' },
  { id: 'u_admin_chen', name: '陈干事', role: '医务处 · 行政干事' },
];

/** 深海蓝 VI 色板 */
const VI = {
  primary: '#0a4d8c',
  primaryDark: '#073a6b',
  primaryLight: '#1a6bb8',
  bg: '#f5f7fa',
  border: '#e8ecf1',
};

const TYPE_COLOR: Record<ImMessage['type'], string> = {
  text: 'blue',
  image: 'cyan',
  file: 'geekblue',
  system: 'default',
};

const TYPE_LABEL: Record<ImMessage['type'], string> = {
  text: '文字',
  image: '图片',
  file: '文件',
  system: '系统',
};

export default function ImMessagesPage() {
  usePermission();

  const [active, setActive] = useState<Contact>(DEMO_CONTACTS[0]);
  const [messages, setMessages] = useState<ImMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /** 拉取与某同事的会话历史（第 1 页，最多 50 条） */
  async function loadConversation(contactId: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const list = await get<ImMessage[]>(`/api/v1/im/conversation/${contactId}`, {
        page: 1,
        pageSize: 50,
      });
      setMessages(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : '会话加载失败');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  /** 拉取本人未读总数（导航角标） */
  async function loadUnread(): Promise<void> {
    try {
      const r = await get<{ count: number }>('/api/v1/im/unread-count');
      setUnread(r.count ?? 0);
    } catch {
      /* 角标拉取失败不阻断主流程 */
    }
  }

  useEffect(() => {
    void loadConversation(active.id);
    void loadUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /** 发送消息：POST 后把服务端返回的消息补进本地列表 */
  async function handleSend(): Promise<void> {
    const content = draft.trim();
    if (!content) return;
    setDraft('');
    try {
      const sent = await post<ImMessage>('/api/v1/im/send', {
        receiverId: active.id,
        content,
        type: 'text',
      });
      setMessages((prev) => [...prev, sent]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败');
    }
  }

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 顶部栏：深海蓝 */}
      <Layout.Header
        style={{
          background: `linear-gradient(90deg, ${VI.primaryDark}, ${VI.primary})`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
        }}
      >
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          院内通讯 <Badge count={unread} offset={[6, 0]} />
        </Title>
      </Layout.Header>

      <Layout>
        {/* 左侧：同事会话列表 */}
        <Sider width={260} theme="light" style={{ borderRight: `1px solid ${VI.border}` }}>
          <List
            dataSource={DEMO_CONTACTS}
            loading={loading}
            renderItem={(c) => (
              <List.Item
                onClick={() => setActive(c)}
                style={{
                  cursor: 'pointer',
                  background: c.id === active.id ? '#e6f0fa' : 'transparent',
                  borderLeft: c.id === active.id ? `3px solid ${VI.primary}` : '3px solid transparent',
                  padding: '12px 16px',
                }}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} style={{ background: VI.primaryLight }} />}
                  title={<Text strong>{c.name}</Text>}
                  description={<Text type="secondary" style={{ fontSize: 12 }}>{c.role}</Text>}
                />
              </List.Item>
            )}
          />
        </Sider>

        {/* 右侧：聊天对话框 */}
        <Content style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && <Alert type="error" showIcon message={error} closable onClose={() => setError(null)} />}

          <div
            style={{
              flex: 1,
              background: '#fff',
              border: `1px solid ${VI.border}`,
              borderRadius: 8,
              padding: 16,
              overflowY: 'auto',
              minHeight: 420,
              maxHeight: 'calc(100vh - 260px)',
            }}
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              与「{active.name}」的会话（消息加密存储）
            </Text>
            {messages.length === 0 && !loading && (
              <Text type="secondary">暂无消息，发送第一条吧。</Text>
            )}
            {messages.map((m) => {
              const mine = m.receiverId === active.id; // 本人发出（接收方=当前选中同事）
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                  <div
                    style={{
                      maxWidth: '68%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: mine ? VI.primary : '#f0f2f5',
                      color: mine ? '#fff' : '#262626',
                    }}
                  >
                    <div>
                      {m.type !== 'text' && (
                        <Tag color={TYPE_COLOR[m.type]} style={{ marginRight: 6 }}>
                          {TYPE_LABEL[m.type]}
                        </Tag>
                      )}
                      {m.content}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
                      {new Date(m.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      {mine ? (m.readAt ? ' · 已读' : ' · 未读') : null}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* 底部输入区 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <Input.TextArea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`发消息给 ${active.name}…（Enter 发送，Shift+Enter 换行）`}
              autoSize={{ minRows: 1, maxRows: 4 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={() => void handleSend()} style={{ background: VI.primary, borderColor: VI.primary }}>
              发送
            </Button>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
