/**
 * 健澜科技 jlmedaios - 病历AI出院小结自动生成 V14 聚合器（M555-D，M555 收官）
 *
 * 纯函数：构建 AI 出院小结自动生成基础数据 + AI 出院小结自动生成 + 构建出院小结生成报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 出院小结自动生成基础数据 */
export interface AiDischargeSummaryGenV14 {
  recordId: string;
  dept: string;
}

/** AI 出院小结自动生成输入 */
export interface AiDischargeSummaryGenInputV14 {
  diagnosis: string;
  opName: string;
  dischargeDay: number;
}

/** AI 出院小结自动生成结果 */
export interface AiDischargeSummaryGenResultV14 {
  summary: string;
  advice: string;
}

/** 出院小结生成报告 */
export interface AiDischargeSummaryGenReportV14 {
  summary: string;
  advice: string;
}

/**
 * 构建 AI 出院小结自动生成基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 出院小结自动生成基础数据
 */
export function buildAiDischargeSummaryGen(recordId: string, dept: string): AiDischargeSummaryGenV14 {
  return { recordId, dept };
}

/**
 * AI 出院小结自动生成。
 * summary = `患者因${diagnosis}于住院期间行${opName}，术后恢复顺利，住院${dischargeDay}天出院。`
 * advice = opName !== '保守治疗' ? '注意伤口护理，定期复查' : '按时服药，定期复查'
 *
 * @param input 出院小结生成输入（诊断 + 手术名称 + 住院天数）
 * @returns 出院小结生成结果（summary + advice）
 */
export function genDischargeSummaryByAi(input: AiDischargeSummaryGenInputV14): AiDischargeSummaryGenResultV14 {
  // 手算：summary = `患者因${diagnosis}于住院期间行${opName}，术后恢复顺利，住院${dischargeDay}天出院。`
  // 测试2：diagnosis='急性阑尾炎', opName='阑尾切除术', dischargeDay=7
  //   → summary='患者因急性阑尾炎于住院期间行阑尾切除术，术后恢复顺利，住院7天出院。'
  // 测试3：diagnosis='急性胃炎', opName='保守治疗', dischargeDay=5
  //   → summary='患者因急性胃炎于住院期间行保守治疗，术后恢复顺利，住院5天出院。'
  const summary = `患者因${input.diagnosis}于住院期间行${input.opName}，术后恢复顺利，住院${input.dischargeDay}天出院。`;
  // 手算：advice = opName !== '保守治疗' ? '注意伤口护理，定期复查' : '按时服药，定期复查'
  // 测试2：opName='阑尾切除术' ≠ '保守治疗' → advice='注意伤口护理，定期复查'
  // 测试3：opName='保守治疗' → advice='按时服药，定期复查'
  const advice = input.opName !== "保守治疗" ? "注意伤口护理，定期复查" : "按时服药，定期复查";
  return { summary, advice };
}

/**
 * 构建出院小结生成报告。
 *
 * @param result 出院小结生成结果
 * @returns 出院小结生成报告（summary + advice 透传）
 */
export function buildAiDischargeSummaryGenReport(result: AiDischargeSummaryGenResultV14): AiDischargeSummaryGenReportV14 {
  // 手算：透传 summary + advice
  // 测试4：{summary='...', advice='...'} → 透传
  return { summary: result.summary, advice: result.advice };
}
