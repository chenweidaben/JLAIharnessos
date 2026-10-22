/**
 * 健澜科技 jlmedaios - 输血反应 v2 API（M639，配套 M555）
 *
 * 对接 BFF：GET /api/v1/transfusion/reactions + POST /api/v1/transfusion/reactions
 *   （未注册则 DEMO 兜底，打标 demo:true；POST 不做成功兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type ReactionSeverity = 'mild' | 'moderate' | 'severe';

export interface TransfusionReaction {
  id: string;
  patientId: string;
  product: string;
  reactionType: string;
  severity: ReactionSeverity;
  happenedAt: string;
  treatment: string;
  reporter: string;
}

export interface ReactionCreateInput {
  patientId: string;
  product: string;
  reactionType: string;
  severity: ReactionSeverity;
  treatment: string;
  reporter: string;
}

export const SEVERITY_META: Record<ReactionSeverity, { label: string; color: string }> = {
  mild: { label: '轻度', color: 'green' },
  moderate: { label: '中度', color: 'orange' },
  severe: { label: '重度', color: 'red' },
};

const DEMO_REACTIONS: TransfusionReaction[] = [
  { id: 'TR-001', patientId: 'P10002', product: '血小板 1 治疗量', reactionType: '过敏反应（寒战）', severity: 'severe', happenedAt: '2026-10-21T15:20:00+08:00', treatment: '立即停输、地塞米松 5mg IV、吸氧、上报院感。', reporter: '王芳' },
  { id: 'TR-002', patientId: 'P10004', product: '悬浮红细胞 1U', reactionType: '发热反应', severity: 'mild', happenedAt: '2026-10-18T11:00:00+08:00', treatment: '减慢滴速、物理降温、观察。', reporter: '李慧' },
  { id: 'TR-003', patientId: 'P10005', product: '新鲜冰冻血浆 200ml', reactionType: '荨麻疹', severity: 'moderate', happenedAt: '2026-10-19T16:00:00+08:00', treatment: '扑尔敏 4mg po、局部炉甘石。', reporter: '周敏' },
];

export interface ReactionListResult {
  items: TransfusionReaction[];
  totalCount: number;
  demo: boolean;
}

export async function fetchTransfusionReactions(patientId: string): Promise<ReactionListResult> {
  try {
    const res = await get<{ items: TransfusionReaction[]; totalCount: number }>('/transfusion/reactions', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_REACTIONS.filter((r) => r.patientId === patientId), totalCount: 0, demo: true };
  }
}

export async function createTransfusionReaction(input: ReactionCreateInput): Promise<TransfusionReaction> {
  return post<TransfusionReaction>('/transfusion/reactions', input);
}
