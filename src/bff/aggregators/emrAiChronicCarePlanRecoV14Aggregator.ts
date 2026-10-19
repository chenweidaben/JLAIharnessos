/**
 * 健澜科技 jlmedaios - 病历AI慢病管理计划推荐 V14 聚合器（M563-D）
 *
 * 纯函数：构建 AI 慢病管理计划推荐基础数据 + AI 慢病管理计划推荐 + 构建慢病管理计划推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 慢病管理计划推荐基础数据 */
export interface AiChronicCarePlanRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 慢病管理计划推荐输入 */
export interface AiChronicCarePlanRecoInputV14 {
  disease: string;
  controlStatus: string;
}

/** AI 慢病管理计划推荐结果 */
export interface AiChronicCarePlanRecoResultV14 {
  planName: string;
  monitorFrequency: string;
}

/** 慢病管理计划推荐报告 */
export interface AiChronicCarePlanRecoReportV14 {
  planName: string;
  monitorFrequency: string;
}

/**
 * 构建 AI 慢病管理计划推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 慢病管理计划推荐基础数据
 */
export function buildAiChronicCarePlanReco(recordId: string, dept: string): AiChronicCarePlanRecoV14 {
  return { recordId, dept };
}

/**
 * AI 慢病管理计划推荐。
 * planName = disease.includes('高血压') ? '高血压慢病管理计划'
 *   : disease.includes('糖尿病') ? '糖尿病慢病管理计划' : '综合慢病管理计划'
 * monitorFrequency = controlStatus === '控制不佳' ? '每周监测'
 *   : controlStatus === '控制一般' ? '每两周监测' : '每月监测'
 *
 * @param input 慢病管理计划推荐输入（慢病类型 + 控制状态）
 * @returns 慢病管理计划推荐结果（planName + monitorFrequency）
 */
export function recommendChronicCarePlanByAi(input: AiChronicCarePlanRecoInputV14): AiChronicCarePlanRecoResultV14 {
  // 手算：planName = disease.includes('高血压') ? '高血压慢病管理计划'
  //   : disease.includes('糖尿病') ? '糖尿病慢病管理计划' : '综合慢病管理计划'
  // 测试2：disease='原发性高血压' → includes('高血压')=true → '高血压慢病管理计划'
  // 测试3：disease='2型糖尿病' → includes('高血压')=false, includes('糖尿病')=true → '糖尿病慢病管理计划'
  const planName = input.disease.includes("高血压")
    ? "高血压慢病管理计划"
    : input.disease.includes("糖尿病")
      ? "糖尿病慢病管理计划"
      : "综合慢病管理计划";
  // 手算：monitorFrequency = controlStatus === '控制不佳' ? '每周监测'
  //   : controlStatus === '控制一般' ? '每两周监测' : '每月监测'
  // 测试2：controlStatus='控制不佳' → '每周监测'
  // 测试3：controlStatus='控制良好' → '每月监测'
  const monitorFrequency = input.controlStatus === "控制不佳" ? "每周监测"
    : input.controlStatus === "控制一般" ? "每两周监测" : "每月监测";
  return { planName, monitorFrequency };
}

/**
 * 构建慢病管理计划推荐报告。
 *
 * @param result 慢病管理计划推荐结果
 * @returns 慢病管理计划推荐报告（planName + monitorFrequency 透传）
 */
export function buildAiChronicCarePlanRecoReport(result: AiChronicCarePlanRecoResultV14): AiChronicCarePlanRecoReportV14 {
  // 手算：透传 planName + monitorFrequency
  // 测试4：{planName='高血压慢病管理计划', monitorFrequency='每周监测'} → 透传
  return { planName: result.planName, monitorFrequency: result.monitorFrequency };
}
