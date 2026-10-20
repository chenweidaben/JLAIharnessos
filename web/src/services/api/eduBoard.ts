/**
 * 健澜科技 jlmedaios - 教学管理看板 API（M493）
 * 对接 BFF /api/v1/edu/* ：
 *   /edu/teaching-rounds    教学查房
 *   /edu/rotation-exam      出科考核
 *   /edu/fellowship         进修医师
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface RoundsRow {
  id: string;
  dept: string;
  count: number;
  participants: number;
  director: string;
  demo?: boolean;
}

export interface ExamRow {
  id: string;
  dept: string;
  examinees: number;
  passRate: number; // %
  avgScore: number;
  demo?: boolean;
}

export interface FellowRow {
  id: string;
  source: string;
  current: number;
  graduateRate: number; // %
  demo?: boolean;
}

const DEMO_ROUNDS: RoundsRow[] = [
  { id: 'tr-1', dept: '心内科', count: 3, participants: 18, director: '王教授', demo: true },
  { id: 'tr-2', dept: '普外科', count: 2, participants: 12, director: '李教授', demo: true },
  { id: 'tr-3', dept: '神经内科', count: 4, participants: 20, director: '赵教授', demo: true },
  { id: 'tr-4', dept: '呼吸内科', count: 2, participants: 14, director: '陈教授', demo: true },
];

const DEMO_EXAM: ExamRow[] = [
  { id: 'ex-1', dept: '内科基地', examinees: 48, passRate: 93.75, avgScore: 84.2, demo: true },
  { id: 'ex-2', dept: '外科基地', examinees: 36, passRate: 88.89, avgScore: 81.5, demo: true },
  { id: 'ex-3', dept: '急诊科', examinees: 24, passRate: 79.17, avgScore: 76.8, demo: true },
  { id: 'ex-4', dept: '妇产科', examinees: 18, passRate: 94.44, avgScore: 86.3, demo: true },
];

const DEMO_FELLOWS: FellowRow[] = [
  { id: 'fe-1', source: '省内地市级医院', current: 28, graduateRate: 96.4, demo: true },
  { id: 'fe-2', source: '县市级医院', current: 16, graduateRate: 93.8, demo: true },
  { id: 'fe-3', source: '基层卫生院', current: 8, graduateRate: 87.5, demo: true },
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

export const fetchTeachingRounds = () =>
  safeGet<RoundsRow>('/edu/teaching-rounds', DEMO_ROUNDS);
export const fetchRotationExam = () =>
  safeGet<ExamRow>('/edu/rotation-exam', DEMO_EXAM);
export const fetchFellowship = () =>
  safeGet<FellowRow>('/edu/fellowship', DEMO_FELLOWS);
