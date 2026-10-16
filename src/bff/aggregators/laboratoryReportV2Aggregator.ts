/**
 * 健澜科技 jlmedaios - 检验中心 V2 纯函数（M223-A）
 *
 * buildLaboratoryReportV2 / assessLabQuality / handleCriticalValue
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估检验质量（纯函数）。
 *
 * @param QC 室内质控合格率
 * @param EQA 室间质评合格率
 * @returns 质量等级
 */
export function assessLabQuality(QC: number, EQA: number): { level: string; pass: boolean } {
  const avg = (QC + EQA) / 2;
  let level = '合格';
  if (avg >= 95) level = '优秀';
  else if (avg < 80) level = '不合格';
  return { level, pass: avg >= 80 };
}

/**
 * 处理危急值（纯函数）。
 *
 * @param result 检验结果
 * @param thresholds 危急阈值
 * @returns 是否危急
 */
export function handleCriticalValue(result: number, thresholds: { low: number; high: number }): { critical: boolean; action: string } {
  if (result <= thresholds.low) return { critical: true, action: '立即报告临床' };
  if (result >= thresholds.high) return { critical: true, action: '立即报告临床' };
  return { critical: false, action: '常规审核' };
}

/** 检验中心 V2 报告输出 */
export interface LaboratoryReportV2 {
  timeRange: string;
  preanalytic: { errors: number };
  analytic: { tests: number };
  postanalytic: { reports: number };
  emergency: { stat: number };
  microbiology: { cultures: number; ast: number };
  molecular: { pcr: number; sequencing: number; massSpec: number };
  reporting: { lis: boolean; mutual: boolean; kiosk: number };
  management: { satisfaction: number };
  suggestions: string[];
}

/**
 * 构建检验中心 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 检验中心 V2 报告
 */
export function buildLaboratoryReportV2(timeRange: string): LaboratoryReportV2 {
  return {
    timeRange,
    preanalytic: { errors: 5 },
    analytic: { tests: 500000 },
    postanalytic: { reports: 480000 },
    emergency: { stat: 30000 },
    microbiology: { cultures: 10000, ast: 5000 },
    molecular: { pcr: 20000, sequencing: 500, massSpec: 2000 },
    reporting: { lis: true, mutual: true, kiosk: 20 },
    management: { satisfaction: 95 },
    suggestions: ['降低检验前错误率', '扩大互认项目'],
  };
}
