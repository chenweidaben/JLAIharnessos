/**
 * 健澜科技 jlmedaios - 多学科会诊（MDT）管理看板 API（M499）
 * 对接 BFF /api/v1/mdt/* ：
 *   /mdt/cases    MDT 病例
 *   /mdt/schedule MDT 排程
 *   /mdt/effect   效果评估
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface CaseRow {
  id: string;
  patient: string;
  diagnosis: string;
  applyDept: string;
  deptCount: number;
  status: 'pending' | 'ongoing' | 'done';
  demo?: boolean;
}

export interface ScheduleRow {
  id: string;
  type: string;
  time: string;
  location: string;
  chair: string;
  deptCount: number;
  demo?: boolean;
}

export interface EffectRow {
  id: string;
  caseId: string;
  adoptionRate: number; // %
  outcome: 'improved' | 'stable' | 'worsened';
  followup: string;
  demo?: boolean;
}

const DEMO_CASES: CaseRow[] = [
  { id: 'cs-1', patient: '张**', diagnosis: '晚期胃癌伴肝转移', applyDept: '普外科', deptCount: 5, status: 'done', demo: true },
  { id: 'cs-2', patient: '李**', diagnosis: '复杂先心病', applyDept: '心外科', deptCount: 4, status: 'ongoing', demo: true },
  { id: 'cs-3', patient: '王**', diagnosis: '胰腺癌', applyDept: '肿瘤科', deptCount: 6, status: 'pending', demo: true },
  { id: 'cs-4', patient: '赵**', diagnosis: '脑胶质瘤', applyDept: '神经外科', deptCount: 3, status: 'done', demo: true },
];

const DEMO_SCHEDULE: ScheduleRow[] = [
  { id: 'sc-1', type: '肿瘤 MDT', time: '2026-10-21 14:00', location: '3 号楼 5 层会议室', chair: '王教授', deptCount: 6, demo: true },
  { id: 'sc-2', type: '心脑血管 MDT', time: '2026-10-22 09:30', location: '心外科示教室', chair: '李教授', deptCount: 4, demo: true },
  { id: 'sc-3', type: '疑难肾病 MDT', time: '2026-10-24 15:00', location: '肾内科会议室', chair: '赵教授', deptCount: 3, demo: true },
];

const DEMO_EFFECT: EffectRow[] = [
  { id: 'ef-1', caseId: 'CS-2026-001', adoptionRate: 95.0, outcome: 'improved', followup: '化疗方案调整后肿瘤缩小', demo: true },
  { id: 'ef-2', caseId: 'CS-2026-002', adoptionRate: 82.0, outcome: 'stable', followup: '保守治疗中，病情稳定', demo: true },
  { id: 'ef-3', caseId: 'CS-2026-003', adoptionRate: 68.0, outcome: 'worsened', followup: '多器官衰竭，转 ICU', demo: true },
];

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

export const fetchCases = () => safeGet<CaseRow>('/mdt/cases', DEMO_CASES);
export const fetchSchedule = () => safeGet<ScheduleRow>('/mdt/schedule', DEMO_SCHEDULE);
export const fetchEffect = () => safeGet<EffectRow>('/mdt/effect', DEMO_EFFECT);
