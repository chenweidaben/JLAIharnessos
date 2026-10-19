/**
 * 健澜科技 jlmedaios - 病历AI诊疗方案推荐 V14 聚合器（M554-C）
 *
 * 纯函数：构建 AI 诊疗方案推荐基础数据 + AI 诊疗方案推荐 + 构建诊疗方案推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 诊疗方案推荐基础数据 */
export interface AiTreatmentPlanRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 诊疗方案推荐输入 */
export interface AiTreatmentPlanRecoInputV14 {
  diagnosis: string;
  severity: string;
}

/** AI 诊疗方案推荐结果 */
export interface AiTreatmentPlanRecoResultV14 {
  planName: string;
  expectedDays: number;
}

/** 诊疗方案推荐报告 */
export interface AiTreatmentPlanRecoReportV14 {
  planName: string;
  expectedDays: number;
}

/**
 * 构建 AI 诊疗方案推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 诊疗方案推荐基础数据
 */
export function buildAiTreatmentPlanReco(recordId: string, dept: string): AiTreatmentPlanRecoV14 {
  return { recordId, dept };
}

/**
 * AI 诊疗方案推荐。
 * planName = diagnosis.includes('心梗')
 *   ? (severity === '危重' ? '介入治疗方案' : '药物保守方案')
 *   : diagnosis.includes('肺炎')
 *     ? (severity === '危重' ? '静脉抗生素方案' : '口服抗生素方案')
 *     : '对症治疗方案'
 * expectedDays = planName.includes('介入') ? 10 : planName.includes('静脉') ? 7 : planName.includes('口服') ? 5 : 3
 *
 * @param input 诊疗方案推荐输入（诊断 + 病情严重度）
 * @returns 诊疗方案推荐结果（planName + expectedDays）
 */
export function recommendTreatmentPlanByAi(input: AiTreatmentPlanRecoInputV14): AiTreatmentPlanRecoResultV14 {
  // 手算：planName = diagnosis.includes('心梗')
  //   ? (severity === '危重' ? '介入治疗方案' : '药物保守方案')
  //   : diagnosis.includes('肺炎')
  //     ? (severity === '危重' ? '静脉抗生素方案' : '口服抗生素方案')
  //     : '对症治疗方案'
  // 测试2：diagnosis='急性心梗', severity='危重' → includes('心梗')=true, severity='危重' → planName='介入治疗方案'
  // 测试3：diagnosis='肺炎', severity='普通' → includes('肺炎')=true, severity!=='危重' → planName='口服抗生素方案'
  const planName = input.diagnosis.includes("心梗")
    ? input.severity === "危重"
      ? "介入治疗方案"
      : "药物保守方案"
    : input.diagnosis.includes("肺炎")
      ? input.severity === "危重"
        ? "静脉抗生素方案"
        : "口服抗生素方案"
      : "对症治疗方案";
  // 手算：expectedDays = planName.includes('介入') ? 10 : planName.includes('静脉') ? 7 : planName.includes('口服') ? 5 : 3
  // 测试2：planName='介入治疗方案' → includes('介入')=true → expectedDays=10
  // 测试3：planName='口服抗生素方案' → includes('口服')=true → expectedDays=5
  const expectedDays = planName.includes("介入") ? 10 : planName.includes("静脉") ? 7 : planName.includes("口服") ? 5 : 3;
  return { planName, expectedDays };
}

/**
 * 构建诊疗方案推荐报告。
 *
 * @param result 诊疗方案推荐结果
 * @returns 诊疗方案推荐报告（planName + expectedDays 透传）
 */
export function buildAiTreatmentPlanRecoReport(result: AiTreatmentPlanRecoResultV14): AiTreatmentPlanRecoReportV14 {
  // 手算：透传 planName + expectedDays
  // 测试4：{planName='介入治疗方案', expectedDays=10} → 透传
  return { planName: result.planName, expectedDays: result.expectedDays };
}
