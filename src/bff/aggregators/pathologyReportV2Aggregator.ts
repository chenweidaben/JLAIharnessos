/**
 * 健澜科技 jlmedaios - 病理中心 V2 纯函数（M223-C）
 *
 * buildPathologyReportV2 / diagnosePathology / assessIHCQuality
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 病理诊断（纯函数）。
 *
 * @param specimen 标本数
 * @param slides 切片数
 * @returns 诊断数
 */
export function diagnosePathology(specimen: number, slides: number): { diagnosed: number; benign: number; malignant: number } {
  const malignant = Math.round(specimen * 0.3);
  return { diagnosed: specimen, benign: specimen - malignant, malignant };
}

/**
 * 评估 IHC 质量（纯函数）。
 *
 * @param stains 染色数
 * @param controls 对照合格数
 * @returns 合格率
 */
export function assessIHCQuality(stains: number, controls: number): { rate: number; pass: boolean } {
  const rate = stains > 0 ? Math.round((controls / stains) * 100) : 0;
  return { rate, pass: rate >= 90 };
}

/** 病理中心 V2 报告输出 */
export interface PathologyReportV2 {
  timeRange: string;
  accessioning: { specimens: number };
  histology: { he: number };
  cytology: { tct: number };
  ihc: { stains: number };
  molecular: { fish: number; companion: number };
  frozen: { intraop: number; within30min: number };
  reporting: { blocks: number };
  management: { satisfaction: number };
  suggestions: string[];
}

/**
 * 构建病理中心 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 病理中心 V2 报告
 */
export function buildPathologyReportV2(timeRange: string): PathologyReportV2 {
  return {
    timeRange,
    accessioning: { specimens: 20000 },
    histology: { he: 50000 },
    cytology: { tct: 10000 },
    ihc: { stains: 30000 },
    molecular: { fish: 2000, companion: 500 },
    frozen: { intraop: 500, within30min: 490 },
    reporting: { blocks: 80000 },
    management: { satisfaction: 94 },
    suggestions: ['缩短术中冰冻时间', '扩大伴随诊断'],
  };
}
