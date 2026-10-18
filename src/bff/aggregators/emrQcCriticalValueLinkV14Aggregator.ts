/**
 * 健澜科技 jlmedaios - 质控-危急值联动 V14 聚合器（M515-A）
 *
 * 纯函数：构建质控-危急值联动数据 + 检查危急值一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-危急值联动数据 */
export interface CriticalValueLinkV14 {
  recordId: string;
  criticalValue: string;
  notified: boolean;
}

/** 危急值一致性检查入参 */
export interface CriticalValueConsistencyRecordV14 {
  hasReport: boolean;
  hasNotification: boolean;
  hasDocResponse: boolean;
}

/** 危急值一致性检查结果 */
export interface CriticalValueConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 危急值联动报告 */
export interface CriticalValueLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-危急值联动数据。
 *
 * @param recordId 病历记录ID
 * @param criticalValue 危急值
 * @param notified 是否已通知
 * @returns 联动数据
 */
export function buildCriticalValueLink(recordId: string, criticalValue: string, notified: boolean): CriticalValueLinkV14 {
  return { recordId, criticalValue, notified };
}

/**
 * 检查危急值一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 危急值一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkCriticalValueConsistency(record: CriticalValueConsistencyRecordV14): CriticalValueConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasReport) {
    defects.push("缺危急值报告");
  }
  if (!record.hasNotification) {
    defects.push("缺危急值通知记录");
  }
  if (!record.hasDocResponse) {
    defects.push("缺医生响应记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建危急值联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildCriticalValueLinkReport(result: CriticalValueConsistencyResultV14): CriticalValueLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
