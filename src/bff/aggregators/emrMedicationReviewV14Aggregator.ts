/**
 * 健澜科技 jlmedaios - 病历合理用药审查 V14 聚合器（M537-A）
 *
 * 纯函数：构建用药审查基础数据 + 合理用药审查 + 构建审查报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 用药审查基础数据 */
export interface MedicationReviewV14 {
  recordId: string;
  dept: string;
}

/** 用药审查输入 */
export interface MedicationReviewInputV14 {
  drugName: string;
  dosage: number;
  hasAllergy: boolean;
}

/** 用药审查结果 */
export interface MedicationReviewResultV14 {
  safe: boolean;
  warnings: string[];
}

/** 用药审查报告 */
export interface MedicationReviewReportV14 {
  safe: boolean;
  warnings: string[];
}

/**
 * 构建用药审查基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 用药审查基础数据
 */
export function buildMedicationReview(recordId: string, dept: string): MedicationReviewV14 {
  return { recordId, dept };
}

/**
 * 合理用药审查。
 * warnings 初始空数组；依次检查 2 个条件：
 *   1) hasAllergy → warnings.push('存在过敏史，需警惕')
 *   2) dosage > 100 → warnings.push('剂量超出常规上限')
 * safe = warnings.length === 0。
 *
 * @param input 审查输入（药品名 + 剂量 + 是否过敏）
 * @returns 审查结果（safe + warnings）
 */
export function checkMedication(input: MedicationReviewInputV14): MedicationReviewResultV14 {
  const warnings: string[] = [];
  // 手算：条件1 hasAllergy → '存在过敏史，需警惕'
  // 测试2：hasAllergy=false → 不触发
  // 测试3：hasAllergy=true → 触发
  if (input.hasAllergy) {
    warnings.push("存在过敏史，需警惕");
  }
  // 手算：条件2 dosage > 100 → '剂量超出常规上限'
  // 测试2：dosage=50 → 50>100=false → 不触发
  // 测试3：dosage=150 → 150>100=true → 触发
  if (input.dosage > 100) {
    warnings.push("剂量超出常规上限");
  }
  // 手算：safe = warnings.length === 0
  // 测试2：warnings=[] → safe=true
  // 测试3：warnings=['存在过敏史，需警惕','剂量超出常规上限'] → safe=false
  const safe = warnings.length === 0;
  return { safe, warnings };
}

/**
 * 构建审查报告。
 *
 * @param result 审查结果
 * @returns 审查报告（safe + warnings 透传）
 */
export function buildMedicationReviewReport(result: MedicationReviewResultV14): MedicationReviewReportV14 {
  // 手算：透传 safe + warnings
  // 测试4：{safe=false, warnings=['存在过敏史，需警惕','剂量超出常规上限']} → 透传
  return { safe: result.safe, warnings: result.warnings };
}
