/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 告警订阅 Hook：监听 critical:alert 通道
 */
import { useEffect, useState, useCallback } from 'react';
import { wsClient } from '@/services/websocket';
import type { Alert } from '@/types/medical';

export interface LiveAlert extends Alert {
  receivedAt: number;
}

export function useAlert() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [latest, setLatest] = useState<LiveAlert | null>(null);

  useEffect(() => {
    wsClient.connect();
    const off = wsClient.on('critical:alert', (msg) => {
      const item = { ...(msg.payload as Alert), receivedAt: Date.now() };
      setAlerts((prev) => [item, ...prev].slice(0, 100));
      setLatest(item);
    });
    return off;
  }, []);

  const ack = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  }, []);

  const clearAcknowledged = useCallback(() => {
    setAlerts((prev) => prev.filter((a) => !a.acknowledged));
  }, []);

  return { alerts, latest, ack, clearAcknowledged };
}
