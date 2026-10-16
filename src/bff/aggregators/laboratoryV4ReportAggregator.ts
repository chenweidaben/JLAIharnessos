/**
 * 健澜科技 jlmedaios - 检验检查 V4 纯函数（M251-D）
 *
 * buildLaboratoryV4Report / assessLabQualityV4 / handleCriticalValueV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估检验质量 V4（纯函数）。
 *
 * @param QC 室内质控
 * @param EQA 室间质评
 * @returns 质量
 */
export function assessLabQualityV4(QC: { pass: number; total: number }, EQA: { pass: number; total: number }): { iqc: number; eqa: number; overall: number } {
  const iqc = Math.round((QC.pass / Math.max(QC.total, 1)) * 100);
  const eqa = Math.round((EQA.pass / Math.max(EQA.total, 1)) * 100);
  return { iqc, eqa, overall: Math.round((iqc + eqa) / 2) };
}

/**
 * 处理危急值 V4（纯函数）。
 *
 * @param result 结果
 * @param thresholds 阈值
 * @returns 危急值
 */
export function handleCriticalValueV4(result: { glucose: number; potassium: number }, thresholds: { glucose: [number, number]; potassium: [number, number] }): { glucose: boolean; potassium: boolean; critical: boolean; action: string } {
  const glucose = result.glucose < thresholds.glucose[0] || result.glucose > thresholds.glucose[1];
  const potassium = result.potassium < thresholds.potassium[0] || result.potassium > thresholds.potassium[1];
  const critical = glucose || potassium;
  return { glucose, potassium, critical, action: critical ? "立即报告临床并记录" : "按常规发布" };
}

/** 检验 V4 报告输出 */
export interface LaboratoryV4Report {
  timeRange: string;
  preAnalytic: { request: number; sample: number; reject: number };
  intraAnalytic: { instrument: number; reagent: number; iqc: number; eqa: number };
  postAnalytic: { review: number; critical: number; release: number; modify: number };
  emergency: { priority: number; fastTrack: number; poct: number };
  microbiology: { culture: number; id: number; sensitivity: number; bloodCulture: number };
  molecular: { pcr: number; sequencing: number; mass: number; companion: number };
  suggestions: string[];
}

/**
 * 构建检验 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 检验 V4 报告
 */
export function buildLaboratoryV4Report(timeRange: string): LaboratoryV4Report {
  return {
    timeRange,
    preAnalytic: { request: 100000, sample: 99000, reject: 500 },
    intraAnalytic: { instrument: 50, reagent: 100, iqc: 99, eqa: 100 },
    postAnalytic: { review: 99000, critical: 100, release: 98900, modify: 50 },
    emergency: { priority: 5000, fastTrack: 2000, poct: 1000 },
    microbiology: { culture: 5000, id: 4800, sensitivity: 4500, bloodCulture: 500 },
    molecular: { pcr: 3000, sequencing: 200, mass: 100, companion: 50 },
    suggestions: ["降低标本不合格率", "提升危急值报告时效"],
  };
}
