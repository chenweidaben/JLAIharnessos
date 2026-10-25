/**
 * AI 咨询助手对话页（consult-agent M86-E）
 *
 * 功能：
 *   - 左侧会话列表：新建 / 切换会话，展示标题、状态、当前角色；
 *   - 右侧消息流：用户消息右对齐（深海蓝 #0B3D6B），角色回复左对齐（白底）；
 *   - 工具消息（role=tool）折叠卡片：仅展示工具名 + 状态 + 结果摘要，
 *     不展示原始入参（契约 §15-5）；
 *   - 急症 safety:acute：红色 Alert 常驻展示急症引导与命中词；
 *   - 草稿面板：诊断 / 处方草稿，附「需执业医师复核」「非院外处方」标签，
 *     草稿内容标注「AI 辅助建议，待医师复核」；
 *   - 免责声明常驻页面底部，每条 assistant 回复下方附小字免责声明；
 *   - 底部输入框 + 发送按钮，streamReply 流式追加 delta；退出会话调 exitThread。
 *
 * 医疗安全红线：不本地伪造临床结论；AI 草稿一律标注待医师复核；工具入参不下发前端。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Empty,
  Input,
  List,
  Spin,
  Tag,
  Tooltip,
  message as antdMessage,
} from 'antd';
import {
  FileTextOutlined,
  PlusOutlined,
  PoweroffOutlined,
  RobotOutlined,
  SendOutlined,
  ToolOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
import { usePageTitle } from '@/hooks';
import {
  createThread,
  exitThread,
  getDraft,
  listMessages,
  listThreads,
  sendMessage,
  streamReply,
  type ConsultAcutePayload,
  type ConsultDraft,
  type ConsultMessage,
  type ConsultThread,
  type RoleKind,
  type SafetyLevel,
  type ThreadStatus,
} from '@/services/api/consultAgent';

const PRIMARY = '#0B3D6B';
const BG_SOFT = '#E8F0F8';

/** 常驻免责声明（契约 §1.4 DISCLAIMER，与后端字面量一致） */
const DISCLAIMER =
  '本回复由 AI 辅助生成，仅供健康科普与就诊参考，不能替代执业医师/药师的面对面诊断与处方决策；如有急症请立即拨打 120 或前往最近急诊。';

/** 急症旁路引导（契约 §1.4 ACUTE_GUIDANCE） */
const ACUTE_GUIDANCE =
  '检测到可能的急症信号：请立即停止自助问诊，前往最近医疗机构急诊或拨打 120；以下信息仅用于向急救人员描述情况，不构成诊断。';

/** 会话状态 → 中文文案 */
const THREAD_STATUS_TEXT: Record<ThreadStatus, string> = {
  idle: '待开始',
  collecting: '信息收集',
  clarifying: '追问澄清',
  drafting: '草稿生成',
  review_pending: '待医师复核',
  escalated: '急症旁路',
  closed: '已结束',
  aborted: '已中止',
};

/** 会话状态 → 标签配色 */
const THREAD_STATUS_COLOR: Record<ThreadStatus, string> = {
  idle: 'default',
  collecting: 'blue',
  clarifying: 'cyan',
  drafting: 'processing',
  review_pending: 'orange',
  escalated: 'red',
  closed: 'default',
  aborted: 'default',
};

/** 角色 → 中文文案 */
const ROLE_KIND_TEXT: Record<RoleKind, string> = {
  supervisor: '分诊主管',
  examiner: '问诊助手',
  doctor: '医师',
  pharmacist: '药师',
};

/** 安全等级 → 标签文案（normal 不展示标签） */
const SAFETY_TEXT: Record<SafetyLevel, string> = {
  normal: '',
  caution: '需谨慎',
  acute: '急症旁路',
};

/** 安全等级 → 标签配色 */
const SAFETY_COLOR: Record<SafetyLevel, string> = {
  normal: 'default',
  caution: 'orange',
  acute: 'red',
};

/** 按草稿类型替换既有草稿（同类型仅保留最新一份） */
function upsertDraft(prev: ConsultDraft[], draft: ConsultDraft): ConsultDraft[] {
  return [...prev.filter((d) => d.kind !== draft.kind), draft];
}

/** 工具调用折叠卡片：标题仅展示工具名 / 状态；展开后显示脱敏结果摘要，禁止回显原始入参 */
function ConsultToolCard({ message }: { message: ConsultMessage }) {
  const record = message.toolCalls?.[0] ?? null;
  const toolName = message.toolName ?? record?.name ?? '未知工具';
  const summary = record?.summary ?? message.content ?? '（无结果摘要）';
  const statusText =
    record?.status === 'success' ? '成功' : record?.status === 'error' ? '失败' : '跳过';

  return (
    <div
      style={{
        maxWidth: '72%',
        background: '#f4f7fb',
        border: '1px dashed #b9c9dd',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <ToolOutlined style={{ color: PRIMARY }} />
        <b style={{ color: PRIMARY }}>{toolName}</b>
        <Tag color={record?.status === 'error' ? 'red' : 'default'} style={{ margin: 0 }}>
          {statusText}
        </Tag>
        {record?.evidenceCount != null && record.evidenceCount > 0 && (
          <span style={{ color: '#7a8699' }}>证据 {record.evidenceCount} 条</span>
        )}
        {record && record.durationMs > 0 && (
          <span style={{ color: '#7a8699' }}>{record.durationMs}ms</span>
        )}
        {record?.errorClass && <Tag color="red">{record.errorClass}</Tag>}
      </div>
      <Collapse
        size="small"
        ghost
        style={{ marginTop: 6, background: '#fff', border: '1px solid #e5e9f0' }}
        items={[
          {
            key: 'summary',
            label: (
              <Tooltip title="工具调用脱敏摘要，原始入参不下发前端（医疗安全红线）">
                <span style={{ fontSize: 12 }}>结果摘要</span>
              </Tooltip>
            ),
            children: (
              <div
                style={{
                  color: '#4a5a70',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 12,
                }}
              >
                {summary}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

/** AI 草稿卡片：诊断 / 处方建议；复核标签与非院外处方标签按契约字段驱动（zod 字面量强制） */
function ConsultDraftCard({ draft }: { draft: ConsultDraft }) {
  const isPrescription = draft.kind === 'prescription';
  return (
    <Card
      size="small"
      style={{ marginBottom: 12, borderColor: '#d9e3ef' }}
      title={
        <span style={{ color: PRIMARY, fontSize: 13 }}>
          <FileTextOutlined /> {isPrescription ? '用药建议草稿' : '诊断建议草稿'}
        </span>
      }
    >
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {draft.needsPhysicianReview && <Tag color="red">需执业医师复核</Tag>}
        {isPrescription && !draft.isOutOfHospitalPrescription && (
          <Tag color="default">非院外处方</Tag>
        )}
      </div>
      {draft.summary && (
        <div style={{ fontSize: 12, color: '#4a5a70', marginBottom: 8 }}>{draft.summary}</div>
      )}
      <div
        style={{
          fontSize: 12,
          background: '#fafbfd',
          border: '1px solid #e5e9f0',
          borderRadius: 6,
          padding: 8,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          marginBottom: 8,
        }}
      >
        {draft.content}
      </div>
      {draft.evidence.length > 0 && (
        <Collapse
          size="small"
          style={{ marginBottom: 8, background: '#fff' }}
          items={[
            {
              key: 'evidence',
              label: <span style={{ fontSize: 12 }}>证据条目（{draft.evidence.length}）</span>,
              children: draft.evidence.map((item, index) => (
                <div key={`${item.kind}-${index}`} style={{ fontSize: 11, marginBottom: 6 }}>
                  <Tag>{item.label}</Tag>
                  <span style={{ color: '#7a8699' }}>{item.source}</span>
                  <div style={{ color: '#4a5a70', marginTop: 2 }}>{item.snippet}</div>
                </div>
              )),
            },
          ]}
        />
      )}
      <div style={{ fontSize: 11, color: '#999' }}>
        AI 辅助建议，待医师复核，不构成诊断或处方决策。
      </div>
    </Card>
  );
}

export default function ConsultAgentChatPage() {
  usePageTitle('AI 咨询助手');

  const [threads, setThreads] = useState<ConsultThread[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConsultMessage[]>([]);
  const [drafts, setDrafts] = useState<ConsultDraft[]>([]);
  const [acute, setAcute] = useState<ConsultAcutePayload | null>(null);
  const [input, setInput] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* 加载会话列表 */
  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const list = await listThreads();
      setThreads(list);
      if (!currentId && list.length > 0) setCurrentId(list[0].id);
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : '会话列表加载失败');
    } finally {
      setLoadingThreads(false);
    }
  }, [currentId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  /* 刷新当前会话草稿（诊断 / 处方两类，缺省为 null 则不展示） */
  const refreshDrafts = useCallback(async (threadId: string) => {
    try {
      const [diagnosis, prescription] = await Promise.all([
        getDraft(threadId, 'diagnosis'),
        getDraft(threadId, 'prescription'),
      ]);
      setDrafts([diagnosis, prescription].filter((d): d is ConsultDraft => d !== null));
    } catch {
      /* 草稿非关键路径，静默 */
    }
  }, []);

  /* 切换会话 → 拉历史消息与草稿，重置急症 / 错误状态 */
  useEffect(() => {
    if (!currentId) {
      setMessages([]);
      setDrafts([]);
      setAcute(null);
      return;
    }
    let alive = true;
    setLoadingMsgs(true);
    setAcute(null);
    setError(null);
    listMessages(currentId)
      .then((list) => {
        if (alive) setMessages(list);
      })
      .catch((e) => {
        if (alive) antdMessage.error(e instanceof Error ? e.message : '历史消息加载失败');
      })
      .finally(() => {
        if (alive) setLoadingMsgs(false);
      });
    void refreshDrafts(currentId);
    return () => {
      alive = false;
    };
  }, [currentId, refreshDrafts]);

  /* 滚动到底部 */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, drafts, loadingMsgs]);

  /* 卸载时中断进行中的 SSE 流 */
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  /** 新建会话 */
  const handleCreate = useCallback(async () => {
    try {
      const result = await createThread({ title: '新的健康咨询' });
      setThreads((prev) => [result.thread, ...prev]);
      setCurrentId(result.thread.id);
      setMessages(result.messages ?? []);
      setDrafts(result.draft ? [result.draft] : []);
      setAcute(null);
      setError(null);
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : '新建会话失败');
    }
  }, []);

  /** 发送消息：优先 SSE 流式追加 delta；流式失败回退一次性快照发送 */
  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || sending) return;

      let threadId = currentId;
      if (!threadId) {
        try {
          const result = await createThread({
            title: text.slice(0, 20) || '新的健康咨询',
            initialMessage: text,
          });
          setThreads((prev) => [result.thread, ...prev]);
          setCurrentId(result.thread.id);
          setMessages(result.messages ?? []);
          setDrafts(result.draft ? [result.draft] : []);
          threadId = result.thread.id;
        } catch (e) {
          antdMessage.error(e instanceof Error ? e.message : '新建会话失败');
          return;
        }
      }
      if (!threadId) return;
      const sid = threadId;

      setInput('');
      setSending(true);
      setError(null);

      /* 乐观用户气泡 */
      const optimistic: ConsultMessage = {
        id: `local-user-${Date.now()}`,
        threadId: sid,
        role: 'user',
        content: text,
        intent: null,
        roleKind: null,
        toolCalls: null,
        toolName: null,
        safetyLevel: 'normal',
        disclaimer: '',
        traceId: '',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      /* 挂空 assistant 气泡，流式片段逐帧追加形成打字机效果 */
      const streamId = `local-agent-stream-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: streamId,
          threadId: sid,
          role: 'assistant',
          content: '',
          intent: null,
          roleKind: null,
          toolCalls: null,
          toolName: null,
          safetyLevel: 'normal',
          disclaimer: '',
          traceId: '',
          createdAt: new Date().toISOString(),
        },
      ]);
      setStreamingId(streamId);

      let streamFailed = false;
      const patchStream = (fn: (m: ConsultMessage) => ConsultMessage) =>
        setMessages((prev) => prev.map((m) => (m.id === streamId ? fn(m) : m)));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamReply(
          sid,
          text,
          {
            onDelta: (piece) => patchStream((m) => ({ ...m, content: m.content + piece })),
            onTool: (event) => {
              if (event.stage !== 'end') return;
              setMessages((prev) => [
                ...prev,
                {
                  id: `local-tool-${event.callId || Date.now()}`,
                  threadId: sid,
                  role: 'tool',
                  content: event.summary ?? '工具执行完成',
                  intent: null,
                  roleKind: null,
                  toolCalls: [
                    {
                      callId: event.callId,
                      name: event.toolName,
                      status: event.success ? 'success' : 'error',
                      durationMs: 0,
                      evidenceCount: event.evidenceCount ?? 0,
                      errorClass: null,
                      summary: event.summary ?? null,
                    },
                  ],
                  toolName: event.toolName,
                  safetyLevel: 'normal',
                  disclaimer: '',
                  traceId: '',
                  createdAt: new Date().toISOString(),
                },
              ]);
            },
            onAcute: (payload) => setAcute(payload),
            onDraft: (draft) => setDrafts((prev) => upsertDraft(prev, draft)),
            onDisclaimer: (disclaimer) => patchStream((m) => ({ ...m, disclaimer })),
            onMeta: (meta) =>
              patchStream((m) => ({ ...m, disclaimer: meta.disclaimer || m.disclaimer })),
            onDone: () => undefined,
            onError: (code, message) => {
              streamFailed = true;
              setError(`${code}: ${message}`);
              antdMessage.error(message);
            },
          },
          controller.signal,
        );
      } catch (e) {
        streamFailed = true;
        antdMessage.error(e instanceof Error ? e.message : '流式请求失败');
      }

      if (streamFailed) {
        /* 撤掉空气泡，回退一次性快照发送（错误已由 onError 上报，不本地编造回复） */
        setMessages((prev) => prev.filter((m) => m.id !== streamId));
        try {
          const result = await sendMessage(sid, text);
          if (result.message) {
            const message = result.message;
            setMessages((prev) => [...prev, message]);
          }
          if (result.draft) {
            const draft = result.draft;
            setDrafts((prev) => upsertDraft(prev, draft));
          }
          setThreads((prev) => prev.map((t) => (t.id === sid ? result.thread : t)));
        } catch (err) {
          antdMessage.error(err instanceof Error ? err.message : '发送失败');
        }
      }

      setStreamingId(null);
      setSending(false);
      abortRef.current = null;

      /* 以服务端为准刷新历史消息、草稿与会话状态 */
      listMessages(sid)
        .then((list) => setMessages(list))
        .catch(() => undefined);
      void refreshDrafts(sid);
      listThreads()
        .then(setThreads)
        .catch(() => undefined);
    },
    [input, sending, currentId, refreshDrafts],
  );

  /** 退出 / 关闭会话 */
  const handleExit = useCallback(async () => {
    if (!currentId) return;
    setExiting(true);
    try {
      const thread = await exitThread(currentId);
      setThreads((prev) => prev.map((t) => (t.id === thread.id ? thread : t)));
      antdMessage.success('会话已结束');
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : '结束会话失败');
    } finally {
      setExiting(false);
    }
  }, [currentId]);

  const currentThread = threads.find((t) => t.id === currentId) ?? null;
  const isTerminal = currentThread?.status === 'closed' || currentThread?.status === 'aborted';
  /* 历史线程处于急症旁路时，横幅在加载后仍常驻展示；SSE acute 帧优先覆盖引导语 */
  const threadAcute = currentThread?.safetyLevel === 'acute';
  const acuteGuidance = acute?.guidance || ACUTE_GUIDANCE;
  const acuteMatched = acute?.matched ?? [];

  return (
    <PageContainer
      title="AI 咨询助手"
      description="健康咨询分诊 · 医师 / 药师辅助建议，AI 草稿须经执业医师复核"
    >
      {/* 顶部状态条 */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #d9e3ef',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 12,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: PRIMARY, fontWeight: 600 }}>当前会话：</span>
        {currentThread ? (
          <>
            <span style={{ fontSize: 13 }}>{currentThread.title || '未命名会话'}</span>
            <Tag color={THREAD_STATUS_COLOR[currentThread.status]}>
              {THREAD_STATUS_TEXT[currentThread.status]}
            </Tag>
            {currentThread.currentRole && (
              <Tag color="blue">{ROLE_KIND_TEXT[currentThread.currentRole]}</Tag>
            )}
            {currentThread.safetyLevel !== 'normal' && (
              <Tag color={SAFETY_COLOR[currentThread.safetyLevel]}>
                {SAFETY_TEXT[currentThread.safetyLevel]}
              </Tag>
            )}
          </>
        ) : (
          <span style={{ color: '#888', fontSize: 13 }}>请新建或选择会话</span>
        )}
        <div style={{ flex: 1 }} />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: PRIMARY, borderColor: PRIMARY }}
          onClick={handleCreate}
        >
          新建会话
        </Button>
        <Tooltip title="结束当前会话，结束后不可继续发送消息">
          <Button
            danger
            icon={<PoweroffOutlined />}
            loading={exiting}
            disabled={!currentThread || isTerminal}
            onClick={handleExit}
          >
            退出会话
          </Button>
        </Tooltip>
      </div>

      <div style={{ display: 'flex', gap: 12, height: 'calc(100vh - 300px)' }}>
        {/* 左侧会话列表 */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            background: '#fff',
            border: '1px solid #d9e3ef',
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
            <span style={{ fontWeight: 600, color: PRIMARY }}>会话列表（{threads.length}）</span>
            <Button
              size="small"
              type="text"
              icon={<PlusOutlined />}
              style={{ color: PRIMARY }}
              onClick={handleCreate}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingThreads && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spin size="small" />
              </div>
            )}
            {!loadingThreads && threads.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>暂无会话</div>
            )}
            <List
              size="small"
              dataSource={threads}
              rowKey="id"
              renderItem={(thread) => (
                <List.Item
                  onClick={() => setCurrentId(thread.id)}
                  style={{
                    cursor: 'pointer',
                    padding: '10px 12px',
                    background: thread.id === currentId ? BG_SOFT : undefined,
                    borderLeft:
                      thread.id === currentId ? `3px solid ${PRIMARY}` : '3px solid transparent',
                  }}
                >
                  <List.Item.Meta
                    avatar={<RobotOutlined style={{ color: PRIMARY }} />}
                    title={<span style={{ fontSize: 13 }}>{thread.title || '未命名会话'}</span>}
                    description={
                      <span style={{ fontSize: 11, color: '#888' }}>
                        <Tag color={THREAD_STATUS_COLOR[thread.status]} style={{ margin: 0 }}>
                          {THREAD_STATUS_TEXT[thread.status]}
                        </Tag>{' '}
                        {new Date(thread.updatedAt).toLocaleString()}
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
            border: '1px solid #d9e3ef',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#fafbfd' }}>
            {/* 急症旁路 Alert：会话处于 acute 状态或收到 safety:acute 帧时常驻展示 */}
            {(acute || threadAcute) && (
              <Alert
                type="error"
                showIcon
                icon={<WarningOutlined />}
                style={{ marginBottom: 12 }}
                message={
                  <span>
                    <WarningOutlined /> 急症提醒：请立即就医或拨打 120
                  </span>
                }
                description={
                  <div>
                    <div>{acuteGuidance}</div>
                    {acuteMatched.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {acuteMatched.map((word) => (
                          <Tag key={word} color="red">
                            {word}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                }
              />
            )}

            {/* 错误提示 */}
            {error && (
              <Alert
                type="error"
                showIcon
                closable
                style={{ marginBottom: 12 }}
                message="咨询服务异常"
                description={error}
                onClose={() => setError(null)}
              />
            )}

            {loadingMsgs && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spin tip="加载历史…" />
              </div>
            )}

            {!loadingMsgs && messages.length === 0 && (
              <Empty
                description={
                  currentThread
                    ? '暂无消息，开始描述您的健康问题'
                    : '选择左侧会话，或新建会话开始咨询'
                }
                style={{ padding: 40 }}
              />
            )}

            {messages.map((message) =>
              message.role === 'tool' ? (
                <div
                  key={message.id}
                  style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}
                >
                  <ConsultToolCard message={message} />
                </div>
              ) : message.role === 'system' ? (
                <div
                  key={message.id}
                  style={{
                    textAlign: 'center',
                    color: '#888',
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  {message.content}
                </div>
              ) : (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      maxWidth: '72%',
                      background: message.role === 'user' ? PRIMARY : '#fff',
                      color: message.role === 'user' ? '#fff' : '#1f1f1f',
                      border: message.role === 'user' ? 'none' : '1px solid #e5e9f0',
                      borderRadius: 10,
                      padding: '10px 14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      {message.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                      <span style={{ fontSize: 12, opacity: 0.85 }}>
                        {message.role === 'user'
                          ? '我'
                          : message.roleKind
                            ? ROLE_KIND_TEXT[message.roleKind]
                            : 'AI 咨询助手'}
                      </span>
                      {message.role === 'assistant' && message.roleKind && (
                        <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
                          {ROLE_KIND_TEXT[message.roleKind]}
                        </Tag>
                      )}
                      {message.safetyLevel !== 'normal' && (
                        <Tag
                          color={SAFETY_COLOR[message.safetyLevel]}
                          style={{ fontSize: 11, margin: 0 }}
                        >
                          {SAFETY_TEXT[message.safetyLevel]}
                        </Tag>
                      )}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>
                      {message.content}
                      {message.id === streamingId && (
                        <span
                          style={{
                            color: PRIMARY,
                            animation: 'consult-blink 1s step-end infinite',
                          }}
                        >
                          ▍
                        </span>
                      )}
                    </div>
                    {message.role === 'assistant' && (
                      <div style={{ marginTop: 6, fontSize: 10, color: '#999' }}>
                        {message.disclaimer || DISCLAIMER}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}

            <div ref={bottomRef} />
          </div>

          {/* 底部输入框 */}
          <div style={{ display: 'flex', gap: 8, padding: 12, background: '#fff' }}>
            <Input
              placeholder={
                isTerminal
                  ? '会话已结束，不可继续发送消息'
                  : '请描述您的症状、用药或健康问题…（回车发送）'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={() => handleSend()}
              disabled={sending || isTerminal}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              style={{ background: PRIMARY, borderColor: PRIMARY }}
              loading={sending}
              disabled={isTerminal}
              onClick={() => handleSend()}
            >
              发送
            </Button>
          </div>

          {/* 免责声明常驻页面底部 */}
          <div
            style={{
              padding: '8px 12px',
              background: BG_SOFT,
              borderTop: '1px solid #d9e3ef',
              fontSize: 11,
              color: '#5a6b82',
              lineHeight: 1.6,
            }}
          >
            {DISCLAIMER}
          </div>
        </div>

        {/* 草稿面板 */}
        <div
          style={{
            width: 300,
            flexShrink: 0,
            background: '#fff',
            border: '1px solid #d9e3ef',
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
              color: PRIMARY,
              fontWeight: 600,
              borderBottom: '1px solid #d9e3ef',
            }}
          >
            AI 草稿（待执业医师复核）
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {drafts.length === 0 ? (
              <Empty description="暂无诊断 / 处方草稿" style={{ padding: 24 }} />
            ) : (
              drafts.map((draft) => <ConsultDraftCard key={draft.id} draft={draft} />)
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes consult-blink { 50% { opacity: 0; } }`}</style>
    </PageContainer>
  );
}
