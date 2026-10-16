/**
 * 健澜科技 jlmedaios - 检验检查深化 V3 纯函数（M204-D）
 *
 * buildLabImagingReportV3 / assessLabQuality / classifyCriticalValue
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估检验质量（纯函数）。
 *
 * @param qc 室内质控合格率
 * @param eqa 室间质评合格率
 * @returns 质量评估
 */
export function assessLabQuality(qc: number, eqa: number): { level: string; pass: boolean } {
  let level = '优秀';
  if (qc < 0.95 || eqa < 0.9) level = '不合格';
  else if (qc < 0.98 || eqa < 0.95) level = '合格';
  return { level, pass: qc >= 0.95 && eqa >= 0.9 };
}

/**
 * 危急值分类（纯函数）。
 *
 * @param result 结果值
 * @param refLow 参考下限
 * @param refHigh 参考上限
 * @returns 分类
 */
export function classifyCriticalValue(result: number, refLow: number, refHigh: number): { critical: boolean; level: string } {
  if (result <= refLow * 0.5 || result >= refHigh * 2) {
    return { critical: true, level: '危急值' };
  }
  if (result < refLow || result > refHigh) {
    return { critical: false, level: '异常' };
  }
  return { critical: false, level: '正常' };
}

/** 检验检查 V3 报告输出 */
export interface LabImagingReportV3 {
  timeRange: string;
  preAnalytic: { orders: number; collectionErrors: number };
  analytic: { tests: number; qcPassRate: number; eqaPassRate: number };
  postAnalytic: { reports: number; recalls: number; turnaroundMin: number };
  imaging: { ct: number; mr: number; dr: number; ultrasound: number; endoscopy: number };
  imagingQuality: { gradeARate: number; rejectRate: number };
  special: { pathology: number; ecg: number; pulmonary: number };
  criticalValue: { total: number; notified: number; closedLoopRate: number };
  mutualRecognition: { recognized: number };
  suggestions: string[];
}

/**
 * 构建检验检查 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 检验检查 V3 报告
 */
export function buildLabImagingReportV3(timeRange: string): LabImagingReportV3 {
  return {
    timeRange,
    preAnalytic: { orders: 100000, collectionErrors: 50 },
    analytic: { tests: 500000, qcPassRate: 0.99, eqaPassRate: 0.98 },
    postAnalytic: { reports: 500000, recalls: 10, turnaroundMin: 60 },
    imaging: { ct: 2000, mr: 1000, dr: 8000, ultrasound: 5000, endoscopy: 800 },
    imagingQuality: { gradeARate: 0.95, rejectRate: 0.01 },
    special: { pathology: 3000, ecg: 10000, pulmonary: 500 },
    criticalValue: { total: 200, notified: 198, closedLoopRate: 0.99 },
    mutualRecognition: { recognized: 500 },
    suggestions: ['缩短检验周转时间', '提高影像甲级片率'],
  };
}
