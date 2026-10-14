/**
 * MEDMUSE 岗位智能体聊天页（M89-H）
 *
 * 功能：
 *   - 左侧会话列表：GET /api/v1/medmuse/sessions
 *   - 右侧消息区：用户右对齐（深海蓝 #0B3D6B），agent 左对齐（白底），
 *     下方显示 confidence 标签（high=绿/medium=黄/low=灰）+ 小字免责声明；
 *   - 工具调用渲染为折叠卡片；
 *   - 底部输入框：POST /api/v1/medmuse/sessions/:id/chat，自动带 Idempotency-Key；
 *   - 审批卡片：pendingApproval 时展示"批准/驳回"按钮，调 decideApproval；
 *   - 顶部角色选择器：主治/住院/护士/药师/医保办/患者，切换后用对应 roleCode 新建会话。
 *
 * 深海蓝主题：主色 #0B3D6B，辅助背景 #E8F0F8。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Collapse,
  Input,
  List,
  Select,
  Spin,
  Tag,
  message as antdMessage,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  RobotOutlined,
  SendOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
import { usePageTitle } from '@/hooks';
import {
  createSession,
  decideApproval,
  listMessages,
  listSessions,
  sendMessage,
  type MedmuseApproval,
  type MedmuseChatResult,
  type MedmuseMessage,
  type MedmuseSession,
} from '@/services/medmuseApi';

const PRIMARY = '#0B3D6B';
const BG_SOFT = '#E8F0F8';

/** 角色选项（与 agentRegistry 中的 roleCode 一一对应） */
const ROLE_OPTIONS = [
  { value: 'attending', label: '主治医师' },
  { value: 'resident', label: '住院医师' },
  { value: 'nurse', label: '护士' },
  { value: 'pharmacist', label: '药师' },
  { value: 'insurance_officer', label: '医保办' },
  { value: 'patient', label: '患者' },
] as const;

type RoleCode = (typeof ROLE_OPTIONS)[number]['value'];

/** confidence → 标签配色 */
function confidenceColor(level?: 'high' | 'medium' | 'low' | null): string {
  if (level === 'high') return 'green';
  if (level === 'medium') return 'orange';
  return 'default';
}

/** confidence → 中文文案 */
function confidenceText(level?: 'high' | 'medium' | 'low' | null): string {
  if (level === 'high') return '高置信';
  if (level === 'medium') return '中置信';
  if (level === 'low') return '低置信';
  return '';
}

export default function MedMuseChatPage() {
  usePageTitle('MEDMUSE 岗位智能体');

  const [roleCode, setRoleCode] = useState<RoleCode>('attending');
  const [sessions, setSessions] = useState<MedmuseSession[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MedmuseMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<MedmuseApproval | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* 加载会话列表 */
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const list = await listSessions();
      setSessions(list);
      if (!currentId && list.length > 0) {
        setCurrentId(list[0].id);
      }
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : '会话列表加载失败');
    } finally {
      setLoadingSessions(false);
    }
  }, [currentId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  /* 切换会话 → 拉历史 */
  useEffect(() => {
    if (!currentId) {
      setMessages([]);
      return;
    }
    let alive = true;
    setLoadingMsgs(true);
    listMessages(currentId)
      .then((list) => {
        if (alive) setMessages(list);
      })
      .catch((e) => {
        if (!alive) return;
        antdMessage.error(e instanceof Error ? e.message : '历史消息加载失败');
      })
      .finally(() => {
        if (alive) setLoadingMsgs(false);
      });
    return () => {
      alive = false;
    };
  }, [currentId]);

  /* 滚动到底部 */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMsgs]);

  /** 新建会话：按当前角色 roleCode 创建 */
  const handleCreate = useCallback(async () => {
    try {
      const { session } = await createSession(roleCode, `${ROLE_OPTIONS.find((r) => r.value === roleCode)?.label ?? roleCode}对话`);
      setSessions((prev) => [session, ...prev]);
      setCurrentId(session.id);
      setMessages([]);
      setPendingApproval(null);
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : '新建会话失败');
    }
  }, [roleCode]);

  /** 发送消息 */
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    let sessionId = currentId;
    if (!sessionId) {
      try {
        const { session } = await createSession(roleCode, text.slice(0, 20) || '新对话');
        setSessions((prev) => [session, ...prev]);
        setCurrentId(session.id);
        sessionId = session.id;
      } catch (e) {
        antdMessage.error(e instanceof Error ? e.message : '新建会话失败');
        return;
      }
    }
    setInput('');
    setSending(true);
    const optimistic: MedmuseMessage = {
      id: `local-${Date.now()}`,
      sessionId: sessionId!,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const result: MedmuseChatResult = await sendMessage(sessionId!, text);
      if (result?.message) {
        setMessages((prev) => [...prev, result.message!]);
      } else if (result?.reply) {
        // 后端 runAgentTurn 返回 reply：agent 回复气泡即时补上；
        // 刷新/切会话后的完整历史由 listMessages 从后端拉取恢复。
        setMessages((prev) => [
          ...prev,
          {
            id: `local-agent-${Date.now()}`,
            sessionId: sessionId!,
            role: 'assistant',
            content: result.reply!,
            confidence: result.confidence ?? 'low',
            disclaimer: result.disclaimer ?? null,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      if (result?.pendingApproval) {
        setPendingApproval(result.pendingApproval);
      }
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : '发送失败');
    } finally {
      setSending(false);
    }
  }, [input, sending, currentId, roleCode]);

  /** 审批决议 */
  const handleDecide = useCallback(
    async (approved: boolean) => {
      if (!pendingApproval) return;
      try {
        await decideApproval(pendingApproval.id, approved, approved ? 'approve via chat' : 'reject via chat');
        antdMessage.success(approved ? '已批准' : '已驳回');
        setPendingApproval(null);
        // 重新发一条空消息触发 agent 继续（若需要）
      } catch (e) {
        antdMessage.error(e instanceof Error ? e.message : '审批失败');
      }
    },
    [pendingApproval],
  );

  const activeRoleLabel = ROLE_OPTIONS.find((r) => r.value === roleCode)?.label ?? roleCode;

  return (
    <PageContainer title="MEDMUSE 岗位智能体" description="健澜数智医院操作系统 · 多岗位 AI 副驾（confidence + 免责声明）">
      {/* 顶部角色选择器 */}
      <div
        style={{
          background: '#fff',
          border: `1px solid #d9e3ef`,
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 12,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <span style={{ color: PRIMARY, fontWeight: 600 }}>当前角色：</span>
        <Select
          value={roleCode}
          options={[...ROLE_OPTIONS]}
          style={{ width: 160 }}
          onChange={(v) => setRoleCode(v as RoleCode)}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: PRIMARY, borderColor: PRIMARY }}
          onClick={handleCreate}
        >
          新建会话（{activeRoleLabel}）
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 12, height: 'calc(100vh - 260px)' }}>
        {/* 左侧会话列表 */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            background: '#fff',
            border: `1px solid #d9e3ef`,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 8, background: BG_SOFT, fontWeight: 600, color: PRIMARY }}>
            会话列表
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingSessions && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spin size="small" />
              </div>
            )}
            {!loadingSessions && sessions.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>暂无会话</div>
            )}
            <List
              size="small"
              dataSource={sessions}
              rowKey="id"
              renderItem={(s) => (
                <List.Item
                  onClick={() => setCurrentId(s.id)}
                  style={{
                    cursor: 'pointer',
                    padding: '10px 12px',
                    background: s.id === currentId ? BG_SOFT : undefined,
                    borderLeft: s.id === currentId ? `3px solid ${PRIMARY}` : '3px solid transparent',
                  }}
                >
                  <List.Item.Meta
                    avatar={<RobotOutlined style={{ color: PRIMARY }} />}
                    title={<span style={{ fontSize: 13 }}>{s.title ?? '未命名会话'}</span>}
                    description={
                      <span style={{ fontSize: 11, color: '#888' }}>
                        {new Date(s.lastActiveAt).toLocaleString()}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        </div>

        {/* 右侧消息区 */}
        <div
          style={{
            flex: 1,
            background: '#fff',
            border: `1px solid #d9e3ef`,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              background: BG_SOFT,
              color: PRIMARY,
              fontWeight: 600,
              borderBottom: '1px solid #d9e3ef',
            }}
          >
            {activeRoleLabel} · {currentId ? '会话 ' + currentId.slice(0, 8) : '请新建会话'}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#fafbfd' }}>
            {loadingMsgs && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spin tip="加载历史…" />
              </div>
            )}
            {!loadingMsgs && messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
                选择左侧会话，或新建会话开始与 {activeRoleLabel} 对话
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    maxWidth: '72%',
                    background: m.role === 'user' ? PRIMARY : '#fff',
                    color: m.role === 'user' ? '#fff' : '#1f1f1f',
                    border: m.role === 'user' ? 'none' : '1px solid #e5e9f0',
                    borderRadius: 10,
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {m.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                    <span style={{ fontSize: 12, opacity: 0.85 }}>
                      {m.role === 'user' ? '我' : 'MEDMUSE'}
                    </span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{m.content}</div>

                  {m.role === 'assistant' && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {m.confidence && (
                        <Tag color={confidenceColor(m.confidence)} style={{ fontSize: 11, margin: 0 }}>
                          {confidenceText(m.confidence)}
                        </Tag>
                      )}
                      <span style={{ fontSize: 10, color: '#999' }}>
                        {m.disclaimer ?? 'AI 辅助建议，最终决策以执业医师/药师为准'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 工具调用折叠卡片 */}
            {pendingApproval && (
              <Collapse
                size="small"
                style={{ marginBottom: 12, background: '#fff8e6', border: '1px solid #ffd591' }}
                items={[
                  {
                    key: 'tool',
                    label: (
                      <span>
                        <ToolOutlined /> 调用工具 <b>{pendingApproval.toolName}</b>（{pendingApproval.riskLevel}）
                      </span>
                    ),
                    children: (
                      <pre style={{ fontSize: 11, margin: 0, whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(pendingApproval.payload, null, 2)}
                      </pre>
                    ),
                  },
                ]}
              />
            )}

            {/* 审批卡片 */}
            {pendingApproval && (
              <Card
                size="small"
                title="需要审批"
                style={{ marginBottom: 12, borderColor: '#fa8c16', background: '#fff7e6' }}
              >
                <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                  工具 <b>{pendingApproval.toolName}</b> 等待您的二次确认。批准后将实际执行写操作。
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    loading={sending}
                    onClick={() => handleDecide(true)}
                  >
                    批准
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    loading={sending}
                    onClick={() => handleDecide(false)}
                  >
                    驳回
                  </Button>
                </div>
              </Card>
            )}

            <div ref={bottomRef} />
          </div>

          {/* 底部输入框 */}
          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #e5e9f0', background: '#fff' }}>
            <Input
              placeholder={`向${activeRoleLabel}智能体提问…（写操作会触发审批卡片）`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={handleSend}
              disabled={sending}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              style={{ background: PRIMARY, borderColor: PRIMARY }}
              loading={sending}
              onClick={handleSend}
            >
              发送
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
