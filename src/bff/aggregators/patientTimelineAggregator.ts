/**
 * 健澜AI原生医院操作系统OS - P2-3 患者时间线（Patient Timeline）
 *
 * 单患者全维度事件聚合视图：
 *  - 事件类型：lab/imaging/medication/surgery/nursing/cds/encounter
 *  - 统一按 time 倒序；支持 type / from / to 过滤与 limit/offset 分页
 *  - summary 聚合 byType 计数 + timeRange
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class TimelineError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const EVENT_TYPES = ['lab', 'imaging', 'medication', 'surgery', 'nursing', 'cds', 'encounter'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface TimelineEvent {
  eventId: string;
  patientId: string;
  visitId: string;
  type: EventType;
  time: string; // ISO
  summary: string;
  detailRef: string;
}

const events: TimelineEvent[] = [];
let seq = 0;

function isValidIso(s: string): boolean {
  const t = Date.parse(s);
  return !Number.isNaN(t);
}

/** 事件注册中心：其他模块产生事件时调用 */
export function recordEvent(input: Omit<TimelineEvent, 'eventId'>): TimelineEvent {
  if (!EVENT_TYPES.includes(input.type)) {
    throw new TimelineError(400, `非法事件类型：${input.type}`);
  }
  seq += 1;
  const ev: TimelineEvent = { ...input, eventId: `EVT-${String(seq).padStart(5, '0')}` };
  events.push(ev);
  return ev;
}

export interface QueryInput {
  patientId: string; type?: string; from?: string; to?: string; limit?: number; offset?: number;
}

export function listEvents(q: QueryInput): { events: TimelineEvent[]; total: number; limit: number; offset: number } {
  if (!q.patientId) throw new TimelineError(400, 'patientId 必填');
  if (q.type && !EVENT_TYPES.includes(q.type as EventType)) throw new TimelineError(400, `非法 type：${q.type}`);
  if (q.from && !isValidIso(q.from)) throw new TimelineError(400, `非法 from：${q.from}`);
  if (q.to && !isValidIso(q.to)) throw new TimelineError(400, `非法 to：${q.to}`);
  const limit = q.limit ?? 50;
  const offset = q.offset ?? 0;
  if (limit > 200) throw new TimelineError(400, 'limit 最大 200');
  if (limit < 0 || offset < 0) throw new TimelineError(400, 'limit/offset 不能为负');

  let arr = events.filter((e) => e.patientId === q.patientId);
  if (q.type) arr = arr.filter((e) => e.type === q.type);
  if (q.from) arr = arr.filter((e) => e.time >= q.from!);
  if (q.to) arr = arr.filter((e) => e.time <= q.to!);
  arr.sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));
  const total = arr.length;
  const page = arr.slice(offset, offset + limit);
  return { events: page, total, limit, offset };
}

export function summarize(patientId: string): {
  patientId: string; totalEvents: number;
  byType: Record<string, number>; timeRange: { earliest: string | null; latest: string | null };
} {
  if (!patientId) throw new TimelineError(400, 'patientId 必填');
  const arr = events.filter((e) => e.patientId === patientId);
  const byType: Record<string, number> = {};
  for (const t of EVENT_TYPES) byType[t] = 0;
  for (const e of arr) byType[e.type] = (byType[e.type] ?? 0) + 1;
  const times = arr.map((e) => e.time).sort();
  return {
    patientId, totalEvents: arr.length, byType,
    timeRange: { earliest: times[0] ?? null, latest: times[times.length - 1] ?? null },
  };
}

/** DEMO_MODE 测试桩灌样本 */
export function seed(patientId: string, samples: Array<Omit<TimelineEvent, 'eventId' | 'patientId'>>): TimelineEvent[] {
  return samples.map((s) => recordEvent({ ...s, patientId }));
}

export function __resetStore(): void { events.length = 0; seq = 0; }
