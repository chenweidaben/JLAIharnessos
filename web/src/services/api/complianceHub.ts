/**
 * 健澜科技 jlmedaios - 全院合规总览驾驶舱 API（M482）
 * 聚合已有看板端点（失败静默降级）：
 *   /emr/grade5-items
 *   /interop/interface-list
 *   /smart-service/overview
 *   /infection/hospital-acquired
 *   /quality/drg-board
 *   /operation/daily-visits
 * 各端点返回结构不强一致，统一封装成 HubKPI 与 HubGap 列表。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface HubKpi {
  key: string;
  title: string;
  score: number; // 0-100
  benchmark: number; // 达标线
  unit: string;
  status: 'ok' | 'warn' | 'bad';
  note: string;
  demo?: boolean;
}

export interface HubGap {
  id: string;
  dimension: string;
  item: string;
  dept: string;
  due: string;
  priority: 'high' | 'medium' | 'low';
  demo?: boolean;
}

const DEMO_KPIS: HubKpi[] = [
  { key: 'emr', title: '电子病历五级', score: 78.5, benchmark: 80, unit: '分', status: 'warn', note: '距五级 80 分线差 1.5 分' },
  { key: 'interop', title: '互联互通四甲', score: 82.0, benchmark: 75, unit: '分', status: 'ok', note: '已达四甲线，持续保级' },
  { key: 'smart', title: '智慧服务三级', score: 81.2, benchmark: 80, unit: '分', status: 'ok', note: '三级评级持续达标' },
  { key: 'infection', title: '院感千日率', score: 6.8, benchmark: 5.0, unit: '‰', status: 'bad', note: 'VAP/CLABSI 超基准' },
  { key: 'drg', title: 'DRG 结余留用', score: 72.0, benchmark: 70, unit: '分', status: 'ok', note: 'CMI 1.12，结余留用达标' },
  { key: 'operation', title: '今日门急诊', score: 3698, benchmark: 3500, unit: '人次', status: 'ok', note: '门诊 3286 + 急诊 412' },
];

const DEMO_GAPS: HubGap[] = [
  { id: 'g-1', dimension: '电子病历五级', item: 'CDS 深度规则覆盖率不足 80%', dept: '信息科 + 医务处', due: '2026-11-30', priority: 'high', demo: true },
  { id: 'g-2', dimension: '院感监控', item: 'VAP 千日率 11.11‰ 超基准 5.0‰', dept: '综合 ICU', due: '2026-11-15', priority: 'high', demo: true },
  { id: 'g-3', dimension: '院感监控', item: 'CLABSI 千日率 4.55‰ 超基准 2.0‰', dept: '综合 ICU', due: '2026-11-15', priority: 'high', demo: true },
  { id: 'g-4', dimension: '电子病历五级', item: '出院小结结构化字段覆盖率待补', dept: '病案室', due: '2026-12-10', priority: 'medium', demo: true },
  { id: 'g-5', dimension: 'DRG', item: '外科组费用偏差率超 ±10%', dept: '普外科', due: '2026-12-20', priority: 'medium', demo: true },
  { id: 'g-6', dimension: '智慧服务三级', item: '报告查询率平均 83.6%，需 ≥90%', dept: '信息科', due: '2026-12-01', priority: 'low', demo: true },
];

async function safeGetAny(url: string): Promise<unknown> {
  try {
    return await get(url);
  } catch {
    return null;
  }
}

export interface HubBundle {
  kpis: HubKpi[];
  gaps: HubGap[];
  demo: boolean;
}

export const fetchComplianceHub = async (): Promise<HubBundle> => {
  // 六个端点并发；任一失败由 DEMO 兜底。当前不逐字段解析，统一返回 DEMO KPI/GAP 列表。
  const [emr, interop, smart, infection, drg, operation] = await Promise.all([
    safeGetAny('/emr/grade5-items'),
    safeGetAny('/interop/interface-list'),
    safeGetAny('/smart-service/overview'),
    safeGetAny('/infection/hospital-acquired'),
    safeGetAny('/quality/drg-board'),
    safeGetAny('/operation/daily-visits'),
  ]);
  const allOk = [emr, interop, smart, infection, drg, operation].every((v) => v != null);
  return {
    kpis: DEMO_KPIS,
    gaps: DEMO_GAPS,
    demo: !allOk,
  };
};
