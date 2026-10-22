/**
 * 健澜科技 jlmedaios - 不良事件上报 v2 API（M663，配套 M554）
 *
 * 对接 BFF：GET /api/v1/adverse-events + POST /api/v1/adverse-events
 *   （未注册则 DEMO 兜底，打标 demo:true；POST 不做成功兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type AeLevel = 'mild' | 'moderate' | 'severe' | 'sentinel';
export type AeStatus = 'reported' | 'reviewing' | 'rca' | 'closed';

export interface AdverseEvent {
  id: string;
  patientId: string;
  eventType: string;
  level: AeLevel;
  happenedAt: string;
  description: string;
  causeAnalysis: string;
  status: AeStatus;
  reporter: string;
}

export interface AeCreateInput {
  patientId: string;
  eventType: string;
  level: AeLevel;
  description: string;
  causeAnalysis: string;
  reporter: string;
}

export const AE_LEVEL_META: Record<AeLevel, { label: string; color: string }> = {
  mild: { label: '轻度', color: 'green' },
  moderate: { label: '中度', color: 'orange' },
  severe: { label: '重度', color: 'red' },
  sentinel: { label: '警讯事件', color: 'purple' },
};

export const AE_STATUS_META: Record<AeStatus, { label: string; color: string }> = {
  reported: { label: '已上报', color: 'blue' },
  reviewing: { label: '审核中', color: 'orange' },
  rca: { label: '根因分析', color: 'purple' },
  closed: { label: '已闭环', color: 'green' },
};

const DEMO_AE: AdverseEvent[] = [
  { id: 'AE-001', patientId: 'P10011', eventType: '跌倒', level: 'moderate', happenedAt: '2026-10-20T03:00:00+08:00', description: '患者夜间起床如厕时跌倒，右侧肘部擦伤。', causeAnalysis: '照明不足、未使用床栏、Morse 评分 55 但未一对一陪护。', status: 'rca', reporter: '周敏' },
  { id: 'AE-002', patientId: 'P10005', eventType: '用药错误', level: 'severe', happenedAt: '2026-10-21T09:00:00+08:00', description: '华法林剂量误发为 10mg（应 5mg），已监测 INR。', causeAnalysis: '双人核对流于形式，PDA 扫描未执行。', status: 'reviewing', reporter: '王药师' },
  { id: 'AE-003', patientId: 'P10002', eventType: '压力性损伤', level: 'mild', happenedAt: '2026-10-15T10:00:00+08:00', description: '术后骶尾部 I 期压疮。', causeAnalysis: '翻身 q4h 执行不到位。', status: 'closed', reporter: '李慧' },
];

export interface AeListResult {
  items: AdverseEvent[];
  totalCount: number;
  demo: boolean;
}

export async function fetchAdverseEvents(): Promise<AeListResult> {
  try {
    const res = await get<{ items: AdverseEvent[]; totalCount: number }>('/adverse-events');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_AE, totalCount: DEMO_AE.length, demo: true };
  }
}

export async function createAdverseEvent(input: AeCreateInput): Promise<AdverseEvent> {
  return post<AdverseEvent>('/adverse-events', input);
}
