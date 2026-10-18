/**
 * 健澜科技 jlmedaios - 病历逻辑校验 V14 聚合器（M477-B）
 *
 * 纯函数：诊断-治疗-用药逻辑匹配校验。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 逻辑校验数据 */
export interface LogicValidationDataV14 {
  diagnosis: string;
  treatment: string;
  medication: string;
}

/** 逻辑校验结果 */
export interface LogicValidationResultV14 {
  errorCount: number;
  errors: string[];
  passed: boolean;
}

/**
 * 找出逻辑错误：校验诊断-治疗-用药逻辑匹配。
 * 规则：
 *  - 诊断"高血压" → 治疗应含"降压"，用药不应含"降糖"
 *  - 诊断"糖尿病" → 治疗应含"降糖"，用药不应含"降压"
 *
 * @param data 诊断/治疗/用药数据
 * @returns 逻辑错误列表
 */
export function findLogicErrors(data: LogicValidationDataV14): string[] {
  const errors: string[] = [];
  const { diagnosis, treatment, medication } = data;

  if (diagnosis.includes("高血压")) {
    if (!treatment.includes("降压")) {
      errors.push("诊断为高血压，但治疗未包含降压措施");
    }
    if (medication.includes("降糖")) {
      errors.push("诊断为高血压，但用药包含降糖药，逻辑不匹配");
    }
  }

  if (diagnosis.includes("糖尿病")) {
    if (!treatment.includes("降糖")) {
      errors.push("诊断为糖尿病，但治疗未包含降糖措施");
    }
    if (medication.includes("降压")) {
      errors.push("诊断为糖尿病，但用药包含降压药，逻辑不匹配");
    }
  }

  return errors;
}

/**
 * 校验诊断-治疗-用药逻辑匹配。
 *
 * @param data 诊断/治疗/用药数据
 * @returns 逻辑校验结果
 */
export function validateLogicRelations(data: LogicValidationDataV14): LogicValidationResultV14 {
  const errors = findLogicErrors(data);
  const errorCount = errors.length;
  return { errorCount, errors, passed: errorCount === 0 };
}
