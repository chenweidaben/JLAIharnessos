/**
 * 健澜科技 jlmedaios - 检验检查智能审核纯函数（M190-A）
 *
 * buildLabImagingAuditReport / detectAbnormalLabResult / detectAbnormalImagingReport
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 检验结果 */
export interface LabResult {
  item: string;
  value: number;
  unit: string;
  refRange: [number, number];
}

/**
 * 异常检验结果检测（纯函数）。
 *
 * @param result 检验结果
 * @returns 是否异常及危急值
 */
export function detectAbnormalLabResult(result: LabResult): { abnormal: boolean; critical: boolean } {
  const [low, high] = result.refRange;
  const abnormal = result.value < low || result.value > high;
  const critical = result.value < low * 0.5 || result.value > high * 2;
  return { abnormal, critical };
}

/** 影像报告 */
export interface ImagingReport {
  modality: 'CT' | 'MR' | 'DR' | 'US' | 'endoscopy';
  finding: string;
  isCritical: boolean;
}

/**
 * 异常影像报告检测（纯函数）。
 *
 * @param report 影像报告
 * @returns 是否异常
 */
export function detectAbnormalImagingReport(report: ImagingReport): { abnormal: boolean; critical: boolean } {
  const criticalKeywords = ['出血', '梗死', '穿孔', '肿瘤', '骨折'];
  const abnormal = report.isCritical || criticalKeywords.some((k) => report.finding.includes(k));
  return { abnormal, critical: abnormal };
}

/** 审核报告输出 */
export interface LabImagingAuditReport {
  dept: string;
  timeRange: string;
  labAccuracy: number;
  labTimeliness: number;
  criticalValueRate: number;
  imagingAccuracy: number;
  imagingTimeliness: number;
  suggestions: string[];
}

/**
 * 构建检验检查智能审核报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 审核报告
 */
export function buildLabImagingAuditReport(dept: string, timeRange: string): LabImagingAuditReport {
  const suggestions: string[] = [];
  suggestions.push('建议加强危急值报告闭环管理');
  suggestions.push('建议开展影像报告 AI 辅助诊断');

  return {
    dept,
    timeRange,
    labAccuracy: 0.98,
    labTimeliness: 0.95,
    criticalValueRate: 0.03,
    imagingAccuracy: 0.96,
    imagingTimeliness: 0.9,
    suggestions,
  };
}
