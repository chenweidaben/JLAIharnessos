/**
 * 健澜科技 jlmedaios - AI 模型漂移监控 V13 纯函数（M325-C）
 *
 * computeKLDivergenceV13 / detectDriftAlertV13 / buildDriftReportV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 分布项 */
export interface DistributionV13 {
  bin: string;
  probability: number;
}

/**
 * KL 散度（纯函数）：按分布比对，近似计算。
 * 公式：KL(current || baseline) = Σ p_current * ln(p_current / p_baseline)
 *
 * @param current 当前分布
 * @param baseline 基线分布
 * @returns KL 散度（保留 2 位小数）
 */
export function computeKLDivergenceV13(current: DistributionV13[], baseline: DistributionV13[]): number {
  if (current.length === 0 || baseline.length === 0) return 0;
  let kl = 0;
  for (const c of current) {
    const b = baseline.find((item) => item.bin === c.bin);
    if (!b || b.probability === 0) continue;
    const ratio = c.probability / b.probability;
    if (ratio > 0) {
      kl += c.probability * Math.log(ratio);
    }
  }
  return Math.round(kl * 100) / 100;
}

/**
 * 漂移预警（纯函数）：>0.1 预警。
 *
 * @param kl KL 散度
 * @returns 预警状态：green=无预警 / red=预警
 */
export function detectDriftAlertV13(kl: number): "green" | "red" {
  return kl > 0.1 ? "red" : "green";
}

/**
 * 漂移报告（纯函数）：KL 值 + 预警状态。
 *
 * @param current 当前分布
 * @param baseline 基线分布
 * @returns 漂移报告
 */
export function buildDriftReportV13(current: DistributionV13[], baseline: DistributionV13[]): { klValue: number; alert: "green" | "red" } {
  const kl = computeKLDivergenceV13(current, baseline);
  return { klValue: kl, alert: detectDriftAlertV13(kl) };
}
