/**
 * MEDMUSE 岗位智能体聊天页（M89-H）
 *
 * 功能：
 *   - 左侧会话列表：GET /api/v1/medmuse/sessions
 *   - 右侧消息区：用户右对齐（深海蓝 #0B3D6B），agent 左对齐（白底），
 *     下方显示 confidence 标签（high=绿/medium=黄/low=灰）+ 小字免责声明；
 *   - 工具调用消息（role=tool）渲染为可折叠卡片：显示工具名 + 结果摘要，
 *     点击展开查看完整返回（JSON 自动美化）；
 *   - 审批请求内联在消息流中：展示「批准」「驳回」按钮，点击调 decideApproval；
 *   - 底部输入框：POST /api/v1/medmuse/sessions/:id/chat，自动带 Idempotency-Key；
 *   - 顶部角色选择器：主治/住院/护士/药师/医保办/患者，切换后用对应 roleCode 新建会话。
 *
 * 深海蓝主题：主色 #0B3D6B，辅助背景 #E8F0F8。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
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
  ThunderboltOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
import { usePageTitle } from '@/hooks';
import {
  createSession,
  decideApproval,
  listApprovals,
  listMessages,
  listSessions,
  sendMessage,
  type MedmuseApproval,
  type MedmuseChatResult,
  type MedmuseMessage,
  type MedmuseSession,
} from '@/services/medmuseApi';
import { streamMedmuseReply } from '@/services/medmuseStream';

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

/** 快捷指令：点击后直接把对应指令文本填入并发送 */
const QUICK_COMMANDS = [
  { label: '交班报告', text: '请生成今日交班报告' },
  { label: '在管患者', text: '列出我在管的患者' },
  { label: '待审医嘱', text: '列出待审核的医嘱' },
  { label: '超支病例', text: '列出费用超支的病例' },
] as const;

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

/** 会话列表按最近活跃时间倒序（不依赖后端返回顺序，保证"最新在上"） */
function sortSessionsByRecent<T extends MedmuseSession>(list: T[]): T[] {
  return [...list].sort(
    (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime(),
  );
}

/** 工具返回内容摘要：取首个非空行并截断，避免卡片头过长 */
function summarizeToolContent(content: string, max = 80): string {
  if (!content) return '（无返回内容）';
  const firstLine = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)[0] ?? '';
  const text = firstLine.replace(/\s+/g, ' ');
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * 把工具入参/结果对象美化成可读 JSON 文本。
 * 入参 args 可能是对象、JSON 字符串或标量，统一兜底；空值返回空串。
 */
function prettyJson(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** 审批风险等级 → 标签配色 */
function riskColor(level: MedmuseApproval['riskLevel']): string {
  if (level === 'critical') return 'red';
  if (level === 'warning') return 'orange';
  return 'blue';
}

/** 审批风险等级 → 中文文案 */
function riskText(level: MedmuseApproval['riskLevel']): string {
  if (level === 'critical') return '高危';
  if (level === 'warning') return '中风险';
  return '低风险';
}

/** 工具调用消息卡片：折叠显示工具名 + 结果摘要，展开同屏查看「入参 / 结果」 */
function ToolCallCard({ message }: { message: MedmuseMessage }) {
  const [open, setOpen] = useState(false);
  // 入参包落库为 toolCalls:[{ id, name, args }]，取首项即本次调用
  const firstCall =
    Array.isArray(message.toolCalls) && message.toolCalls.length > 0
      ? message.toolCalls[0]
      : null;
  const toolName = message.toolName ?? firstCall?.name ?? '未知工具';
  const args = firstCall?.args ?? null;
  const result = message.toolResult ?? null;

  // 折叠头摘要：优先摘要结果 JSON，结果缺失再退回 content（“xx 执行完成”）
  const summarySource =
    result != null ? prettyJson(result) : message.content || '（无返回内容）';
  const argsText = prettyJson(args);
  const resultText = prettyJson(result) || message.content || '（无返回内容）';

  const preStyle: CSSProperties = {
    fontSize: 11,
    margin: '4px 0 0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    background: '#fff',
    border: '1px solid #e5e9f0',
    borderRadius: 6,
    padding: 8,
  };

  return (
    <div
      style={{
        maxWidth: '72%',
        background: '#f4f7fb',
        border: '1px dashed #b9c9dd',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 12,
      }}
    >
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: '#4a5a70',
        }}
      >
        <ToolOutlined style={{ color: PRIMARY }} />
        <b style={{ color: PRIMARY }}>{toolName}</b>
        <span
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: '#7a8699',
          }}
        >
          {summarizeToolContent(summarySource)}
        </span>
        <span style={{ color: '#999' }}>{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: PRIMARY, fontWeight: 600, marginBottom: 2 }}>
              入参
            </div>
            <pre style={preStyle}>{argsText || '（无入参）'}</pre>
          </div>
          <div>
            <div style={{ fontSize: 11, color: PRIMARY, fontWeight: 600, marginBottom: 2 }}>
              结果
            </div>
            <pre style={preStyle}>{resultText}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MedMuseChatPage() {
  usePageTitle('MEDMUSE 岗位智能体');

  const [roleCode, setRoleCode] = useState<RoleCode>('attending');
  const [sessions, setSessions] = useState<MedmuseSession[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MedmuseMessage[]>([]);
  /** 当前会话内联待审批工单（消息流中渲染「批准/驳回」卡片） */
  const [inlineApprovals, setInlineApprovals] = useState<MedmuseApproval[]>([]);
  const [input, setInput] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  /** 正在流式输出的 agent 气泡 id（打字机光标高亮），null = 无流式 */
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* 加载会话列表 */
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const list = await listSessions();
      const sorted = sortSessionsByRecent(list);
      setSessions(sorted);
      if (!currentId && sorted.length > 0) {
        setCurrentId(sorted[0].id);
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

  /* 按会话拉取待审批工单，以服务端为准刷新内联审批卡片 */
  const refreshApprovals = useCallback(async (sessionId: string) => {
    try {
      const list = await listApprovals('pending');
      setInlineApprovals(list.filter((a) => a.sessionId === sessionId));
    } catch {
      /* 审批列表非关键路径，静默 */
    }
  }, []);

  /* 切换会话 → 拉历史 + 待审批工单 */
  useEffect(() => {
    if (!currentId) {
      setMessages([]);
      setInlineApprovals([]);
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
    listApprovals('pending')
      .then((list) => {
        if (alive) setInlineApprovals(list.filter((a) => a.sessionId === currentId));
      })
      .catch(() => {
        /* 审批列表非关键路径，静默 */
      });
    return () => {
      alive = false;
    };
  }, [currentId]);

  /* 滚动到底部 */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, inlineApprovals, loadingMsgs]);

  /** 新建会话：按当前角色 roleCode 创建 */
  const handleCreate = useCallback(async () => {
    try {
      const { session } = await createSession(roleCode, `${ROLE_OPTIONS.find((r) => r.value === roleCode)?.label ?? roleCode}对话`);
      setSessions((prev) => [session, ...prev]);
      setCurrentId(session.id);
      setMessages([]);
      setInlineApprovals([]);
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : '新建会话失败');
    }
  }, [roleCode]);

  /** 一次性发送（fallback）：保留原有 POST chat 逻辑，流式失败/不支持时兜底 */
  const legacySend = useCallback(async (sessionId: string, text: string) => {
    const result: MedmuseChatResult = await sendMessage(sessionId, text);
    if (result?.message) {
      setMessages((prev) => [...prev, result.message!]);
    } else if (result?.reply) {
      setMessages((prev) => [
        ...prev,
        {
          id: `local-agent-${Date.now()}`,
          sessionId,
          role: 'assistant',
          content: result.reply!,
          confidence: result.confidence ?? 'low',
          disclaimer: result.disclaimer ?? null,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    if (result?.pendingApproval) {
      setInlineApprovals((prev) =>
        prev.some((a) => a.id === result.pendingApproval!.id)
          ? prev
          : [...prev, result.pendingApproval!],
      );
    }
  }, []);

  /** 发送消息：优先 SSE 流式打字机输出；失败自动回退到一次性发送 */
  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
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
      const sid = sessionId!;
      const optimistic: MedmuseMessage = {
        id: `local-${Date.now()}`,
        sessionId: sid,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      // 先挂一个空的 agent 气泡，流式片段逐帧追加进去形成打字机效果
      const streamId = `local-agent-stream-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: streamId,
          sessionId: sid,
          role: 'assistant',
          content: '',
          confidence: 'medium',
          disclaimer: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      setStreamingId(streamId);

      // 用流式片段原地更新该气泡
      const patchStream = (fn: (m: MedmuseMessage) => MedmuseMessage) =>
        setMessages((prev) => prev.map((m) => (m.id === streamId ? fn(m) : m)));

      try {
        await streamMedmuseReply(
          sid,
          text,
          {
            onDelta: (piece: string) => patchStream((m) => ({ ...m, content: m.content + piece })),
            onMeta: (meta: { confidence?: 'high' | 'medium' | 'low' | null; disclaimer?: string | null }) =>
              patchStream((m) => ({
                ...m,
                confidence: meta.confidence ?? m.confidence,
                disclaimer: meta.disclaimer ?? m.disclaimer,
              })),
          },
        );
      } catch (e) {
        // 流式失败：撤掉空气泡，回退到一次性发送（保留旧行为）
        setMessages((prev) => prev.filter((m) => m.id !== streamId));
        try {
          await legacySend(sid, text);
        } catch (err) {
          antdMessage.error(err instanceof Error ? err.message : '发送失败');
        }
      } finally {
        setStreamingId(null);
        setSending(false);
        // 发送完成后本地把当前会话置顶（刷新 lastActiveAt），保持倒序展示
        setSessions((prev) =>
          sortSessionsByRecent(
            prev.map((s) => (s.id === sid ? { ...s, lastActiveAt: new Date().toISOString() } : s)),
          ),
        );
        // 以服务端为准刷新本会话待审批工单（流式路径后端可能新产生审批）
        void refreshApprovals(sid);
      }
    },
    [input, sending, currentId, roleCode, legacySend, refreshApprovals],
  );

  /** 审批决议：点击内联审批卡片的「批准/驳回」按钮 */
  const handleDecide = useCallback(async (approval: MedmuseApproval, approved: boolean) => {
    try {
      await decideApproval(approval.id, approved, approved ? 'approve via chat' : 'reject via chat');
      antdMessage.success(approved ? '已批准' : '已驳回');
      setInlineApprovals((prev) => prev.filter((a) => a.id !== approval.id));
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : '审批失败');
    }
  }, []);

  const activeRoleLabel = ROLE_OPTIONS.find((r) => r.value === roleCode)?.label ?? roleCode;
  /** 渲染用的倒序列表（最新活跃在上） */
  const sortedSessions = sortSessionsByRecent(sessions);

  return (
    <PageContainer title="MEDMUSE 岗位智能体" description="健澜AI原生医院操作系统OS · 多岗位 AI 副驾（confidence + 免责声明）">
      <style>{`@keyframes medmuse-blink { 50% { opacity: 0; } }`}</style>
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
          <div
            style={{
              padding: '8px 10px',
              background: BG_SOFT,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 600, color: PRIMARY }}>
              会话列表（{sessions.length}）
            </span>
            <Button
              size="small"
              type="text"
              icon={<PlusOutlined />}
              style={{ color: PRIMARY }}
              onClick={handleCreate}
              title={`新建${activeRoleLabel}会话`}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingSessions && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spin size="small" />
              </div>
            )}
            {!loadingSessions && sortedSessions.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>暂无会话</div>
            )}
            <List
              size="small"
              dataSource={sortedSessions}
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
            {messages.map((m) =>
              m.role === 'tool' ? (
                /* 工具调用消息：可折叠卡片 */
                <div
                  key={m.id}
                  style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}
                >
                  <ToolCallCard message={m} />
                </div>
              ) : (
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
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>
                      {m.content}
                      {m.id === streamingId && (
                        <span style={{ color: PRIMARY, animation: 'medmuse-blink 1s step-end infinite' }}>▍</span>
                      )}
                    </div>

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
              ),
            )}

            {/* 审批请求内联卡片：批准/驳回调 decideApproval */}
            {inlineApprovals
              .filter((a) => a.sessionId === currentId)
              .map((a) => (
                <div
                  key={a.id}
                  style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}
                >
                  <Card
                    size="small"
                    style={{ maxWidth: '72%', borderColor: '#fa8c16', background: '#fff7e6' }}
                    title={
                      <span>
                        <ToolOutlined style={{ color: '#fa8c16' }} /> 需要审批 · 工具 <b>{a.toolName}</b>{' '}
                        <Tag color={riskColor(a.riskLevel)} style={{ fontSize: 11, margin: 0 }}>
                          {riskText(a.riskLevel)}
                        </Tag>
                      </span>
                    }
                  >
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                      该写操作等待您的二次确认，批准后将实际执行。
                    </div>
                    <Collapse
                      size="small"
                      style={{ marginBottom: 8, background: '#fff' }}
                      items={[
                        {
                          key: 'payload',
                          label: <span style={{ fontSize: 12 }}>查看请求参数</span>,
                          children: (
                            <pre
                              style={{
                                fontSize: 11,
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                              }}
                            >
                              {JSON.stringify(a.payload, null, 2)}
                            </pre>
                          ),
                        },
                      ]}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        style={{ background: '#52c41a', borderColor: '#52c41a' }}
                        loading={sending}
                        onClick={() => handleDecide(a, true)}
                      >
                        批准
                      </Button>
                      <Button
                        danger
                        size="small"
                        icon={<CloseOutlined />}
                        loading={sending}
                        onClick={() => handleDecide(a, false)}
                      >
                        驳回
                      </Button>
                    </div>
                  </Card>
                </div>
              ))}

            <div ref={bottomRef} />
          </div>

          {/* 快捷指令按钮组：点击即填入指令文本并发送 */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              padding: '8px 12px 0',
              borderTop: '1px solid #e5e9f0',
              background: '#fff',
            }}
          >
            {QUICK_COMMANDS.map((c) => (
              <Button
                key={c.label}
                size="small"
                icon={<ThunderboltOutlined />}
                style={{ borderColor: PRIMARY, color: PRIMARY }}
                disabled={sending}
                onClick={() => handleSend(c.text)}
              >
                {c.label}
              </Button>
            ))}
          </div>

          {/* 底部输入框 */}
          <div style={{ display: 'flex', gap: 8, padding: 12, background: '#fff' }}>
            <Input
              placeholder={`向${activeRoleLabel}智能体提问…（写操作会触发审批卡片）`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={() => handleSend()}
              disabled={sending}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              style={{ background: PRIMARY, borderColor: PRIMARY }}
              loading={sending}
              onClick={() => handleSend()}
            >
              发送
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
