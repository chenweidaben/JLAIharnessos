/**
 * 健澜科技 jlmedaios - 质控-会诊记录联动 V14 聚合器（M516-D，M516 收官）
 *
 * 纯函数：构建质控-会诊联动数据 + 检查会诊一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-会诊联动数据 */
export interface ConsultLinkV14 {
  recordId: string;
  consultDept: string;
  consultType: string;
}

/** 会诊一致性检查入参 */
export interface ConsultConsistencyRecordV14 {
  hasRequest: boolean;
  hasOpinion: boolean;
  hasReply: boolean;
}

/** 会诊一致性检查结果 */
export interface ConsultConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 会诊联动报告 */
export interface ConsultLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-会诊联动数据。
 *
 * @param recordId 病历记录ID
 * @param consultDept 会诊科室
 * @param consultType 会诊类型
 * @returns 联动数据
 */
export function buildConsultLink(recordId: string, consultDept: string, consultType: string): ConsultLinkV14 {
  return { recordId, consultDept, consultType };
}

/**
 * 检查会诊一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 会诊一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkConsultConsistency(record: ConsultConsistencyRecordV14): ConsultConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasRequest) {
    defects.push("缺会诊申请记录");
  }
  if (!record.hasOpinion) {
    defects.push("缺会诊意见记录");
  }
  if (!record.hasReply) {
    defects.push("缺会诊回复");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建会诊联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildConsultLinkReport(result: ConsultConsistencyResultV14): ConsultLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
