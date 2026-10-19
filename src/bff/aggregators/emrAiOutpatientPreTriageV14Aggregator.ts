/**
 * 健澜科技 jlmedaios - 病历AI门诊预检分诊 V14 聚合器（M560-B）
 *
 * 纯函数：构建 AI 门诊预检分诊基础数据 + AI 门诊预检分诊 + 构建门诊预检分诊报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 门诊预检分诊基础数据 */
export interface AiOutpatientPreTriageV14 {
  recordId: string;
  dept: string;
}

/** AI 门诊预检分诊输入 */
export interface AiOutpatientPreTriageInputV14 {
  symptom: string;
  fever: boolean;
}

/** AI 门诊预检分诊结果 */
export interface AiOutpatientPreTriageResultV14 {
  department: string;
  priority: string;
}

/** 门诊预检分诊报告 */
export interface AiOutpatientPreTriageReportV14 {
  department: string;
  priority: string;
}

/**
 * 构建 AI 门诊预检分诊基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 门诊预检分诊基础数据
 */
export function buildAiOutpatientPreTriage(recordId: string, dept: string): AiOutpatientPreTriageV14 {
  return { recordId, dept };
}

/**
 * AI 门诊预检分诊。
 * department = symptom.includes('咳嗽') ? '呼吸内科'
 *   : symptom.includes('腹痛') ? '消化内科' : '全科门诊'
 * priority = fever ? '优先就诊' : '普通就诊'
 *
 * @param input 门诊预检分诊输入（症状 + 发热）
 * @returns 门诊预检分诊结果（department + priority）
 */
export function preTriageOutpatientByAi(input: AiOutpatientPreTriageInputV14): AiOutpatientPreTriageResultV14 {
  // 手算：department = symptom.includes('咳嗽') ? '呼吸内科'
  //   : symptom.includes('腹痛') ? '消化内科' : '全科门诊'
  // 测试2：symptom='咳嗽伴咳痰' → includes('咳嗽')=true → '呼吸内科'
  // 测试3：symptom='轻微头痛' → includes('咳嗽')=false, includes('腹痛')=false → '全科门诊'
  const department = input.symptom.includes("咳嗽")
    ? "呼吸内科"
    : input.symptom.includes("腹痛")
      ? "消化内科"
      : "全科门诊";
  // 手算：priority = fever ? '优先就诊' : '普通就诊'
  // 测试2：fever=true → '优先就诊'
  // 测试3：fever=false → '普通就诊'
  const priority = input.fever ? "优先就诊" : "普通就诊";
  return { department, priority };
}

/**
 * 构建门诊预检分诊报告。
 *
 * @param result 门诊预检分诊结果
 * @returns 门诊预检分诊报告（department + priority 透传）
 */
export function buildAiOutpatientPreTriageReport(result: AiOutpatientPreTriageResultV14): AiOutpatientPreTriageReportV14 {
  // 手算：透传 department + priority
  // 测试4：{department='呼吸内科', priority='优先就诊'} → 透传
  return { department: result.department, priority: result.priority };
}
