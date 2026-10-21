/**
 * 健澜科技 jlmedaios - 不良事件上报 v2 API（M632，P0 合规）
 *
 * 对接 BFF（M554 真实后端）：
 *   GET  /api/v1/adverse-events
 *   POST /api/v1/adverse-events（POST 不做成功兜底，透传后端 message）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type AdverseGrade = 'I' | 'II' | 'III' | 'IV';

export interface AdverseEvent {
  id: string;
  eventType: string;
  grade: AdverseGrade;
  patientId: string;
  happenedAt: string;
  description: string;
  causeAnalysis: string;
  reporter: string;
}

export interface AdverseEventCreateInput {
  eventType: string;
  grade: AdverseGrade;
  patientId: string;
  happenedAt: string;
  description: string;
  causeAnalysis: string;
  reporter: string;
}

export const GRADE_META: Record<AdverseGrade, { label: string; color: string }> = {
  I: { label: 'I 级（警告事件）', color: 'red' },
  II: { label: 'II 级（不良后果事件）', color: 'volcano' },
  III: { label: 'III 级（未造成后果事件）', color: 'orange' },
  IV: { label: 'IV 级（隐患事件）', color: 'blue' },
};

const DEMO_EVENTS: AdverseEvent[] = [
  { id: 'AE-001', eventType: '跌倒', grade: 'II', patientId: 'P10001', happenedAt: '2026-10-18T06:30:00+08:00', description: '夜间下床如厕跌倒，右手腕挫伤。', causeAnalysis: '床栏未拉起 + 夜灯故障。', reporter: '周敏' },
  { id: 'AE-002', eventType: '管路滑脱', grade: 'III', patientId: 'P10002', happenedAt: '2026-10-19T14:20:00+08:00', description: '胃管自行拔出，无明显出血。', causeAnalysis: '约束不足，患者烦躁未及时处理。', reporter: '李慧' },
  { id: 'AE-003', eventType: '给药错误', grade: 'I', patientId: 'P10003', happenedAt: '2026-10-20T09:10:00+08:00', description: '相邻床位药品错发 1 例，及时发现未造成伤害。', causeAnalysis: '双人核对未执行。', reporter: '王芳' },
];

export interface AdverseEventListResult {
  items: AdverseEvent[];
  totalCount: number;
  demo: boolean;
}

export async function fetchAdverseEvents(): Promise<AdverseEventListResult> {
  try {
    const res = await get<{ items: AdverseEvent[]; totalCount: number }>('/adverse-events');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_EVENTS, totalCount: DEMO_EVENTS.length, demo: true };
  }
}

export async function createAdverseEvent(input: AdverseEventCreateInput): Promise<AdverseEvent> {
  return post<AdverseEvent>('/adverse-events', input);
}
