/**
 * 健澜科技 jlmedaios - 合规看板 API（M472）
 *
 * 对接 BFF /api/v1/compliance/* ：
 *   - /compliance/nqi-incidence   护理敏感质量指标发生率
 *   - /compliance/interop-catalog 互联互通成熟度资源目录
 *   - /compliance/level5-gaps     电子病历五级评级缺口清单
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface NqiIncidenceRow {
  id: string;
  indicator: string;
  dept: string;
  numerator: number;
  denominator: number;
  rate: number; // 百分比
  benchmark: number;
  trend: 'up' | 'down' | 'flat';
  period: string;
  demo?: boolean;
}

export interface InteropCatalogRow {
  id: string;
  resource: string;
  category: string;
  standard: string; // HL7 / FHIR / DICOM / ICD
  direction: 'in' | 'out';
  consumer: string;
  status: 'online' | 'pending' | 'offline';
  demo?: boolean;
}

export interface Level5GapRow {
  id: string;
  item: string;
  dimension: string; // 数据质量 / 应用功能 / 基础设施 / 安全
  currentLevel: string;
  targetLevel: string;
  severity: 'high' | 'medium' | 'low';
  owner: string;
  dueAt: string;
  demo?: boolean;
}

// ------------------------------ DEMO 兜底 ------------------------------

const DEMO_NQI: NqiIncidenceRow[] = [
  { id: 'n-1', indicator: '住院患者压力性损伤发生率', dept: '心内科一病区', numerator: 2, denominator: 480, rate: 0.42, benchmark: 0.5, trend: 'down', period: '2026-Q3', demo: true },
  { id: 'n-2', indicator: '住院患者跌倒发生率', dept: '神经内科', numerator: 1, denominator: 320, rate: 0.31, benchmark: 0.2, trend: 'up', period: '2026-Q3', demo: true },
  { id: 'n-3', indicator: '导尿管相关尿路感染(CAUTI)', dept: '外科 ICU', numerator: 3, denominator: 150, rate: 2.0, benchmark: 1.5, trend: 'up', period: '2026-Q3', demo: true },
  { id: 'n-4', indicator: '呼吸机相关肺炎(VAP)', dept: '综合 ICU', numerator: 1, denominator: 90, rate: 1.11, benchmark: 1.2, trend: 'flat', period: '2026-Q3', demo: true },
  { id: 'n-5', indicator: '约束具使用率', dept: '老年医学科', numerator: 12, denominator: 260, rate: 4.62, benchmark: 5.0, trend: 'down', period: '2026-Q3', demo: true },
];

const DEMO_INTEROP: InteropCatalogRow[] = [
  { id: 'i-1', resource: '门诊就诊记录', category: '诊疗', standard: 'FHIR', direction: 'out', consumer: '区域卫生平台', status: 'online', demo: true },
  { id: 'i-2', resource: '住院医嘱明细', category: '医嘱', standard: 'HL7 v2.5', direction: 'out', consumer: '医保结算系统', status: 'online', demo: true },
  { id: 'i-3', resource: '医学影像 DICOM', category: '影像', standard: 'DICOM 3.0', direction: 'in', consumer: 'PACS 接入', status: 'online', demo: true },
  { id: 'i-4', resource: '检验检验报告', category: '检验', standard: 'FHIR Observation', direction: 'out', consumer: '区域检验中心', status: 'pending', demo: true },
  { id: 'i-5', resource: 'ICD-10 诊断字典', category: '基础字典', standard: 'ICD-10', direction: 'in', consumer: 'DRG 分组器', status: 'online', demo: true },
];

const DEMO_GAPS: Level5GapRow[] = [
  { id: 'g-1', item: '全流程数据闭环(医嘱-执行-回写)', dimension: '应用功能', currentLevel: '4 级', targetLevel: '5 级', severity: 'high', owner: '信息科-王**', dueAt: '2026-12-31', demo: true },
  { id: 'g-2', item: '专科临床决策支持(CDS)规则覆盖率', dimension: '应用功能', currentLevel: '65%', targetLevel: '≥80%', severity: 'high', owner: '医务处-李**', dueAt: '2026-11-30', demo: true },
  { id: 'g-3', item: '主索引(EMPI)跨院唯一化', dimension: '数据质量', currentLevel: '92%', targetLevel: '≥99%', severity: 'medium', owner: '信息科-赵**', dueAt: '2027-03-31', demo: true },
  { id: 'g-4', item: '数据脱敏与审计日志完备性', dimension: '安全', currentLevel: '部分', targetLevel: '全量', severity: 'medium', owner: '信息安全-周**', dueAt: '2026-12-15', demo: true },
  { id: 'g-5', item: '边缘节点/5G 床旁终端覆盖', dimension: '基础设施', currentLevel: '70%', targetLevel: '≥95%', severity: 'low', owner: '后勤-吴**', dueAt: '2027-06-30', demo: true },
];

// ------------------------------ 请求 ------------------------------

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res)
      ? (res as T[])
      : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchNqiIncidence = () => safeGet<NqiIncidenceRow>('/compliance/nqi-incidence', DEMO_NQI);
export const fetchInteropCatalog = () =>
  safeGet<InteropCatalogRow>('/compliance/interop-catalog', DEMO_INTEROP);
export const fetchLevel5Gaps = () => safeGet<Level5GapRow>('/compliance/level5-gaps', DEMO_GAPS);
