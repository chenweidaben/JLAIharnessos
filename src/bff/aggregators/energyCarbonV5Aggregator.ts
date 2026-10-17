/**
 * 健澜科技 jlmedaios - 能源碳排放与绿色医院 V5 纯函数（M279-D）
 *
 * calculateCarbonV5 / detectEnergyAnomalyV5 / trackCarbonReductionV5 / buildEnergyCarbonV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 能耗数据 */
export interface EnergyUsage {
  zone: string;
  kwh: number;
  water: number;
  gas: number;
}

/**
 * 碳足迹计算 V5（纯函数）：电0.58kg/kWh，气2.1kg/m³，水0.91kg/吨。
 *
 * @param usage 能耗
 * @returns 碳排放kg
 */
export function calculateCarbonV5(usage: EnergyUsage): { carbonKg: number; breakdown: { electricity: number; gas: number; water: number } } {
  const electricity = Math.round(usage.kwh * 0.58 * 10) / 10;
  const gas = Math.round(usage.gas * 2.1 * 10) / 10;
  const water = Math.round(usage.water * 0.91 * 10) / 10;
  const carbonKg = Math.round((electricity + gas + water) * 10) / 10;
  return { carbonKg, breakdown: { electricity, gas, water } };
}

/**
 * 能耗异常检测 V5（纯函数）：超出基准20%即异常。
 *
 * @param usage 当前能耗
 * @param baseline 基准（同区域均值）
 * @returns 是否异常
 */
export function detectEnergyAnomalyV5(usage: number, baseline: number): { anomalous: boolean; deviationPct: number } {
  const deviationPct = baseline > 0 ? Math.round(((usage - baseline) / baseline) * 1000) / 10 : 0;
  const anomalous = deviationPct > 20;
  return { anomalous, deviationPct };
}

/**
 * 减排进度追踪 V5（纯函数）。
 *
 * @param actual 实际碳排
 * @param target 目标碳排
 * @param baseline 基准碳排
 * @returns 减排进度
 */
export function trackCarbonReductionV5(actual: number, target: number, baseline: number): { reductionPct: number; onTrack: boolean; remainingKg: number } {
  const reductionPct = baseline > 0 ? Math.round(((baseline - actual) / baseline) * 1000) / 10 : 0;
  const onTrack = actual <= target;
  const remainingKg = Math.max(0, actual - target);
  return { reductionPct, onTrack, remainingKg };
}

/** 能耗碳排报告输出 */
export interface EnergyCarbonV5Report {
  totalCarbonKg: number;
  byZone: Record<string, number>;
  anomalyCount: number;
  reductionPct: number;
  onTrack: boolean;
  suggestions: string[];
}

/**
 * 构建能耗碳排报告（纯函数）。
 *
 * @param usages 各区域能耗
 * @param baselineCarbon 基准碳排
 * @param targetCarbon 目标碳排
 * @returns 报告
 */
export function buildEnergyCarbonV5Report(
  usages: EnergyUsage[],
  baselineCarbon: number,
  targetCarbon: number,
): EnergyCarbonV5Report {
  const byZone: Record<string, number> = {};
  let totalCarbonKg = 0;
  for (const u of usages) {
    const carbon = calculateCarbonV5(u).carbonKg;
    byZone[u.zone] = carbon;
    totalCarbonKg += carbon;
  }
  const avgUsage = usages.length > 0 ? usages.reduce((s, u) => s + u.kwh, 0) / usages.length : 0;
  let anomalyCount = 0;
  for (const u of usages) {
    if (detectEnergyAnomalyV5(u.kwh, avgUsage * 1.2).anomalous) anomalyCount += 1;
  }
  const reduction = trackCarbonReductionV5(totalCarbonKg, targetCarbon, baselineCarbon);
  return {
    totalCarbonKg: Math.round(totalCarbonKg * 10) / 10,
    byZone,
    anomalyCount,
    reductionPct: reduction.reductionPct,
    onTrack: reduction.onTrack,
    suggestions: anomalyCount > 0
      ? [`${anomalyCount} 个区域能耗异常偏高，需排查照明空调`]
      : ["能耗平稳，推进光伏与节能改造"],
  };
}
