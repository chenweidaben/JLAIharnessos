/**
 * 健澜科技 jlmedaios - 日间手术管理看板 API（M495）
 * 对接 BFF /api/v1/day-surgery/* ：
 *   /day-surgery/list         手术列表
 *   /day-surgery/quality     质量指标
 *   /day-surgery/readmission 再入院
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface SurgeryRow {
  id: string;
  patient: string;
  operation: string;
  dept: string;
  surgeon: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'ongoing' | 'done' | 'transferred';
  demo?: boolean;
}

export interface QualityRow {
  id: string;
  name: string;
  current: number;
  target: number;
  rate: number; // % 达成率
  demo?: boolean;
}

export interface ReadmissionRow {
  id: string;
  patient: string;
  reason: string;
  days: number;
  liability: 'related' | 'unrelated' | 'under_review';
  demo?: boolean;
}

const DEMO_LIST: SurgeryRow[] = [
  { id: 'ds-1', patient: '张**', operation: '腹腔镜胆囊切除术', dept: '普外科', surgeon: '王教授', startTime: '08:30', endTime: '09:45', status: 'done', demo: true },
  { id: 'ds-2', patient: '李**', operation: '白内障超声乳化+人工晶体植入', dept: '眼科', surgeon: '李教授', startTime: '09:00', endTime: '09:30', status: 'done', demo: true },
  { id: 'ds-3', patient: '王**', operation: '宫腔镜息肉切除术', dept: '妇产科', surgeon: '赵教授', startTime: '10:00', endTime: '10:40', status: 'ongoing', demo: true },
  { id: 'ds-4', patient: '赵**', operation: '腹股沟疝修补术', dept: '普外科', surgeon: '陈教授', startTime: '13:30', endTime: '14:30', status: 'scheduled', demo: true },
  { id: 'ds-5', patient: '孙**', operation: '输尿管镜碎石取石术', dept: '泌尿外科', surgeon: '周教授', startTime: '14:00', endTime: '15:00', status: 'scheduled', demo: true },
];

const DEMO_QUALITY: QualityRow[] = [
  { id: 'q-1', name: '日间手术占择期手术比例', current: 28.5, target: 20, rate: 142.5, demo: true },
  { id: 'q-2', name: '24 小时出院率', current: 96.2, target: 95, rate: 101.3, demo: true },
  { id: 'q-3', name: '非计划再入院率', current: 1.8, target: 1.0, rate: 55.6, demo: true },
  { id: 'q-4', name: '非计划中转住院率', current: 3.2, target: 5, rate: 156.3, demo: true },
  { id: 'q-5', name: '术后并发症率', current: 0.8, target: 1.5, rate: 187.5, demo: true },
];

const DEMO_READMIT: ReadmissionRow[] = [
  { id: 'ra-1', patient: '钱**', reason: '术后出血', days: 2, liability: 'related', demo: true },
  { id: 'ra-2', patient: '吴**', reason: '心脑血管意外', days: 3, liability: 'unrelated', demo: true },
  { id: 'ra-3', patient: '郑**', reason: '感染待查', days: 5, liability: 'under_review', demo: true },
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

export const fetchDaySurgeryList = () =>
  safeGet<SurgeryRow>('/day-surgery/list', DEMO_LIST);
export const fetchDaySurgeryQuality = () =>
  safeGet<QualityRow>('/day-surgery/quality', DEMO_QUALITY);
export const fetchDaySurgeryReadmission = () =>
  safeGet<ReadmissionRow>('/day-surgery/readmission', DEMO_READMIT);
