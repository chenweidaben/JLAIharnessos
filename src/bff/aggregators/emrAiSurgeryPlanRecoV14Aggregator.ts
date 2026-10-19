/**
 * 健澜科技 jlmedaios - 病历AI手术方案推荐 V14 聚合器（M562-B）
 *
 * 纯函数：构建 AI 手术方案推荐基础数据 + AI 手术方案推荐 + 构建手术方案推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 手术方案推荐基础数据 */
export interface AiSurgeryPlanRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 手术方案推荐输入 */
export interface AiSurgeryPlanRecoInputV14 {
  diagnosis: string;
  severity: string;
}

/** AI 手术方案推荐结果 */
export interface AiSurgeryPlanRecoResultV14 {
  planName: string;
  anesthesiaType: string;
}

/** 手术方案推荐报告 */
export interface AiSurgeryPlanRecoReportV14 {
  planName: string;
  anesthesiaType: string;
}

/**
 * 构建 AI 手术方案推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 手术方案推荐基础数据
 */
export function buildAiSurgeryPlanReco(recordId: string, dept: string): AiSurgeryPlanRecoV14 {
  return { recordId, dept };
}

/**
 * AI 手术方案推荐。
 * planName = diagnosis.includes('阑尾炎') ? '腹腔镜阑尾切除术'
 *   : diagnosis.includes('胆囊炎') ? '腹腔镜胆囊切除术' : '开腹探查术'
 * anesthesiaType = severity === '危重' ? '全身麻醉' : '硬膜外麻醉'
 *
 * @param input 手术方案推荐输入（诊断 + 病情严重度）
 * @returns 手术方案推荐结果（planName + anesthesiaType）
 */
export function recommendSurgeryPlanByAi(input: AiSurgeryPlanRecoInputV14): AiSurgeryPlanRecoResultV14 {
  // 手算：planName = diagnosis.includes('阑尾炎') ? '腹腔镜阑尾切除术'
  //   : diagnosis.includes('胆囊炎') ? '腹腔镜胆囊切除术' : '开腹探查术'
  // 测试2：diagnosis='急性阑尾炎' → includes('阑尾炎')=true → '腹腔镜阑尾切除术'
  // 测试3：diagnosis='腹股沟疝' → includes('阑尾炎')=false, includes('胆囊炎')=false → '开腹探查术'
  const planName = input.diagnosis.includes("阑尾炎")
    ? "腹腔镜阑尾切除术"
    : input.diagnosis.includes("胆囊炎")
      ? "腹腔镜胆囊切除术"
      : "开腹探查术";
  // 手算：anesthesiaType = severity === '危重' ? '全身麻醉' : '硬膜外麻醉'
  // 测试2：severity='危重' → '全身麻醉'
  // 测试3：severity='普通' → '硬膜外麻醉'
  const anesthesiaType = input.severity === "危重" ? "全身麻醉" : "硬膜外麻醉";
  return { planName, anesthesiaType };
}

/**
 * 构建手术方案推荐报告。
 *
 * @param result 手术方案推荐结果
 * @returns 手术方案推荐报告（planName + anesthesiaType 透传）
 */
export function buildAiSurgeryPlanRecoReport(result: AiSurgeryPlanRecoResultV14): AiSurgeryPlanRecoReportV14 {
  // 手算：透传 planName + anesthesiaType
  // 测试4：{planName='腹腔镜阑尾切除术', anesthesiaType='全身麻醉'} → 透传
  return { planName: result.planName, anesthesiaType: result.anesthesiaType };
}
