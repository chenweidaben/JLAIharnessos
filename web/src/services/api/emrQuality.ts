/**
 * 健澜科技 jlmedaios - 病历质控看板 API（M473）
 *
 * 对接 BFF /api/v1/emr-quality/* ：
 *   - /emr-quality/defects      缺陷病历清单
 *   - /emr-quality/grade-rate   甲/乙/丙级率
 *   - /emr-quality/defect-types 缺陷类型分布
 *   - /emr-quality/dept-ranking 科室病历质量排名
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface EmrDefectRow {
  id: string;
  recordNo: string;
  patient: string;
  dept: string;
  doctor: string;
  defectType: string;
  severity: 'high' | 'medium' | 'low';
  foundAt: string;
  status: 'pending' | 'fixed' | 'waived';
  demo?: boolean;
}

export interface GradeRateRow {
  dept: string;
  grade: '甲' | '乙' | '丙';
  count: number;
  rate: number; // 百分比
}

export interface DefectTypeRow {
  id: string;
  type: string;
  count: number;
  percent: number;
  demo?: boolean;
}

export interface DeptRankingRow {
  id: string;
  dept: string;
  total: number;
  gradeA: number;
  gradeARate: number;
  defectCount: number;
  rank: number;
  demo?: boolean;
}

// ------------------------------ DEMO 兜底 ------------------------------

const DEMO_DEFECTS: EmrDefectRow[] = [
  { id: 'd-1', recordNo: 'EMR-20261019-001', patient: '张**', dept: '心内科', doctor: '陈**', defectType: '出院小结缺诊疗计划', severity: 'high', foundAt: '2026-10-20 09:10', status: 'pending', demo: true },
  { id: 'd-2', recordNo: 'EMR-20261019-002', patient: '李**', dept: '呼吸内科', doctor: '王**', defectType: '首次病程记录超时', severity: 'high', foundAt: '2026-10-20 09:25', status: 'fixed', demo: true },
  { id: 'd-3', recordNo: 'EMR-20261018-015', patient: '赵**', dept: '普外科', doctor: '刘**', defectType: '知情同意书缺签名', severity: 'medium', foundAt: '2026-10-19 16:40', status: 'pending', demo: true },
  { id: 'd-4', recordNo: 'EMR-20261018-021', patient: '孙**', dept: '神经内科', doctor: '周**', defectType: '现病史描述不规范', severity: 'low', foundAt: '2026-10-19 15:00', status: 'waived', demo: true },
  { id: 'd-5', recordNo: 'EMR-20261017-008', patient: '钱**', dept: '骨科', doctor: '吴**', defectType: '手术记录缺术者签名', severity: 'high', foundAt: '2026-10-18 11:20', status: 'fixed', demo: true },
];

const DEMO_GRADE: GradeRateRow[] = [
  { dept: '全院', grade: '甲', count: 486, rate: 92.5 },
  { dept: '全院', grade: '乙', count: 32, rate: 6.1 },
  { dept: '全院', grade: '丙', count: 7, rate: 1.4 },
];

const DEMO_TYPES: DefectTypeRow[] = [
  { id: 't-1', type: '出院小结缺项', count: 28, percent: 26.4, demo: true },
  { id: 't-2', type: '病程记录超时', count: 22, percent: 20.8, demo: true },
  { id: 't-3', type: '知情同意书缺陷', count: 18, percent: 17.0, demo: true },
  { id: 't-4', type: '现病史描述不规范', count: 15, percent: 14.2, demo: true },
  { id: 't-5', type: '手术/麻醉记录缺签名', count: 12, percent: 11.3, demo: true },
  { id: 't-6', type: '医嘱与病历不一致', count: 11, percent: 10.3, demo: true },
];

const DEMO_RANKING: DeptRankingRow[] = [
  { id: 'r-1', dept: '心内科', total: 96, gradeA: 93, gradeARate: 96.9, defectCount: 3, rank: 1, demo: true },
  { id: 'r-2', dept: '普外科', total: 88, gradeA: 82, gradeARate: 93.2, defectCount: 6, rank: 2, demo: true },
  { id: 'r-3', dept: '呼吸内科', total: 75, gradeA: 68, gradeARate: 90.7, defectCount: 7, rank: 3, demo: true },
  { id: 'r-4', dept: '神经内科', total: 64, gradeA: 57, gradeARate: 89.1, defectCount: 9, rank: 4, demo: true },
  { id: 'r-5', dept: '骨科', total: 58, gradeA: 49, gradeARate: 84.5, defectCount: 10, rank: 5, demo: true },
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

export const fetchEmrQualityDefects = () =>
  safeGet<EmrDefectRow>('/emr-quality/defects', DEMO_DEFECTS);
export const fetchGradeRate = () =>
  safeGet<GradeRateRow>('/emr-quality/grade-rate', DEMO_GRADE);
export const fetchDefectTypes = () =>
  safeGet<DefectTypeRow>('/emr-quality/defect-types', DEMO_TYPES);
export const fetchDeptRanking = () =>
  safeGet<DeptRankingRow>('/emr-quality/dept-ranking', DEMO_RANKING);
