/**
 * 健澜科技 jlmedaios - 医技科室运营看板 API（M489）
 * 对接 BFF /api/v1/lab|radiology|pathology/* ：
 *   /lab/workload         检验
 *   /radiology/workload   影像
 *   /pathology/workload   病理
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface LabRow {
  id: string;
  dept: string;
  samples: number;
  abnormal: number;
  timelyRate: number; // %
  demo?: boolean;
}

export interface RadiologyRow {
  id: string;
  device: string;
  exams: number;
  positiveRate: number; // %
  waitMinutes: number;
  demo?: boolean;
}

export interface PathologyRow {
  id: string;
  type: string;
  count: number;
  reportDays: number;
  demo?: boolean;
}

const DEMO_LAB: LabRow[] = [
  { id: 'l-1', dept: '生化', samples: 4200, abnormal: 680, timelyRate: 96.5, demo: true },
  { id: 'l-2', dept: '免疫', samples: 2800, abnormal: 420, timelyRate: 94.2, demo: true },
  { id: 'l-3', dept: '临检', samples: 5200, abnormal: 980, timelyRate: 97.8, demo: true },
  { id: 'l-4', dept: '微生物', samples: 680, abnormal: 180, timelyRate: 88.4, demo: true },
  { id: 'l-5', dept: '急诊检验', samples: 1500, abnormal: 320, timelyRate: 99.2, demo: true },
];

const DEMO_RAD: RadiologyRow[] = [
  { id: 'r-1', device: '1.5T MRI', exams: 62, positiveRate: 58.2, waitMinutes: 35, demo: true },
  { id: 'r-2', device: '64 排 CT', exams: 128, positiveRate: 42.6, waitMinutes: 20, demo: true },
  { id: 'r-3', device: 'DR', exams: 240, positiveRate: 22.4, waitMinutes: 10, demo: true },
  { id: 'r-4', device: '超声', exams: 320, positiveRate: 35.8, waitMinutes: 25, demo: true },
];

const DEMO_PATH: PathologyRow[] = [
  { id: 'p-1', type: '常规石蜡', count: 180, reportDays: 3, demo: true },
  { id: 'p-2', type: '术中冰冻', count: 24, reportDays: 0, demo: true },
  { id: 'p-3', type: '细胞学', count: 96, reportDays: 2, demo: true },
  { id: 'p-4', type: '免疫组化', count: 60, reportDays: 5, demo: true },
  { id: 'p-5', type: '分子病理', count: 32, reportDays: 7, demo: true },
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

export const fetchLab = () => safeGet<LabRow>('/lab/workload', DEMO_LAB);
export const fetchRadiology = () => safeGet<RadiologyRow>('/radiology/workload', DEMO_RAD);
export const fetchPathology = () => safeGet<PathologyRow>('/pathology/workload', DEMO_PATH);
