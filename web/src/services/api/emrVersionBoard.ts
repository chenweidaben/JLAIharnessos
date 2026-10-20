/**
 * 健澜科技 jlmedaios - 病历版本管理看板 API（M506）
 * 对接 BFF /api/v1/emr/version/* ：
 *   /emr/version/list  版本列表
 *   /emr/version/diff  版本差异
 *   /emr/version/stats 版本统计
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface VersionRow {
  id: string;
  emrId: string;
  version: string; // e.g. v1.0 / v2.0 / v3.0
  author: string;
  modifiedAt: string;
  changeType: 'create' | 'revise' | 'review' | 'sign';
  demo?: boolean;
}

export interface DiffRow {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  author: string;
  modifiedAt: string;
  demo?: boolean;
}

export interface VersionStats {
  monthlyRevised: number;
  avgRounds: number;
  traceabilityRate: number; // %
  diffFieldCount: number;
  demo?: boolean;
}

const DEMO_LIST: VersionRow[] = [
  { id: 'v-1', emrId: 'EMR-20261001-001', version: 'v1.0', author: '王医师', modifiedAt: '2026-10-18 09:12', changeType: 'create', demo: true },
  { id: 'v-2', emrId: 'EMR-20261001-001', version: 'v2.0', author: '李主治医师', modifiedAt: '2026-10-18 14:30', changeType: 'revise', demo: true },
  { id: 'v-3', emrId: 'EMR-20261001-001', version: 'v3.0', author: '张主任医师', modifiedAt: '2026-10-19 10:05', changeType: 'review', demo: true },
  { id: 'v-4', emrId: 'EMR-20261002-007', version: 'v1.0', author: '陈医师', modifiedAt: '2026-10-19 11:20', changeType: 'sign', demo: true },
];

const DEMO_DIFF: DiffRow[] = [
  { id: 'd-1', field: '主诉', oldValue: '胸闷3天', newValue: '胸闷伴气短3天', author: '李主治医师', modifiedAt: '2026-10-18 14:30', demo: true },
  { id: 'd-2', field: '初步诊断', oldValue: '冠心病', newValue: '冠心病 不稳定型心绞痛', author: '张主任医师', modifiedAt: '2026-10-19 10:05', demo: true },
  { id: 'd-3', field: '处理意见', oldValue: '建议心电图', newValue: '建议心电图+心肌酶谱', author: '李主治医师', modifiedAt: '2026-10-18 14:30', demo: true },
];

const DEMO_STATS: VersionStats = {
  monthlyRevised: 1486,
  avgRounds: 2.4,
  traceabilityRate: 99.2,
  diffFieldCount: 3280,
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

export const fetchList = () => safeGet<VersionRow>('/emr/version/list', DEMO_LIST);
export const fetchDiff = () => safeGet<DiffRow>('/emr/version/diff', DEMO_DIFF);
export const fetchStats = () => safeGetSingle<VersionStats>('/emr/version/stats', DEMO_STATS);
