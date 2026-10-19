/**
 * 健澜科技 jlmedaios - 病历AI病案缺陷预警 V14 聚合器（M556-C）
 *
 * 纯函数：构建 AI 病案缺陷预警基础数据 + AI 病案缺陷预警 + 构建病案缺陷预警报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 病案缺陷预警基础数据 */
export interface AiRecordDefectAlertV14 {
  recordId: string;
  dept: string;
}

/** AI 病案缺陷预警输入（hasMissingXxx=true 表示该项缺失，与传统命名相反，按规格实现） */
export interface AiRecordDefectAlertInputV14 {
  hasMissingDiagnosis: boolean;
  hasMissingSurgeon: boolean;
  hasMissingOpDate: boolean;
  hasMissingDischargeReason: boolean;
}

/** AI 病案缺陷预警结果 */
export interface AiRecordDefectAlertResultV14 {
  alertLevel: string;
  defectCount: number;
}

/** 病案缺陷预警报告 */
export interface AiRecordDefectAlertReportV14 {
  alertLevel: string;
  defectCount: number;
}

/**
 * 构建 AI 病案缺陷预警基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 病案缺陷预警基础数据
 */
export function buildAiRecordDefectAlert(recordId: string, dept: string): AiRecordDefectAlertV14 {
  return { recordId, dept };
}

/**
 * AI 病案缺陷预警。
 * defectCount = (!hasMissingDiagnosis ? 0 : 1) + (!hasMissingSurgeon ? 0 : 1)
 *   + (!hasMissingOpDate ? 0 : 1) + (!hasMissingDischargeReason ? 0 : 1)
 * alertLevel = defectCount >= 3 ? '红色预警' : defectCount >= 1 ? '黄色预警' : '正常'
 *
 * @param input 缺陷预警输入（4 项缺失标记，true 表示该项缺失）
 * @returns 缺陷预警结果（alertLevel + defectCount）
 */
export function alertRecordDefectByAi(input: AiRecordDefectAlertInputV14): AiRecordDefectAlertResultV14 {
  // 手算：defectCount = (!hasMissingDiagnosis ? 0 : 1) + (!hasMissingSurgeon ? 0 : 1)
  //   + (!hasMissingOpDate ? 0 : 1) + (!hasMissingDischargeReason ? 0 : 1)
  // 测试2：4 项全 false（全不缺）→ defectCount = 0+0+0+0 = 0
  // 测试3：hasMissingDiagnosis=true, hasMissingSurgeon=true, hasMissingOpDate=true, hasMissingDischargeReason=false
  //   → defectCount = 1+1+1+0 = 3（缺诊断+术者+手术日期）
  const defectCount = (!input.hasMissingDiagnosis ? 0 : 1)
    + (!input.hasMissingSurgeon ? 0 : 1)
    + (!input.hasMissingOpDate ? 0 : 1)
    + (!input.hasMissingDischargeReason ? 0 : 1);
  // 手算：alertLevel = defectCount >= 3 ? '红色预警' : defectCount >= 1 ? '黄色预警' : '正常'
  // 测试2：defectCount=0 → alertLevel='正常'
  // 测试3：defectCount=3 >= 3 → alertLevel='红色预警'
  const alertLevel = defectCount >= 3 ? "红色预警" : defectCount >= 1 ? "黄色预警" : "正常";
  return { alertLevel, defectCount };
}

/**
 * 构建病案缺陷预警报告。
 *
 * @param result 缺陷预警结果
 * @returns 缺陷预警报告（alertLevel + defectCount 透传）
 */
export function buildAiRecordDefectAlertReport(result: AiRecordDefectAlertResultV14): AiRecordDefectAlertReportV14 {
  // 手算：透传 alertLevel + defectCount
  // 测试4：{alertLevel='正常', defectCount=0} → 透传
  return { alertLevel: result.alertLevel, defectCount: result.defectCount };
}
