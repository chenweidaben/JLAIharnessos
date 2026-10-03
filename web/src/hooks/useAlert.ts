/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 告警订阅 Hook：监听 critical:alert 与 critical:status 通道
 *
 *  - critical:alert：按 id 去重，WebSocket 重连/重复推送不会重复入列；
 *  - critical:status：签收/处置后更新对应告警状态，并驱动 UI 关闭强提醒。
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { wsClient } from '@/services/websocket';
import type { Alert } from '@/types/medical';

export interface LiveAlert extends Alert {
  receivedAt: number;
  /** 业务状态机：raised / acked / resolved（来自 critical:status） */
  businessStatus?: 'raised' | 'acked' | 'resolved';
}

export interface CriticalStatusEvent {
  id: string;
  status: 'raised' | 'acked' | 'resolved';
  actedBy?: string | null;
  note?: string | null;
  at: string;
  receivedAt: number;
}

export function useAlert() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [latest, setLatest] = useState<LiveAlert | null>(null);
  const [statusEvents, setStatusEvents] = useState<CriticalStatusEvent[]>([]);
  // 已见告警 id（去重索引），重连重放/重复推送直接忽略
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    wsClient.connect();

    const offAlert = wsClient.on('critical:alert', (msg) => {
      const item = { ...(msg.payload as Alert), receivedAt: Date.now() };
      const idKey = String(item.id);
      // 同一危急值（重连重放/重复推送）只处理一次，不重复入列、不覆盖 latest
      if (seenIdsRef.current.has(idKey)) return;
      seenIdsRef.current.add(idKey);
      setAlerts((prev) => [item, ...prev].slice(0, 100));
      setLatest(item);
    });

    const offStatus = wsClient.on('critical:status', (msg) => {
      const p = msg.payload as Omit<CriticalStatusEvent, 'receivedAt'>;
      const evt: CriticalStatusEvent = { ...p, receivedAt: Date.now() };
      setStatusEvents((prev) => [...prev, evt].slice(-100));
      // 同步更新告警列表中对应条目的业务状态
      setAlerts((prev) =>
        prev.map((a) =>
          String(a.id) === String(p.id)
            ? { ...a, businessStatus: p.status, acknowledged: p.status !== 'raised' }
            : a,
        ),
      );
    });

    return () => {
      offAlert();
      offStatus();
    };
  }, []);

  const ack = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
    );
  }, []);

  const clearAcknowledged = useCallback(() => {
    setAlerts((prev) => prev.filter((a) => !a.acknowledged));
  }, []);

  return { alerts, latest, statusEvents, ack, clearAcknowledged };
}
