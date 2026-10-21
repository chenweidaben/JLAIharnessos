/**
 * 健澜科技 jlmedaios - Barthel 指数 ADL 评估 API（M521-G，P0）
 *
 * 对接真实 BFF：
 *   GET  /api/v1/barthel-scores?visitId=  权限码 nursing:view
 *   POST /api/v1/barthel-scores            权限码 nursing:barthel
 *
 * 后端契约：POST body 仅接受 visitId + 10 项分值；总分与分级由前端纯函数兜底，
 * 分级阈值冻结：≤20 重度依赖 / 21–40 中度 / 41–60 轻度 / ≥61 自理。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

/* ------------------------------------------------------------------ */
/* 10 项 ADL（英文 key，中文 label 由 LABEL map 映射）                 */
/* ------------------------------------------------------------------ */

export type BarthelItemKey =
  | 'eating' | 'bathing' | 'grooming' | 'dressing'
  | 'bowel' | 'bladder' | 'toilet' | 'transfers' | 'walking' | 'stairs';

export const BARTHEL_ITEMS: Array<{ key: BarthelItemKey; label: string; options: number[] }> = [
  { key: 'eating', label: '进食', options: [0, 5, 10] },
  { key: 'bathing', label: '洗澡', options: [0, 5] },
  { key: 'grooming', label: '修饰', options: [0, 5] },
  { key: 'dressing', label: '穿衣', options: [0, 5, 10] },
  { key: 'bowel', label: '大便控制', options: [0, 5, 10] },
  { key: 'bladder', label: '小便控制', options: [0, 5, 10] },
  { key: 'toilet', label: '如厕', options: [0, 5, 10] },
  { key: 'transfers', label: '床椅转移', options: [0, 5, 10, 15] },
  { key: 'walking', label: '平地行走', options: [0, 5, 10, 15] },
  { key: 'stairs', label: '上下楼梯', options: [0, 5, 10] },
];

export type BarthelLevel = 'severe' | 'moderate' | 'mild' | 'independent';

export const BARTHEL_LEVEL_LABEL: Record<BarthelLevel, string> = {
  severe: '重度依赖',
  moderate: '中度依赖',
  mild: '轻度依赖',
  independent: '生活自理',
};

export const BARTHEL_LEVEL_COLOR: Record<BarthelLevel, string> = {
  severe: 'red',
  moderate: 'orange',
  mild: 'yellow',
  independent: 'green',
};

/* ------------------------------------------------------------------ */
/* 纯函数阈值（冻结）                                                   */
/* ------------------------------------------------------------------ */

export function barthelTotal(items: Partial<Record<BarthelItemKey, number>>): number {
  return BARTHEL_ITEMS.reduce((acc, it) => acc + (items[it.key] ?? 0), 0);
}

export function barthelLevelOf(total: number): BarthelLevel {
  if (total <= 20) return 'severe';
  if (total <= 40) return 'moderate';
  if (total <= 60) return 'mild';
  return 'independent';
}

/** ≤40 需专人照护并联动护理级别 */
export function needsCare(total: number): boolean {
  return total <= 40;
}

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface BarthelRecord {
  id: string;
  visitId: string;
  items: Partial<Record<BarthelItemKey, number>>;
  totalScore: number;
  level: BarthelLevel;
  assessedAt: string;
  needsCare: boolean;
  demo?: boolean;
  patientId?: string;
  patientName?: string;
  signature?: string;
  assessorName?: string;
}

export interface BarthelSubmitInput {
  visitId: string;
  patientId?: string;
  patientName?: string;
  items: Record<BarthelItemKey, number>;
  assessedAt: string;
  signature: string;
  assessorName?: string;
}

export interface BarthelListResult {
  data: BarthelRecord[];
  demo: boolean;
}

export interface BarthelSubmitResult {
  record: BarthelRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* DEMO 兜底记录                                                        */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: BarthelRecord[] = [
  {
    id: 'BART-DEMO-001',
    visitId: '00000000-0000-4000-8000-000000000003',
    patientId: 'P-DEMO-003',
    patientName: '王卫国',
    items: { eating: 5, bathing: 0, grooming: 0, dressing: 5, bowel: 5, bladder: 5, toilet: 5, transfers: 5, walking: 0, stairs: 0 },
    totalScore: 30,
    level: 'moderate',
    assessedAt: new Date().toISOString(),
    needsCare: true,
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
  {
    id: 'BART-DEMO-002',
    visitId: '00000000-0000-4000-8000-000000000001',
    patientId: 'P-DEMO-001',
    patientName: '张建国',
    items: { eating: 10, bathing: 5, grooming: 5, dressing: 10, bowel: 10, bladder: 10, toilet: 10, transfers: 15, walking: 15, stairs: 10 },
    totalScore: 100,
    level: 'independent',
    assessedAt: new Date(Date.now() - 3600_000).toISOString(),
    needsCare: false,
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
];

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

export async function fetchBarthelRecords(visitId?: string): Promise<BarthelListResult> {
  try {
    const res = await get<BarthelRecord[]>('/barthel-scores', visitId ? { visitId } : undefined);
    const items = Array.isArray(res) ? res : [];
    if (items.length > 0) {
      const data = items.map((r) => ({
        ...r,
        totalScore: r.totalScore ?? barthelTotal(r.items),
        level: r.level ?? barthelLevelOf(r.totalScore ?? barthelTotal(r.items)),
        needsCare: r.needsCare ?? needsCare(r.totalScore ?? barthelTotal(r.items)),
        demo: false,
      }));
      return { data, demo: false };
    }
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  }
}

export async function submitBarthel(input: BarthelSubmitInput): Promise<BarthelSubmitResult> {
  const total = barthelTotal(input.items);
  const level = barthelLevelOf(total);
  const needs = needsCare(total);
  try {
    const res = await post<BarthelRecord>('/barthel-scores', { visitId: input.visitId, items: input.items });
    const record: BarthelRecord = {
      ...res,
      patientId: input.patientId,
      patientName: input.patientName,
      totalScore: res.totalScore ?? total,
      level: res.level ?? level,
      needsCare: res.needsCare ?? needs,
      signature: input.signature,
      assessorName: input.assessorName,
      assessedAt: input.assessedAt,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    void err;
    const record: BarthelRecord = {
      id: `BART-LOCAL-${Date.now().toString().slice(-8)}`,
      visitId: input.visitId,
      items: input.items,
      totalScore: total,
      level,
      assessedAt: input.assessedAt,
      needsCare: needs,
      patientId: input.patientId,
      patientName: input.patientName,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: true,
    };
    return { record, demo: true };
  }
}
