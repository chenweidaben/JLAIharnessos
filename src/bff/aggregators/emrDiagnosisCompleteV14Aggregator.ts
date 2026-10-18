/**
 * 健澜科技 jlmedaios - 病历诊断完整性检查 V14 聚合器（M537-D）
 *
 * 纯函数：构建诊断检查基础数据 + 诊断完整性检查 + 构建诊断报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 诊断检查基础数据 */
export interface DiagnosisCompleteV14 {
  recordId: string;
  dept: string;
}

/** 诊断完整性检查输入 */
export interface DiagnosisCompleteInputV14 {
  hasMainDiagnosis: boolean;
  hasSecondaryDiagnosis: boolean;
  hasDiagnosisCode: boolean;
}

/** 诊断完整性检查结果 */
export interface DiagnosisCompleteResultV14 {
  complete: boolean;
  missingCount: number;
}

/** 诊断完整性检查报告 */
export interface DiagnosisCompleteReportV14 {
  complete: boolean;
  missingCount: number;
}

/**
 * 构建诊断检查基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 诊断检查基础数据
 */
export function buildDiagnosisComplete(recordId: string, dept: string): DiagnosisCompleteV14 {
  return { recordId, dept };
}

/**
 * 诊断完整性检查。
 * 3 项都 true 才 complete=true；missingCount = false 项数。
 *
 * @param input 检查输入（主诊断 + 次要诊断 + 诊断编码 3 项布尔）
 * @returns 检查结果（complete + missingCount）
 */
export function checkDiagnosisComplete(input: DiagnosisCompleteInputV14): DiagnosisCompleteResultV14 {
  // 手算：complete = 3 项都 true
  // 测试2：hasMainDiagnosis=true, hasSecondaryDiagnosis=true, hasDiagnosisCode=true → complete=true
  // 测试3：hasSecondaryDiagnosis=false, hasDiagnosisCode=false → complete=false
  const complete =
    input.hasMainDiagnosis &&
    input.hasSecondaryDiagnosis &&
    input.hasDiagnosisCode;
  // 手算：missingCount = false 项数
  // 测试2：3 项都 true → missingCount=0
  // 测试3：hasSecondaryDiagnosis=false, hasDiagnosisCode=false → missingCount=2
  const missingCount =
    (input.hasMainDiagnosis ? 0 : 1) +
    (input.hasSecondaryDiagnosis ? 0 : 1) +
    (input.hasDiagnosisCode ? 0 : 1);
  return { complete, missingCount };
}

/**
 * 构建诊断报告。
 *
 * @param result 检查结果
 * @returns 诊断报告（complete + missingCount 透传）
 */
export function buildDiagnosisCompleteReport(result: DiagnosisCompleteResultV14): DiagnosisCompleteReportV14 {
  // 手算：透传 complete + missingCount
  // 测试4：{complete:false, missingCount:2} → complete=false, missingCount=2
  return { complete: result.complete, missingCount: result.missingCount };
}
