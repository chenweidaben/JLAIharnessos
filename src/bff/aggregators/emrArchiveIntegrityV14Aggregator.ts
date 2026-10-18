/**
 * 健澜科技 jlmedaios - 病历归档完整性校验 V14 聚合器（M533-B）
 *
 * 纯函数：构建完整性校验基础数据 + 完整性校验 + 构建校验报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 完整性校验基础数据 */
export interface ArchiveIntegrityV14 {
  recordId: string;
  archiveDate: string;
}

/** 完整性校验输入 */
export interface ArchiveIntegrityInputV14 {
  expectedFields: number;
  actualFields: number;
}

/** 完整性校验结果 */
export interface ArchiveIntegrityResultV14 {
  intact: boolean;
  missingFields: number;
}

/** 完整性校验报告 */
export interface ArchiveIntegrityReportV14 {
  intact: boolean;
  missingFields: number;
}

/**
 * 构建完整性校验基础数据。
 *
 * @param recordId 病历ID
 * @param archiveDate 归档日期
 * @returns 完整性校验基础数据
 */
export function buildArchiveIntegrity(recordId: string, archiveDate: string): ArchiveIntegrityV14 {
  return { recordId, archiveDate };
}

/**
 * 完整性校验。
 * missingFields = expectedFields - actualFields；intact = missingFields === 0。
 *
 * @param input 校验输入（应有字段数 + 实有字段数）
 * @returns 校验结果（intact + missingFields）
 */
export function verifyArchiveIntegrity(input: ArchiveIntegrityInputV14): ArchiveIntegrityResultV14 {
  // 手算：missingFields = expectedFields - actualFields
  // 测试2：10-10 = 0
  // 测试3：10-7 = 3
  const missingFields = input.expectedFields - input.actualFields;
  // 手算：intact = missingFields === 0
  // 测试2：missingFields=0 → intact=true
  // 测试3：missingFields=3 → intact=false
  const intact = missingFields === 0;
  return { intact, missingFields };
}

/**
 * 构建校验报告。
 *
 * @param result 校验结果
 * @returns 校验报告（intact + missingFields 透传）
 */
export function buildArchiveIntegrityReport(result: ArchiveIntegrityResultV14): ArchiveIntegrityReportV14 {
  // 手算：透传 intact + missingFields
  // 测试4：{intact:false, missingFields:3} → intact=false, missingFields=3
  return { intact: result.intact, missingFields: result.missingFields };
}
