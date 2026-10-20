/**
 * 健澜科技 jlmedaios - 事件总线监控看板 API（M511）
 * 对接 BFF /api/v1/eventbus/* ：
 *   /eventbus/events    事件列表
 *   /eventbus/consumers 消费者组
 *   /eventbus/stats     事件总线统计
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface EventRow {
  id: string;
  type: 'patient.created' | 'order.placed' | 'lab.result' | 'critical.alert' | 'consent.updated';
  eventId: string;
  status: 'pending' | 'delivered' | 'failed' | 'dead-letter';
  timestamp: string;
  demo?: boolean;
}

export interface ConsumerRow {
  id: string;
  name: string;
  topic: string;
  lag: number; // seconds
  backlog: number;
  demo?: boolean;
}

export interface EventBusStats {
  totalToday: number;
  deliveryRate: number; // %
  deadLetterRate: number; // %
  avgLatencyMs: number;
  demo?: boolean;
}

const DEMO_EVENTS: EventRow[] = [
  { id: 'ev-1', type: 'patient.created', eventId: 'evt-0001', status: 'delivered', timestamp: '2026-10-20 09:00:12', demo: true },
  { id: 'ev-2', type: 'order.placed', eventId: 'evt-0002', status: 'delivered', timestamp: '2026-10-20 09:01:45', demo: true },
  { id: 'ev-3', type: 'lab.result', eventId: 'evt-0003', status: 'pending', timestamp: '2026-10-20 09:02:08', demo: true },
  { id: 'ev-4', type: 'critical.alert', eventId: 'evt-0004', status: 'failed', timestamp: '2026-10-20 09:03:31', demo: true },
  { id: 'ev-5', type: 'consent.updated', eventId: 'evt-0005', status: 'dead-letter', timestamp: '2026-10-20 09:05:17', demo: true },
];

const DEMO_CONSUMERS: ConsumerRow[] = [
  { id: 'cs-1', name: 'emr-writer', topic: 'patient.created', lag: 0.3, backlog: 0, demo: true },
  { id: 'cs-2', name: 'billing-pipeline', topic: 'order.placed', lag: 2.1, backlog: 12, demo: true },
  { id: 'cs-3', name: 'cds-engine', topic: 'lab.result', lag: 6.8, backlog: 86, demo: true },
];

const DEMO_STATS: EventBusStats = {
  totalToday: 18640,
  deliveryRate: 99.2,
  deadLetterRate: 0.15,
  avgLatencyMs: 320,
  demo: true,
};

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

async function safeGetSingle<T>(url: string, fallback: T): Promise<{ data: T; demo: boolean }> {
  try {
    const res = await get<T & { demo?: boolean }>(url);
    if (res && typeof res === 'object') return { data: res, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchEvents = () => safeGet<EventRow>('/eventbus/events', DEMO_EVENTS);
export const fetchConsumers = () => safeGet<ConsumerRow>('/eventbus/consumers', DEMO_CONSUMERS);
export const fetchStats = () => safeGetSingle<EventBusStats>('/eventbus/stats', DEMO_STATS);
