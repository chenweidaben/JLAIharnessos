/**
 * 健澜科技 jlmedaios - 医疗质量安全核心制度看板 API（M494）
 * 对接 BFF /api/v1/quality/* ：
 *   /quality/core-systems      18 项核心制度落实率
 *   /quality/handover-round    三级查房 / 交接班
 *   /quality/consult-rate     会诊及时率
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface CoreSystemRow {
  id: string;
  name: string;
  dept: string;
  complianceRate: number; // %
  inspections: number;
  demo?: boolean;
}

export interface HandoverRow {
  id: string;
  dept: string;
  profRate: number; // 主任医师查房率
  assocProfRate: number; // 主治医师查房率
  residentRate: number; // 住院医师查房率
  handoverRate: number; // 交接班执行率
  demo?: boolean;
}

export interface ConsultRow {
  id: string;
  type: string;
  timelyRate: number; // %
  overdue: number;
  demo?: boolean;
}

const DEMO_CORE: CoreSystemRow[] = [
  { id: 'cs-1', name: '首诊负责制度', dept: '全院', complianceRate: 96.2, inspections: 12, demo: true },
  { id: 'cs-2', name: '三级查房制度', dept: '全院', complianceRate: 92.5, inspections: 18, demo: true },
  { id: 'cs-3', name: '会诊制度', dept: '全院', complianceRate: 88.4, inspections: 10, demo: true },
  { id: 'cs-4', name: '分级护理制度', dept: '护理部', complianceRate: 95.1, inspections: 14, demo: true },
  { id: 'cs-5', name: '值班和交接班制度', dept: '全院', complianceRate: 90.8, inspections: 20, demo: true },
  { id: 'cs-6', name: '疑难病例讨论制度', dept: '医务处', complianceRate: 82.3, inspections: 6, demo: true },
  { id: 'cs-7', name: '急危重患者抢救制度', dept: '急诊科', complianceRate: 94.6, inspections: 8, demo: true },
  { id: 'cs-8', name: '术前讨论制度', dept: '手术室', complianceRate: 97.2, inspections: 16, demo: true },
];

const DEMO_HANDOVER: HandoverRow[] = [
  { id: 'ho-1', dept: '心内科', profRate: 92.5, assocProfRate: 96.8, residentRate: 98.2, handoverRate: 97.5, demo: true },
  { id: 'ho-2', dept: '普外科', profRate: 88.6, assocProfRate: 94.2, residentRate: 97.0, handoverRate: 95.8, demo: true },
  { id: 'ho-3', dept: '神经内科', profRate: 90.1, assocProfRate: 95.5, residentRate: 98.6, handoverRate: 96.2, demo: true },
  { id: 'ho-4', dept: '急诊科', profRate: 76.4, assocProfRate: 88.2, residentRate: 95.0, handoverRate: 93.6, demo: true },
];

const DEMO_CONSULT: ConsultRow[] = [
  { id: 'ct-1', type: '急会诊（≤10 分钟）', timelyRate: 94.2, overdue: 3, demo: true },
  { id: 'ct-2', type: '普通会诊（≤24 小时）', timelyRate: 91.5, overdue: 8, demo: true },
  { id: 'ct-3', type: '全院会诊（≤48 小时）', timelyRate: 96.8, overdue: 1, demo: true },
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

export const fetchCoreSystems = () =>
  safeGet<CoreSystemRow>('/quality/core-systems', DEMO_CORE);
export const fetchHandover = () =>
  safeGet<HandoverRow>('/quality/handover-round', DEMO_HANDOVER);
export const fetchConsult = () =>
  safeGet<ConsultRow>('/quality/consult-rate', DEMO_CONSULT);
