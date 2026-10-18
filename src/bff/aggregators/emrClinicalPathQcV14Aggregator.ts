/**
 * 健澜科技 jlmedaios - 临床路径质控 V14 聚合器（M480-B）
 *
 * 纯函数：临床路径质控记录构建 + 路径变异检测。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 临床路径质控记录 */
export interface ClinicalPathQcV14 {
  patientId: string;
  diagnosis: string;
}

/** 路径步骤 */
export interface PathStepV14 {
  name: string;
  planned: string;
  actual: string;
}

/** 路径变异 */
export interface PathVariationV14 {
  stepName: string;
  variation: string;
}

/**
 * 构建临床路径质控记录。
 *
 * @param patientId 患者 ID
 * @param diagnosis 诊断
 * @returns 临床路径质控记录
 */
export function buildClinicalPathQc(patientId: string, diagnosis: string): ClinicalPathQcV14 {
  return { patientId, diagnosis };
}

/**
 * 检测路径变异：planned≠actual 视为变异。
 *
 * @param steps 路径步骤列表
 * @returns 变异列表
 */
export function detectPathVariation(steps: PathStepV14[]): PathVariationV14[] {
  const variations: PathVariationV14[] = [];
  for (const step of steps) {
    if (step.planned !== step.actual) {
      variations.push({
        stepName: step.name,
        variation: `计划"${step.planned}" vs 实际"${step.actual}"`,
      });
    }
  }
  return variations;
}
