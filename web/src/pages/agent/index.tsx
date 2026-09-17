/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * AI 问诊 / 智能体对话页
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Input } from 'antd';
import { RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';

import { PageContainer, EmptyState } from '@/components/common';
import { usePageTitle } from '@/hooks';
import { chatApi } from '@/services';
import { useChatStore } from '@/store/chatStore';
import { formatRelative } from '@/utils/format';
import { uid } from '@/mock/utils';

export default function AgentChat() {
  usePageTitle('AI 问诊');
  const { messages, appendMessage, streaming, setStreaming } = useChatStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    const conversationId = 'demo-conv';
    appendMessage({
      id: uid('msg_'),
      conversationId,
      role: 'user',
      content: text,
      status: 'done',
      createdAt: new Date().toISOString(),
    });
    setStreaming(true);
    try {
      const reply = await chatApi.sendChatMessage(conversationId, text);
      appendMessage(reply);
    } catch {
      appendMessage({
        id: uid('msg_'),
        conversationId,
        role: 'assistant',
        content: '服务暂时不可用，请稍后重试。',
        status: 'error',
        createdAt: new Date().toISOString(),
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <PageContainer title="AI 问诊" description="健澜数智医院智能体 · 临床决策辅助（演示数据）">
      <Card className="flex h-[calc(100vh-220px)] flex-col">
        <div className="flex-1 overflow-y-auto pr-2">
          {messages.length === 0 && <EmptyState description="开始与 AI 医生对话吧" />}
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
                <div>
                  <div className="text-sm">{m.content}</div>
                  <div
                    className={`mt-1 text-xs ${m.role === 'user' ? 'text-white/70' : 'text-ink-secondary'}`}
                  >
                    {formatRelative(m.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 flex gap-2">
          <Input
            placeholder="输入您的问题，例如：王** 的血钾危急值如何处理？"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={send}
            disabled={streaming}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={send} loading={streaming}>
            发送
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}
