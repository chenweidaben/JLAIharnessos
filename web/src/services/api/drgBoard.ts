/**
 * 健澜科技 jlmedaios - DRG/单病种经济运行看板 API（M476）
 * 对接 BFF：
 *   - /drg/groups         DRG 分组
 *   - /drg/cost-summary   费用偏差汇总
 *   - /quality/single-disease  单病种
 *   - /quality/clinical-path   临床路径
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface DrgGroupRow {
  id: string;
  groupCode: string;
  groupName: string;
  weight: number; // 权重
  caseCount: number;
  avgCost: number;
  targetCost: number;
  deviationRate: number; // % 超支为正
  demo?: boolean;
}

export interface DrgCostSummaryRow {
  id: string;
  metric: string;
  value: number;
  unit: string;
  benchmark: number;
  demo?: boolean;
}

export interface SingleDiseaseRow {
  id: string;
  disease: string;
  caseCount: number;
  avgLos: number; // 平均住院日
  avgCost: number; // 次均费用
  cureRate: number; // %
  demo?: boolean;
}

export interface ClinicalPathRow {
  id: string;
  pathName: string;
  dept: string;
  enrollRate: number; // 入径率 %
  completeRate: number; // 完成率 %
  deviationRate: number; // 变异率 %
  demo?: boolean;
}

const DEMO_GROUPS: DrgGroupRow[] = [
  { id: 'g-1', groupCode: 'FM11', groupName: '循环系统诊断伴重要合并症', weight: 1.82, caseCount: 86, avgCost: 22500, targetCost: 21000, deviationRate: 7.1, demo: true },
  { id: 'g-2', groupCode: 'GB25', groupName: '冠脉搭桥手术', weight: 3.45, caseCount: 24, avgCost: 58200, targetCost: 56000, deviationRate: 3.9, demo: true },
  { id: 'g-3', groupCode: 'IC29', groupName: '气管插管/机械通气 >96h', weight: 2.68, caseCount: 18, avgCost: 41500, targetCost: 42000, deviationRate: -1.2, demo: true },
  { id: 'g-4', groupCode: 'ES15', groupName: '胆囊切除手术', weight: 1.05, caseCount: 52, avgCost: 12800, targetCost: 11500, deviationRate: 11.3, demo: true },
  { id: 'g-5', groupCode: 'BR25', groupName: '脑血管意外伴溶栓', weight: 2.15, caseCount: 32, avgCost: 31200, targetCost: 30000, deviationRate: 4.0, demo: true },
];

const DEMO_COST: DrgCostSummaryRow[] = [
  { id: 'c-1', metric: 'DRG 覆盖病例数', value: 212, unit: '例', benchmark: 200, demo: true },
  { id: 'c-2', metric: '平均权重(CMI)', value: 1.92, unit: '', benchmark: 1.85, demo: true },
  { id: 'c-3', metric: '次均费用偏差率', value: 4.6, unit: '%', benchmark: 5.0, demo: true },
  { id: 'c-4', metric: '结余病例占比', value: 58, unit: '%', benchmark: 60, demo: true },
];

const DEMO_SINGLE: SingleDiseaseRow[] = [
  { id: 'sd-1', disease: '急性 ST 段抬高心梗', caseCount: 32, avgLos: 8.5, avgCost: 28600, cureRate: 94.2, demo: true },
  { id: 'sd-2', disease: '胆囊结石伴胆囊炎', caseCount: 52, avgLos: 5.2, avgCost: 11800, cureRate: 97.5, demo: true },
  { id: 'sd-3', disease: '2 型糖尿病', caseCount: 68, avgLos: 9.8, avgCost: 9200, cureRate: 88.3, demo: true },
  { id: 'sd-4', disease: '肺炎(成人社区获得性)', caseCount: 45, avgLos: 7.1, avgCost: 13500, cureRate: 92.6, demo: true },
];

const DEMO_PATH: ClinicalPathRow[] = [
  { id: 'cp-1', pathName: '腹腔镜胆囊切除路径', dept: '普外科', enrollRate: 92.5, completeRate: 88.3, deviationRate: 11.7, demo: true },
  { id: 'cp-2', pathName: 'STEMI 急诊 PCI 路径', dept: '心内科', enrollRate: 86.4, completeRate: 82.1, deviationRate: 17.9, demo: true },
  { id: 'cp-3', pathName: '2 型糖尿病路径', dept: '内分泌科', enrollRate: 78.2, completeRate: 75.6, deviationRate: 24.4, demo: true },
  { id: 'cp-4', pathName: '剖宫产路径', dept: '产科', enrollRate: 95.1, completeRate: 91.8, deviationRate: 8.2, demo: true },
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

export const fetchDrgGroups = () => safeGet<DrgGroupRow>('/drg/groups', DEMO_GROUPS);
export const fetchDrgCostSummary = () =>
  safeGet<DrgCostSummaryRow>('/drg/cost-summary', DEMO_COST);
export const fetchSingleDisease = () =>
  safeGet<SingleDiseaseRow>('/quality/single-disease', DEMO_SINGLE);
export const fetchClinicalPath = () =>
  safeGet<ClinicalPathRow>('/quality/clinical-path', DEMO_PATH);
