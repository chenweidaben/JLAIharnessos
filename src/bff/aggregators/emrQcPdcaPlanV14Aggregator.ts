/**
 * 健澜科技 jlmedaios - 质控 PDCA 改进计划 V14 聚合器（M504-A）
 *
 * 纯函数：PDCA 改进计划构建 + 阶段推进 + 报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** PDCA 改进计划 */
export interface PdcaPlanV14 {
  title: string;
  currentPhase: string;
}

/** PDCA 报告 */
export interface PdcaReportV14 {
  title: string;
  currentPhase: string;
  nextPhase: string;
  isComplete: boolean;
}

/**
 * 构建 PDCA 改进计划。
 *
 * @param title 计划标题
 * @param currentPhase 当前阶段（P/D/C/A）
 * @returns PDCA 改进计划
 */
export function buildPdcaPlan(title: string, currentPhase: string): PdcaPlanV14 {
  return { title, currentPhase };
}

/**
 * 推进 PDCA 阶段。
 *
 * @param current 当前阶段
 * @returns 下一阶段（P→D→C→A→完成）
 */
export function advancePdcaPhase(current: string): string {
  // 手算阶段推进：P→D→C→A→完成
  switch (current) {
    case "P":
      return "D";
    case "D":
      return "C";
    case "C":
      return "A";
    case "A":
      return "完成";
    default:
      return "完成";
  }
}

/**
 * 构建 PDCA 报告。
 *
 * @param plan PDCA 改进计划
 * @returns PDCA 报告（title + currentPhase + nextPhase + isComplete）
 */
export function buildPdcaReport(plan: PdcaPlanV14): PdcaReportV14 {
  const nextPhase = advancePdcaPhase(plan.currentPhase);
  const isComplete = nextPhase === "完成";
  return {
    title: plan.title,
    currentPhase: plan.currentPhase,
    nextPhase,
    isComplete,
  };
}
