/**
 * 健澜科技 jlmedaios - 质控-患者投诉联动 V14 聚合器（M515-C）
 *
 * 纯函数：构建质控-投诉联动数据 + 检查投诉一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-投诉联动数据 */
export interface ComplaintLinkV14 {
  recordId: string;
  complaintType: string;
  status: string;
}

/** 投诉一致性检查入参 */
export interface ComplaintConsistencyRecordV14 {
  hasComplaintRecord: boolean;
  hasInvestigation: boolean;
  hasFeedback: boolean;
}

/** 投诉一致性检查结果 */
export interface ComplaintConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 投诉联动报告 */
export interface ComplaintLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-投诉联动数据。
 *
 * @param recordId 病历记录ID
 * @param complaintType 投诉类型
 * @param status 处理状态
 * @returns 联动数据
 */
export function buildComplaintLink(recordId: string, complaintType: string, status: string): ComplaintLinkV14 {
  return { recordId, complaintType, status };
}

/**
 * 检查投诉一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 投诉一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkComplaintConsistency(record: ComplaintConsistencyRecordV14): ComplaintConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasComplaintRecord) {
    defects.push("缺投诉记录");
  }
  if (!record.hasInvestigation) {
    defects.push("缺投诉调查记录");
  }
  if (!record.hasFeedback) {
    defects.push("缺患者反馈记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建投诉联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildComplaintLinkReport(result: ComplaintConsistencyResultV14): ComplaintLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
