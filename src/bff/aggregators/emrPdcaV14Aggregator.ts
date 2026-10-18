/**
 * 健澜科技 jlmedaios - 病历质控 PDCA 循环管理 V14 聚合器（M468-D，M468 收官）
 *
 * 纯函数：PDCA 计划创建 + 阶段推进。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** PDCA 阶段 */
export type PdcaStageV14 = "plan" | "do" | "check" | "act";

/** PDCA 计划 */
export interface PdcaPlanV14 {
  id: string;
  title: string;
  description: string;
  stage: PdcaStageV14;
}

/** 阶段推进顺序 */
const STAGE_ORDER: PdcaStageV14[] = ["plan", "do", "check", "act"];

/**
 * 创建 PDCA 计划（初始阶段为 plan）。
 *
 * @param title 计划标题
 * @param description 计划描述
 * @returns PDCA 计划
 */
export function buildPdcaPlan(title: string, description: string): PdcaPlanV14 {
  return {
    id: `PDCA-${Date.now()}`,
    title,
    description,
    stage: "plan",
  };
}

/**
 * 推进 PDCA 阶段：plan→do→check→act→act（act 为终态不再推进）。
 *
 * @param plan 当前计划
 * @returns 推进后的计划
 */
export function advancePdcaStage(plan: PdcaPlanV14): PdcaPlanV14 {
  if (plan.stage === "act") return { ...plan };
  const currentIdx = STAGE_ORDER.indexOf(plan.stage);
  const nextStage = STAGE_ORDER[currentIdx + 1] ?? "act";
  return { ...plan, stage: nextStage };
}
