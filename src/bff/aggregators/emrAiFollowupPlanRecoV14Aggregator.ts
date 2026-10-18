/**
 * 健澜科技 jlmedaios - 病历AI随访计划推荐 V14 聚合器（M546-D，M546 收官）
 *
 * 纯函数：构建 AI 随访计划推荐基础数据 + AI 随访计划推荐 + 构建随访报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 随访计划推荐基础数据 */
export interface AiFollowupPlanRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 随访计划推荐输入 */
export interface AiFollowupPlanRecoInputV14 {
  diagnosis: string;
  daysAfterDischarge: number;
}

/** AI 随访计划推荐结果 */
export interface AiFollowupPlanRecoResultV14 {
  frequency: string;
  nextVisit: number;
}

/** 随访报告 */
export interface AiFollowupPlanRecoReportV14 {
  frequency: string;
  nextVisit: number;
}

/**
 * 构建 AI 随访计划推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 随访计划推荐基础数据
 */
export function buildAiFollowupPlanReco(recordId: string, dept: string): AiFollowupPlanRecoV14 {
  return { recordId, dept };
}

/**
 * AI 随访计划推荐。
 * frequency = diagnosis.includes('心梗') ? '每周1次' : '每月1次'
 * nextVisit = Math.ceil(daysAfterDischarge * 1.5)
 *
 * @param input 随访推荐输入（诊断 + 出院后天数）
 * @returns 随访推荐结果（frequency + nextVisit）
 */
export function recommendFollowupPlanByAi(input: AiFollowupPlanRecoInputV14): AiFollowupPlanRecoResultV14 {
  // 手算：frequency = diagnosis.includes('心梗') ? '每周1次' : '每月1次'
  // 测试2：diagnosis='急性心梗' → 含'心梗' → frequency='每周1次'
  // 测试3：diagnosis='上感' → 不含'心梗' → frequency='每月1次'
  const frequency = input.diagnosis.includes("心梗") ? "每周1次" : "每月1次";
  // 手算：nextVisit = Math.ceil(daysAfterDischarge * 1.5)
  // 测试2：daysAfterDischarge=7 → 7*1.5=10.5 → Math.ceil(10.5)=11
  // 测试3：daysAfterDischarge=5 → 5*1.5=7.5 → Math.ceil(7.5)=8
  const nextVisit = Math.ceil(input.daysAfterDischarge * 1.5);
  return { frequency, nextVisit };
}

/**
 * 构建随访报告。
 *
 * @param result 随访推荐结果
 * @returns 随访报告（frequency + nextVisit 透传）
 */
export function buildAiFollowupPlanRecoReport(result: AiFollowupPlanRecoResultV14): AiFollowupPlanRecoReportV14 {
  // 手算：透传 frequency + nextVisit
  // 测试4：{frequency='每周1次', nextVisit=11} → 透传
  return { frequency: result.frequency, nextVisit: result.nextVisit };
}
