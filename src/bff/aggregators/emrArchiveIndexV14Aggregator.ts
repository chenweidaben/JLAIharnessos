/**
 * 健澜科技 jlmedaios - 病历归档索引 V14 聚合器（M533-C）
 *
 * 纯函数：构建归档索引基础数据 + 索引条目构建 + 构建索引报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 归档索引基础数据 */
export interface ArchiveIndexV14 {
  dept: string;
  year: number;
}

/** 索引条目输入 */
export interface ArchiveIndexEntryInputV14 {
  recordId: string;
  patientName: string;
  archiveDate: string;
}

/** 索引条目结果 */
export interface ArchiveIndexEntryV14 {
  indexKey: string;
  indexValue: string;
}

/** 索引报告 */
export interface ArchiveIndexReportV14 {
  entryCount: number;
}

/**
 * 构建归档索引基础数据。
 *
 * @param dept 科室
 * @param year 年份
 * @returns 归档索引基础数据
 */
export function buildArchiveIndex(dept: string, year: number): ArchiveIndexV14 {
  return { dept, year };
}

/**
 * 索引条目构建。
 * indexKey = recordId；indexValue = patientName + '|' + archiveDate。
 *
 * @param input 条目输入（病历ID + 患者姓名 + 归档日期）
 * @returns 索引条目（indexKey + indexValue）
 */
export function buildArchiveIndexEntry(input: ArchiveIndexEntryInputV14): ArchiveIndexEntryV14 {
  // 手算：indexKey = recordId
  // 测试2：recordId='REC092' → indexKey='REC092'
  // 测试3：recordId='REC093' → indexKey='REC093'
  const indexKey = input.recordId;
  // 手算：indexValue = patientName + '|' + archiveDate
  // 测试2：'张三' + '|' + '2026-09-15' = '张三|2026-09-15'
  // 测试3：'李四' + '|' + '2026-09-20' = '李四|2026-09-20'
  const indexValue = input.patientName + "|" + input.archiveDate;
  return { indexKey, indexValue };
}

/**
 * 构建索引报告。
 *
 * @param result 索引报告输入（entryCount）
 * @returns 索引报告（entryCount 透传）
 */
export function buildArchiveIndexReport(result: { entryCount: number }): ArchiveIndexReportV14 {
  // 手算：透传 entryCount
  // 测试4：{entryCount:50} → entryCount=50
  return { entryCount: result.entryCount };
}
