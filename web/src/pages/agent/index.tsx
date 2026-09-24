/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * AI 问诊 / 智能体对话页（/agent）
 *  - 左侧：会话列表（真实 API listConversations）+ 新建会话（createConversation）
 *  - 右侧：消息流（getMessages 历史）+ 发送（sendMessage）+ WebSocket 流式增量
 *  - 加载 / 错误 / 正在输入 状态齐全；真实模式下刷新历史仍在。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, List, Spin, Tag, message as antdMessage } from 'antd';
import {
  MessageOutlined,
  PlusOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';

import { PageContainer, EmptyState, MarkdownLite } from '@/components/common';
import { usePageTitle } from '@/hooks';
import { useChatStore } from '@/store/chatStore';
import { listConversations, createConversation, getMessages, sendMessage } from '@/api/chat';
import { chatWs } from '@/api/websocket';
import { isDemoMode } from '@/config';
import { formatRelative } from '@/utils/format';
import { uid } from '@/mock/utils';
import type { Conversation } from '@/types/chat';

const SKELETON_WATCHDOG_MS = 8000;

export default function AgentChat() {
  usePageTitle('AI 问诊');
  const {
    conversations,
    currentConversationId,
    messages,
    streaming,
    setConversations,
    selectConversation,
    setMessages,
    appendMessage,
    upsertMessage,
    finishStreaming,
    setStreaming,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* 会话列表加载 */
  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    setConvError(null);
    try {
      const list = await listConversations();
      setConversations(list);
    } catch (e) {
      setConvError(e instanceof Error ? e.message : '会话列表加载失败');
      setConversations([]);
    } finally {
      setLoadingConvs(false);
    }
  }, [setConversations]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  /* 切换会话 → 拉取历史 */
  useEffect(() => {
    if (!currentConversationId) {
      setMessages([]);
      return;
    }
    let alive = true;
    setLoadingMsgs(true);
    getMessages(currentConversationId)
      .then((list) => {
        if (alive) setMessages(list);
      })
      .catch((e) => {
        if (!alive) return;
        setMessages([]);
        antdMessage.error(e instanceof Error ? e.message : '消息历史加载失败');
      })
      .finally(() => {
        if (alive) setLoadingMsgs(false);
      });
    return () => {
      alive = false;
    };
  }, [currentConversationId, setMessages]);

  /* 订阅 WebSocket 流式增量（只挂一次，通过 getState 读取最新会话） */
  useEffect(() => {
    chatWs.connect();
    const offDelta = chatWs.onDelta((p) => {
      const state = useChatStore.getState();
      if (p.conversationId !== state.currentConversationId) return;
      // 增量累加到对应助手消息；done 时收尾
      if (p.delta) state.updateStreaming(p.messageId, p.delta);
      if (p.done) state.finishStreaming(p.messageId);
    });
    const offDone = chatWs.onDone((payload) => {
      const state = useChatStore.getState();
      if (payload?.conversationId && payload.conversationId !== state.currentConversationId) return;
      // 兜底：结束当前流式消息
      const last = [...state.messages].reverse().find((m) => m.status === 'streaming');
      if (last) state.finishStreaming(last.id);
    });
    const offErr = chatWs.onError((e) => {
      antdMessage.error(e.message || 'AI 处理失败，请稍后重试');
      useChatStore.getState().setStreaming(false);
    });
    return () => {
      offDelta();
      offDone();
      offErr();
    };
  }, []);

  /* 滚动到底部 */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMsgs]);

  useEffect(
    () => () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    },
    [],
  );

  /** 演示模式下：把完整回复按片段喂入，模拟逐字流式 */
  const simulateStreaming = useCallback((messageId: string, fullText: string) => {
    let i = 0;
    const step = Math.max(2, Math.ceil(fullText.length / 40));
    typingTimerRef.current = setInterval(() => {
      i += step;
      const slice = fullText.slice(0, i);
      // 先清空骨架占位，再按累积文本更新（updateStreaming 是追加，这里直接整体覆写 content）
      const state = useChatStore.getState();
      const target = state.messages.find((m) => m.id === messageId);
      if (target) {
        upsertMessage({ ...target, content: slice, delta: slice.slice(-step) });
      }
      if (i >= fullText.length) {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        finishStreaming(messageId);
      }
    }, 30);
  }, [finishStreaming, upsertMessage]);

  /** 新建会话 */
  const handleCreate = useCallback(async () => {
    try {
      const conv = await createConversation();
      setConversations([conv, ...useChatStore.getState().conversations]);
      selectConversation(conv.id);
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : '新建会话失败');
    }
  }, [setConversations, selectConversation]);

  /** 发送 */
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    setConvError(null);

    // 确保有当前会话：无则用首句作为标题新建
    let convId = useChatStore.getState().currentConversationId;
    if (!convId) {
      try {
        const conv = await createConversation(text.slice(0, 20) || '新对话');
        setConversations([conv, ...useChatStore.getState().conversations]);
        selectConversation(conv.id);
        convId = conv.id;
      } catch (e) {
        antdMessage.error(e instanceof Error ? e.message : '新建会话失败');
        return;
      }
    }

    const userMsgId = uid('msg_');
    appendMessage({
      id: userMsgId,
      conversationId: convId,
      role: 'user',
      content: text,
      status: 'done',
      createdAt: new Date().toISOString(),
    });
    setStreaming(true);

    try {
      const { message } = await sendMessage(convId, text);
      // 先落一条助手骨架消息
      upsertMessage({ ...message, content: isDemoMode ? '' : message.content });

      if (isDemoMode) {
        // 演示模式无真实 WS：本地逐字动画
        simulateStreaming(message.id, message.content);
      } else {
        // 真实模式：触发 WS 流式；同时设看门狗，防止后端不推 delta 时卡住
        chatWs.connect();
        chatWs.sendMessage(text, convId);
        setTimeout(() => {
          const st = useChatStore.getState();
          const cur = st.messages.find((m) => m.id === message.id);
          if (cur && cur.status === 'streaming') {
            st.finishStreaming(message.id);
          }
        }, SKELETON_WATCHDOG_MS);
      }
    } catch (e) {
      appendMessage({
        id: uid('msg_'),
        conversationId: convId,
        role: 'assistant',
        content: e instanceof Error ? e.message : '服务暂时不可用，请稍后重试。',
        status: 'error',
        createdAt: new Date().toISOString(),
      });
      setStreaming(false);
    }
  }, [input, streaming, appendMessage, upsertMessage, setStreaming, selectConversation, setConversations, simulateStreaming]);

  const activeConv: Conversation | undefined = conversations.find(
    (c) => c.id === currentConversationId,
  );

  return (
    <PageContainer
      title="AI 问诊"
      description={
        isDemoMode
          ? '健澜数智医院智能体 · 演示模式（本地 Mock，不持久化）'
          : '健澜数智医院智能体 · 临床决策辅助（连接 BFF 实时对话）'
      }
    >
      <div className="flex gap-3" style={{ height: 'calc(100vh - 220px)' }}>
        {/* 左侧会话列表 */}
        <div
          className="flex w-64 flex-col rounded-lg border border-ink-border bg-white"
          style={{ flexShrink: 0 }}
        >
          <div className="p-2">
            <Button
              type="primary"
              block
              icon={<PlusOutlined />}
              style={{ background: '#0A4D8C' }}
              onClick={handleCreate}
            >
              新建会话
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {loadingConvs && (
              <div className="flex justify-center py-6">
                <Spin size="small" />
              </div>
            )}
            {!loadingConvs && convError && (
              <div className="px-2 py-4 text-center text-xs" style={{ color: '#cf1322' }}>
                {convError}
                <Button size="small" type="link" onClick={loadConversations}>
                  重试
                </Button>
              </div>
            )}
            {!loadingConvs && !convError && conversations.length === 0 && (
              <div className="py-8 text-center text-xs text-ink-secondary">暂无会话</div>
            )}
            <List
              size="small"
              dataSource={conversations}
              rowKey="id"
              renderItem={(c) => (
                <List.Item
                  onClick={() => selectConversation(c.id)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 6,
                    padding: '8px 10px',
                    background: c.id === currentConversationId ? '#E6F0FA' : undefined,
                  }}
                >
                  <List.Item.Meta
                    avatar={<MessageOutlined style={{ color: '#0A4D8C' }} />}
                    title={<span className="text-sm">{c.title}</span>}
                    description={
                      <span className="text-[11px] text-ink-secondary">
                        {formatRelative(c.lastMessageAt)} · {c.messageCount} 条
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        </div>

        {/* 右侧对话区 */}
        <div className="flex flex-1 flex-col rounded-lg border border-ink-border bg-white">
          <div
            className="flex items-center justify-between border-b border-ink-border px-4 py-2"
            style={{ background: '#F5F7FA' }}
          >
            <span className="text-sm font-semibold">
              {activeConv?.title ?? '开始新对话'}
            </span>
            {isDemoMode && <Tag color="orange">演示模式</Tag>}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loadingMsgs && (
              <div className="flex h-full items-center justify-center">
                <Spin tip="加载历史…" />
              </div>
            )}
            {!loadingMsgs && messages.length === 0 && (
              <EmptyState description="选择左侧会话，或新建会话开始与 AI 医生对话" />
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`mb-4 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex max-w-[70%] gap-2 rounded-lg p-3 ${
                    m.role === 'user' ? 'bg-jl-primary text-white' : 'bg-ink-bg'
                  }`}
                >
                  <span className="mt-0.5">
                    {m.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  </span>
                  <div className="min-w-0">
                    {m.role === 'assistant' ? (
                      <MarkdownLite text={m.content || '…'} />
                    ) : (
                      <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>
                    )}
                    <div
                      className={`mt-1 text-xs ${
                        m.role === 'user' ? 'text-white/70' : 'text-ink-secondary'
                      }`}
                    >
                      {m.status === 'error' ? '发送失败' : formatRelative(m.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {streaming && (
              <div className="mb-4 flex items-center gap-2 text-xs text-ink-secondary">
                <RobotOutlined style={{ color: '#0A4D8C' }} />
                AI 正在输入…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 border-t border-ink-border p-3">
            <Input
              placeholder="输入您的问题，例如：3 床患者的血钾危急值如何处理？"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={handleSend}
              disabled={streaming}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              style={{ background: '#0A4D8C' }}
              onClick={handleSend}
              loading={streaming}
            >
              发送
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
