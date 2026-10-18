/**
 * 健澜科技 jlmedaios - 病历归档自动检查 V14 聚合器（M527-C）
 *
 * 纯函数：构建归档检查基础数据 + 归档前检查 + 构建归档报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 归档检查基础数据 */
export interface ArchiveAutoCheckV14 {
  recordId: string;
  dept: string;
}

/** 归档检查输入 */
export interface ArchiveAutoCheckInputV14 {
  hasDischargeSummary: boolean;
  hasSignature: boolean;
  hasPayment: boolean;
}

/** 归档检查结果 */
export interface ArchiveAutoCheckResultV14 {
  canArchive: boolean;
  missingItems: string[];
}

/** 归档报告 */
export interface ArchiveAutoCheckReportV14 {
  canArchive: boolean;
  missingCount: number;
}

/**
 * 构建归档检查基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 归档检查基础数据
 */
export function buildArchiveAutoCheck(recordId: string, dept: string): ArchiveAutoCheckV14 {
  return { recordId, dept };
}

/**
 * 归档前检查。
 * 3 项都 true 才能归档（出院小结 + 签名 + 费用结算），否则列出缺失项。
 *
 * @param input 归档检查输入（出院小结/签名/费用结算）
 * @returns 检查结果（canArchive + missingItems）
 */
export function checkBeforeArchive(input: ArchiveAutoCheckInputV14): ArchiveAutoCheckResultV14 {
  // 手算：逐项检查，缺失项加入 missingItems
  // 测试2：hasDischargeSummary=true, hasSignature=true, hasPayment=true → missingItems=[]
  // 测试3：hasDischargeSummary=true, hasSignature=false, hasPayment=false → missingItems=['缺签名','缺费用结算']
  const missingItems: string[] = [];
  if (!input.hasDischargeSummary) {
    missingItems.push("缺出院小结");
  }
  if (!input.hasSignature) {
    missingItems.push("缺签名");
  }
  if (!input.hasPayment) {
    missingItems.push("缺费用结算");
  }
  // 手算：canArchive = missingItems.length === 0
  // 测试2：missingItems=[] → canArchive=true
  // 测试3：missingItems=['缺签名','缺费用结算'] → canArchive=false
  const canArchive = missingItems.length === 0;
  return { canArchive, missingItems };
}

/**
 * 构建归档报告。
 *
 * @param result 归档检查结果（canArchive + missingCount）
 * @returns 归档报告（canArchive + missingCount 透传）
 */
export function buildArchiveAutoCheckReport(result: { canArchive: boolean; missingCount: number }): ArchiveAutoCheckReportV14 {
  // 手算：透传 canArchive + missingCount
  // 测试4：{canArchive:false, missingCount:2} → canArchive=false, missingCount=2
  return { canArchive: result.canArchive, missingCount: result.missingCount };
}
