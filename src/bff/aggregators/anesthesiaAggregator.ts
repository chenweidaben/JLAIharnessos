/**
 * 健澜科技 jlmedaios - 麻醉管理纯函数（M190-C）
 *
 * buildAnesthesiaReport / detectAnesthesiaComplication / calculateAnesthesiaWorkload
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 麻醉记录 */
export interface AnesthesiaRecord {
  patientId: string;
  asaGrade: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
  anesthesiaType: 'general' | 'regional' | 'local';
  duration: number;
  complications?: Array<'circulation' | 'respiratory' | 'neurological' | 'allergy'>;
}

/**
 * 麻醉并发症检测（纯函数）。
 *
 * @param record 麻醉记录
 * @returns 是否有并发症及类型
 */
export function detectAnesthesiaComplication(record: AnesthesiaRecord): { hasComplication: boolean; types: string[] } {
  if (!record.complications || record.complications.length === 0) {
    return { hasComplication: false, types: [] };
  }
  return { hasComplication: true, types: record.complications };
}

/**
 * 麻醉医生工作量计算（纯函数）。
 *
 * @param records 麻醉记录列表
 * @returns 总工作量（小时）
 */
export function calculateAnesthesiaWorkload(records: AnesthesiaRecord[]): { totalHours: number; caseCount: number; avgHours: number } {
  const totalHours = records.reduce((sum, r) => sum + r.duration, 0);
  const caseCount = records.length;
  const avgHours = caseCount > 0 ? Math.round((totalHours / caseCount) * 10) / 10 : 0;
  return { totalHours, caseCount, avgHours };
}

/** 麻醉报告输出 */
export interface AnesthesiaReport {
  dept: string;
  timeRange: string;
  totalCases: number;
  asaDistribution: { grade: string; count: number }[];
  complicationRate: number;
  recoveryRate: number;
  workload: { totalHours: number; caseCount: number; avgHours: number };
  equipmentAlerts: string[];
}

/**
 * 构建麻醉管理报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 麻醉报告
 */
export function buildAnesthesiaReport(dept: string, timeRange: string): AnesthesiaReport {
  const mockRecords: AnesthesiaRecord[] = [
    { patientId: 'P001', asaGrade: 'II', anesthesiaType: 'general', duration: 2.5 },
    { patientId: 'P002', asaGrade: 'III', anesthesiaType: 'general', duration: 3.0 },
    { patientId: 'P003', asaGrade: 'I', anesthesiaType: 'regional', duration: 1.5 },
  ];

  return {
    dept,
    timeRange,
    totalCases: 120,
    asaDistribution: [
      { grade: 'I', count: 25 },
      { grade: 'II', count: 60 },
      { grade: 'III', count: 28 },
      { grade: 'IV-VI', count: 7 },
    ],
    complicationRate: 0.025,
    recoveryRate: 0.985,
    workload: calculateAnesthesiaWorkload(mockRecords),
    equipmentAlerts: ['麻醉机 #03 自检异常，建议检修', '监护仪 #07 电池电量低'],
  };
}
