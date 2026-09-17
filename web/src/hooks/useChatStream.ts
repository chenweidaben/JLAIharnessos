/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 对话流式输出 Hook：聚合 agent:delta / agent:done 事件
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { wsClient } from '@/services/websocket';
import type { AgentDeltaPayload } from '@/types/chat';

export function useChatStream(conversationId?: string) {
  const [content, setContent] = useState('');
  const [streaming, setStreaming] = useState(false);
  const convRef = useRef(conversationId);
  convRef.current = conversationId;

  useEffect(() => {
    wsClient.connect();
    const off = wsClient.on('agent:delta', (msg) => {
      const p = msg.payload as AgentDeltaPayload;
      if (convRef.current && p.conversationId !== convRef.current) return;
      setContent((prev) => prev + p.delta);
      setStreaming(!p.done);
    });
    const offDone = wsClient.on('agent:done', () => setStreaming(false));
    return () => {
      off();
      offDone();
    };
  }, []);

  const reset = useCallback(() => {
    setContent('');
    setStreaming(false);
  }, []);

  const start = useCallback(
    (convId: string) => {
      reset();
      wsClient.send({ event: 'agent:start', conversationId: convId });
    },
    [reset],
  );

  return { content, streaming, reset, start };
}
