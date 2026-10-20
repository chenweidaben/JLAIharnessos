/**
 * 健澜科技 jlmedaios - 单病种质控深度看板 API（M516）
 * 对接 BFF /api/v1/disease/* ：
 *   /disease/process       过程质控
 *   /disease/outcome       结局指标
 *   /disease/complications 并发症
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface ProcessRow {
  id: string;
  disease: 'STEMI' | 'stroke' | 'pneumonia' | 'hipFracture' | 'cesarean';
  completionRate: number; // %
  dept: string;
  demo?: boolean;
}

export interface OutcomeRow {
  id: string;
  disease: string;
  mortalityRate: number; // %
  readmissionRate: number; // %
  avgLosDays: number;
  demo?: boolean;
}

export interface ComplicationRow {
  id: string;
  disease: string;
  type: 'bleeding' | 'infection' | 'thrombosis' | 'poorHealing';
  rate: number; // %
  demo?: boolean;
}

const DEMO_PROCESS: ProcessRow[] = [
  { id: 'pr-1', disease: 'STEMI', completionRate: 94.5, dept: '心内科', demo: true },
  { id: 'pr-2', disease: 'stroke', completionRate: 82.0, dept: '神经内科', demo: true },
  { id: 'pr-3', disease: 'pneumonia', completionRate: 68.5, dept: '呼吸内科', demo: true },
  { id: 'pr-4', disease: 'hipFracture', completionRate: 88.0, dept: '骨科', demo: true },
  { id: 'pr-5', disease: 'cesarean', completionRate: 96.0, dept: '妇产科', demo: true },
];

const DEMO_OUTCOME: OutcomeRow[] = [
  { id: 'oc-1', disease: '急性心梗', mortalityRate: 1.8, readmissionRate: 3.2, avgLosDays: 7.5, demo: true },
  { id: 'oc-2', disease: '脑卒中', mortalityRate: 4.5, readmissionRate: 6.8, avgLosDays: 11.2, demo: true },
  { id: 'oc-3', disease: '社区获得性肺炎', mortalityRate: 0.8, readmissionRate: 2.1, avgLosDays: 6.3, demo: true },
];

const DEMO_COMP: ComplicationRow[] = [
  { id: 'cp-1', disease: '髋部骨折', type: 'bleeding', rate: 3.5, demo: true },
  { id: 'cp-2', disease: '剖宫产', type: 'infection', rate: 1.2, demo: true },
  { id: 'cp-3', disease: '脑卒中', type: 'thrombosis', rate: 6.2, demo: true },
  { id: 'cp-4', disease: '髋部骨折', type: 'poorHealing', rate: 2.8, demo: true },
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

export const fetchProcess = () => safeGet<ProcessRow>('/disease/process', DEMO_PROCESS);
export const fetchOutcome = () => safeGet<OutcomeRow>('/disease/outcome', DEMO_OUTCOME);
export const fetchComplications = () => safeGet<ComplicationRow>('/disease/complications', DEMO_COMP);
