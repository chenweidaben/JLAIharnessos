/**
 * 健澜科技 jlmedaios - 院长指挥中心一屏总览 V13 纯函数（M311-D）
 *
 * buildDeanCommandCenterV13 / computeOverallScoreV13 / identifyUrgentAlertV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 指挥中心输入 */
export interface CommandCenterInputV13 {
  flywheelScore: number;
  closureRate: number;
  satisfactionRate: number;
  workloadHealth: number;
  eventSafety: number;
}

/** 指挥中心卡片 */
export interface DeanCommandCenterCardV13 extends CommandCenterInputV13 {
  overallScore: number;
  redLightCount: number;
}

/** 单维度是否红灯（纯函数）：分数 < 60 → 红灯 */
function isRedLight(score: number): boolean {
  return score < 60;
}

/**
 * 指挥中心总览（纯函数）：5 维指标卡，加 overallScore + redLightCount。
 *
 * @param input 5 维输入
 * @returns 卡片
 */
export function buildDeanCommandCenterV13(input: CommandCenterInputV13): DeanCommandCenterCardV13 {
  const redLightCount = [
    input.flywheelScore,
    input.closureRate,
    input.satisfactionRate,
    input.workloadHealth,
    input.eventSafety,
  ].filter(isRedLight).length;
  return {
    ...input,
    overallScore: computeOverallScoreV13(input),
    redLightCount,
  };
}

/**
 * 综合分（纯函数）：5 维各 20 分，加总。
 * 5 维分数（0-100）各占 20% → overall = avg(5 维)。
 *
 * @param input 5 维输入
 * @returns 综合分（整数）
 */
export function computeOverallScoreV13(input: CommandCenterInputV13): number {
  const sum =
    input.flywheelScore +
    input.closureRate +
    input.satisfactionRate +
    input.workloadHealth +
    input.eventSafety;
  return Math.round(sum / 5);
}

/**
 * 紧急告警（纯函数）：红灯维度 ≥ 2 → "存在紧急风险"，否则 "运行平稳"。
 *
 * @param card 卡片
 * @returns 告警描述
 */
export function identifyUrgentAlertV13(card: DeanCommandCenterCardV13): string {
  if (card.redLightCount >= 2) return "存在紧急风险";
  return "运行平稳";
}
