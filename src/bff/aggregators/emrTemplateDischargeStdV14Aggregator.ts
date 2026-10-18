/**
 * 健澜科技 jlmedaios - 出院小结模板标准化 V14 聚合器（M523-D，M523 收官）
 *
 * 纯函数：构建出院模板标准化基础数据 + 标准化出院模板 + 构建标准化报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 出院模板标准化基础数据 */
export interface DischargeStdV14 {
  dept: string;
  stdVersion: string;
}

/** 标准化输入 */
export interface DischargeStdInputV14 {
  diagnosis: string;
  treatment: string;
  followUp: string;
}

/** 标准化结果 */
export interface DischargeStdResultV14 {
  hasDiagnosis: boolean;
  hasTreatment: boolean;
  hasFollowUp: boolean;
  standardScore: number;
}

/** 标准化报告 */
export interface DischargeStdReportV14 {
  standardScore: number;
  grade: string;
}

/**
 * 构建出院模板标准化基础数据。
 *
 * @param dept 科室
 * @param stdVersion 标准版本
 * @returns 出院模板标准化基础数据
 */
export function buildDischargeStd(dept: string, stdVersion: string): DischargeStdV14 {
  return { dept, stdVersion };
}

/**
 * 标准化出院模板。
 * 3 字段非空即 true；standardScore = true 字段数 × 33.3，保留 1 位小数。
 *
 * @param input 标准化输入（诊断/治疗/随访）
 * @returns 标准化结果（hasDiagnosis + hasTreatment + hasFollowUp + standardScore）
 */
export function standardizeDischargeTemplate(input: DischargeStdInputV14): DischargeStdResultV14 {
  // 手算：3 字段非空即 true
  // 测试2：diagnosis='冠心病'非空→hasDiagnosis=true; treatment='PCI术后'非空→hasTreatment=true; followUp='1月后复诊'非空→hasFollowUp=true
  // 测试3：diagnosis='冠心病'非空→hasDiagnosis=true; treatment=''空→hasTreatment=false; followUp='1月后复诊'非空→hasFollowUp=true
  const hasDiagnosis = input.diagnosis.trim().length > 0;
  const hasTreatment = input.treatment.trim().length > 0;
  const hasFollowUp = input.followUp.trim().length > 0;
  // 手算：standardScore = true 字段数 × 33.3，保留 1 位小数
  // 测试2：3 个 true → 3 × 33.3 = 99.9
  // 测试3：2 个 true → 2 × 33.3 = 66.6
  const trueCount = (hasDiagnosis ? 1 : 0) + (hasTreatment ? 1 : 0) + (hasFollowUp ? 1 : 0);
  const standardScore = Math.round(trueCount * 33.3 * 10) / 10;
  return { hasDiagnosis, hasTreatment, hasFollowUp, standardScore };
}

/**
 * 构建标准化报告。
 * standardScore >= 90 → '完全标准化'；>= 70 → '基本标准化'；否则 '需完善'。
 *
 * @param result 标准化结果
 * @returns 标准化报告（standardScore + grade）
 */
export function buildDischargeStdReport(result: { standardScore: number; hasFollowUp: boolean }): DischargeStdReportV14 {
  // 手算：standardScore=99.9 >= 90 → '完全标准化'
  let grade: string;
  if (result.standardScore >= 90) {
    grade = "完全标准化";
  } else if (result.standardScore >= 70) {
    grade = "基本标准化";
  } else {
    grade = "需完善";
  }
  return { standardScore: result.standardScore, grade };
}
