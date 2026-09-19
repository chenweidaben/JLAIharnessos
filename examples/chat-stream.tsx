/**
 * 健澜科技数智医院智能体 - 示例：对话流式输出（React Hook）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 契约（与后端 src/bff/server.ts 的 /ws/chat 对齐）：
 *  - 客户端发送 { event: 'agent:start', conversationId }
 *  - 服务端按 token/分片推送 { event: 'agent:delta', payload: { conversationId, messageId, delta, done } }
 *  - 结束推送 { event: 'agent:done', payload: { conversationId, messageId } }
 *  - 心跳：客户端发 { event: 'heartbeat' }，服务端回 { event: 'heartbeat' }
 *  - 危急值实时告警：服务端广播 { event: 'critical:alert', payload: Alert }
 */

import { useEffect } from 'react';
import { chatApi } from '@/services/api';
import { useChatStream } from '@/hooks/useChatStream';

export function ChatPanel({ conversationId }: { conversationId: string }) {
  const { content, streaming, start, reset } = useChatStream(conversationId);

  useEffect(() => {
    // 进入会话即订阅 agent:delta 流式分片
    start(conversationId);
    return () => reset();
  }, [conversationId, start, reset]);

  async function send(text: string) {
    // 同步落库首包，后续 agent:delta 由 useChatStream 自动累积到 content
    await chatApi.sendChatMessage(conversationId, text);
  }

  return (
    <div>
      <div className="content whitespace-pre-wrap">{content}</div>
      <button onClick={() => send('帮我看一下这个患者的检验结果')}>提问</button>
      {streaming && <span>生成中…</span>}
    </div>
  );
}
