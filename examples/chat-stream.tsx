/**
 * 健澜科技数智医院智能体 - 示例：对话流式输出（React Hook）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect } from 'react';
import { chatApi } from '@/services/api';
import { useChatStream } from '@/services/websocket';

export function ChatPanel({ conversationId }: { conversationId: string }) {
  const { content, thinking, toolCalls, streaming, start, reset } = useChatStream(conversationId);

  useEffect(() => {
    // 进入会话即订阅 chat.stream
    start(conversationId);
    return () => reset();
  }, [conversationId, start, reset]);

  async function send(text: string) {
    // 同步首包
    await chatApi.sendMessage(conversationId, { content: text, stream: true });
    // 后续 content_delta 由 useChatStream 自动累积到 content
  }

  return (
    <div>
      <div className="thinking">{thinking}</div>
      <div className="content">{content}</div>
      <div className="tools">{toolCalls.map((t) => t.toolLabel)}</div>
      <button onClick={() => send('帮我看一下这个患者的检验结果')}>提问</button>
      {streaming && <span>生成中…</span>}
    </div>
  );
}
