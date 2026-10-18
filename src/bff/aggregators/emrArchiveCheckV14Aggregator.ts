/**
 * 健澜科技 jlmedaios - 病历自动归档检查 V14 聚合器（M533-A）
 *
 * 纯函数：构建归档检查基础数据 + 归档就绪检查 + 构建检查报告。
 * 命名空间与 M527-C emrArchiveAutoCheckV14（归档自动检查模块）区分，本模块专注归档就绪检查。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 归档检查基础数据 */
export interface ArchiveCheckV14 {
  recordId: string;
  dept: string;
}

/** 归档就绪检查输入 */
export interface ArchiveCheckInputV14 {
  hasDischargeSummary: boolean;
  hasSignature: boolean;
  hasPayment: boolean;
}

/** 归档就绪检查结果 */
export interface ArchiveCheckResultV14 {
  ready: boolean;
  missingCount: number;
}

/** 归档检查报告 */
export interface ArchiveCheckReportV14 {
  ready: boolean;
  missingCount: number;
}

/**
 * 构建归档检查基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 归档检查基础数据
 */
export function buildArchiveCheck(recordId: string, dept: string): ArchiveCheckV14 {
  return { recordId, dept };
}

/**
 * 归档就绪检查。
 * 3 项都 true 才 ready=true；missingCount = false 项数。
 *
 * @param input 检查输入（出院小结 + 签名 + 费用结算 3 项布尔）
 * @returns 检查结果（ready + missingCount）
 */
export function checkArchiveReadiness(input: ArchiveCheckInputV14): ArchiveCheckResultV14 {
  // 手算：ready = 3 项都 true
  // 测试2：hasDischargeSummary=true, hasSignature=true, hasPayment=true → ready=true
  // 测试3：hasSignature=false → ready=false
  const ready = input.hasDischargeSummary && input.hasSignature && input.hasPayment;
  // 手算：missingCount = false 项数
  // 测试2：3 项都 true → missingCount=0
  // 测试3：hasSignature=false, hasPayment=false → missingCount=2
  const missingCount =
    (input.hasDischargeSummary ? 0 : 1) +
    (input.hasSignature ? 0 : 1) +
    (input.hasPayment ? 0 : 1);
  return { ready, missingCount };
}

/**
 * 构建检查报告。
 *
 * @param result 检查结果
 * @returns 检查报告（ready + missingCount 透传）
 */
export function buildArchiveCheckReport(result: ArchiveCheckResultV14): ArchiveCheckReportV14 {
  // 手算：透传 ready + missingCount
  // 测试4：{ready:false, missingCount:2} → ready=false, missingCount=2
  return { ready: result.ready, missingCount: result.missingCount };
}
