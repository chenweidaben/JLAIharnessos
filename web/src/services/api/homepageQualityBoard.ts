/**
 * 健澜科技 jlmedaios - 病案首页质量看板 API（M488）
 * 对接 BFF ：
 *   /emr/homepage-quality     首页质量概览
 *   /emr/homepage-items       首页缺陷项
 *   /drg/groups               DRG 分组
 *   /dip/points               DIP 分值
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface QualityOverview {
  passRate: number; // %
  primaryDiagCorrect: number; // %
  drgGroupRate: number; // %
  dipConsumption: number; // 消耗指数
  demo?: boolean;
}

export interface DefectItemRow {
  id: string;
  item: string;
  ratio: number; // %
  dept: string;
  demo?: boolean;
}

export interface DrgGroupRow {
  id: string;
  group: string;
  weight: number;
  costIndex: number; // <1 节约 / >1 超支
  demo?: boolean;
}

export interface DipPointRow {
  id: string;
  disease: string;
  points: number;
  consumption: number; // 消耗指数
  demo?: boolean;
}

const DEMO_OVERVIEW: QualityOverview = {
  passRate: 96.8,
  primaryDiagCorrect: 98.2,
  drgGroupRate: 89.5,
  dipConsumption: 0.94,
  demo: true,
};

const DEMO_DEFECTS: DefectItemRow[] = [
  { id: 'd-1', item: '主要诊断选择错误', ratio: 28.5, dept: '普外科', demo: true },
  { id: 'd-2', item: '其他诊断漏填', ratio: 22.1, dept: '心内科', demo: true },
  { id: 'd-3', item: '手术操作编码错误', ratio: 18.4, dept: '骨科', demo: true },
  { id: 'd-4', item: '离院方式填写不全', ratio: 14.2, dept: '神经内科', demo: true },
  { id: 'd-5', item: '入院病情代码错误', ratio: 10.8, dept: '呼吸内科', demo: true },
];

const DEMO_DRG: DrgGroupRow[] = [
  { id: 'g-1', group: 'FM19 心力衰竭', weight: 1.12, costIndex: 0.92, demo: true },
  { id: 'g-2', group: 'GB29 冠脉支架', weight: 2.85, costIndex: 1.15, demo: true },
  { id: 'g-3', group: 'IB29 阑尾手术', weight: 0.86, costIndex: 0.88, demo: true },
  { id: 'g-4', group: 'ES15 肺炎', weight: 0.95, costIndex: 1.05, demo: true },
  { id: 'g-5', group: 'BR25 脑卒中', weight: 1.42, costIndex: 1.08, demo: true },
];

const DEMO_DIP: DipPointRow[] = [
  { id: 'dp-1', disease: '急性心梗', points: 1280, consumption: 0.95, demo: true },
  { id: 'dp-2', disease: '髋关节置换', points: 2450, consumption: 1.12, demo: true },
  { id: 'dp-3', disease: '剖宫产', points: 680, consumption: 0.88, demo: true },
  { id: 'dp-4', disease: '肺炎(成人)', points: 520, consumption: 1.02, demo: true },
  { id: 'dp-5', disease: '胆囊切除', points: 760, consumption: 0.91, demo: true },
];

async function safeGetList<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
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

export const fetchQuality = () =>
  safeGetSingle<QualityOverview>('/emr/homepage-quality', DEMO_OVERVIEW);
export const fetchItems = () =>
  safeGetList<DefectItemRow>('/emr/homepage-items', DEMO_DEFECTS);
export const fetchDrgGroups = () =>
  safeGetList<DrgGroupRow>('/drg/groups', DEMO_DRG);
export const fetchDipPoints = () =>
  safeGetList<DipPointRow>('/dip/points', DEMO_DIP);
