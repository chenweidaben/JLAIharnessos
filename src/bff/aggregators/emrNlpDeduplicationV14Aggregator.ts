/**
 * 健澜科技 jlmedaios - NLP 病历去重 V14 聚合器（M491-C）
 *
 * 纯函数：病历记录去重 + 去重报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病历记录 */
export interface MedicalRecordV14 {
  id: string;
  content: string;
}

/** 去重结果 */
export interface NlpDedupResultV14 {
  uniqueRecords: MedicalRecordV14[];
}

/** 去重报告 */
export interface NlpDedupReportV14 {
  totalCount: number;
  uniqueCount: number;
  duplicateCount: number;
}

/**
 * 去重病历记录（按内容相同判定，保留首次出现）。
 *
 * @param records 病历记录列表
 * @returns 去重结果
 */
export function deduplicateMedicalRecords(records: MedicalRecordV14[]): NlpDedupResultV14 {
  // 手算：按 content 去重，保留首次出现的记录
  const seen = new Set<string>();
  const uniqueRecords: MedicalRecordV14[] = [];
  for (const record of records) {
    if (!seen.has(record.content)) {
      seen.add(record.content);
      uniqueRecords.push(record);
    }
  }
  return { uniqueRecords };
}

/**
 * 构建去重报告（totalCount+uniqueCount+duplicateCount）。
 *
 * @param result 去重结果
 * @param totalCount 原始总数
 * @returns 去重报告
 */
export function buildDedupReport(result: NlpDedupResultV14, totalCount: number): NlpDedupReportV14 {
  const uniqueCount = result.uniqueRecords.length;
  // 手算：duplicateCount = totalCount - uniqueCount
  const duplicateCount = totalCount - uniqueCount;
  return { totalCount, uniqueCount, duplicateCount };
}
