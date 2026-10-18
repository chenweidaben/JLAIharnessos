/**
 * 健澜科技 jlmedaios - 病案首页完整性校验 V14 聚合器（M535-A）
 *
 * 纯函数：构建首页完整性校验基础数据 + 首页完整性校验 + 构建校验报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 首页完整性校验基础数据 */
export interface HomepageCompleteV14 {
  recordId: string;
  dept: string;
}

/** 首页完整性校验输入 */
export interface HomepageCompleteInputV14 {
  hasMainDiagnosis: boolean;
  hasMainSurgery: boolean;
  hasAdmissionDate: boolean;
  hasDischargeDate: boolean;
}

/** 首页完整性校验结果 */
export interface HomepageCompleteResultV14 {
  complete: boolean;
  missingCount: number;
}

/** 首页完整性校验报告 */
export interface HomepageCompleteReportV14 {
  complete: boolean;
  missingCount: number;
}

/**
 * 构建首页完整性校验基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 首页完整性校验基础数据
 */
export function buildHomepageComplete(recordId: string, dept: string): HomepageCompleteV14 {
  return { recordId, dept };
}

/**
 * 首页完整性校验。
 * 4 项都 true 才 complete=true；missingCount = false 项数。
 *
 * @param input 校验输入（主诊断 + 主手术 + 入院日期 + 出院日期 4 项布尔）
 * @returns 校验结果（complete + missingCount）
 */
export function checkHomepageComplete(input: HomepageCompleteInputV14): HomepageCompleteResultV14 {
  // 手算：complete = 4 项都 true
  // 测试2：hasMainDiagnosis=true, hasMainSurgery=true, hasAdmissionDate=true, hasDischargeDate=true → complete=true
  // 测试3：hasMainSurgery=false, hasDischargeDate=false → complete=false
  const complete =
    input.hasMainDiagnosis &&
    input.hasMainSurgery &&
    input.hasAdmissionDate &&
    input.hasDischargeDate;
  // 手算：missingCount = false 项数
  // 测试2：4 项都 true → missingCount=0
  // 测试3：hasMainSurgery=false, hasDischargeDate=false → missingCount=2
  const missingCount =
    (input.hasMainDiagnosis ? 0 : 1) +
    (input.hasMainSurgery ? 0 : 1) +
    (input.hasAdmissionDate ? 0 : 1) +
    (input.hasDischargeDate ? 0 : 1);
  return { complete, missingCount };
}

/**
 * 构建校验报告。
 *
 * @param result 校验结果
 * @returns 校验报告（complete + missingCount 透传）
 */
export function buildHomepageCompleteReport(result: HomepageCompleteResultV14): HomepageCompleteReportV14 {
  // 手算：透传 complete + missingCount
  // 测试4：{complete:false, missingCount:2} → complete=false, missingCount=2
  return { complete: result.complete, missingCount: result.missingCount };
}
