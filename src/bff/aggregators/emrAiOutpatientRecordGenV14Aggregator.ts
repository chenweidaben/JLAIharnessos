/**
 * 健澜科技 jlmedaios - 病历AI门诊病历智能生成 V14 聚合器（M558-A）
 *
 * 纯函数：构建 AI 门诊病历智能生成基础数据 + AI 门诊病历智能生成 + 构建门诊病历智能生成报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 门诊病历智能生成基础数据 */
export interface AiOutpatientRecordGenV14 {
  recordId: string;
  dept: string;
}

/** AI 门诊病历智能生成输入 */
export interface AiOutpatientRecordGenInputV14 {
  patientName: string;
  symptom: string;
  diagnosis: string;
}

/** AI 门诊病历智能生成结果 */
export interface AiOutpatientRecordGenResultV14 {
  record: string;
  doctor: string;
}

/** 门诊病历智能生成报告 */
export interface AiOutpatientRecordGenReportV14 {
  record: string;
  doctor: string;
}

/**
 * 构建 AI 门诊病历智能生成基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 门诊病历智能生成基础数据
 */
export function buildAiOutpatientRecordGen(recordId: string, dept: string): AiOutpatientRecordGenV14 {
  return { recordId, dept };
}

/**
 * AI 门诊病历智能生成。
 * record = `患者${patientName}，主诉：${symptom}，诊断：${diagnosis}，建议门诊随访。`
 * doctor = 'AI门诊助手'
 *
 * @param input 门诊病历生成输入（患者姓名 + 主诉 + 诊断）
 * @returns 门诊病历生成结果（record + doctor）
 */
export function genOutpatientRecordByAi(input: AiOutpatientRecordGenInputV14): AiOutpatientRecordGenResultV14 {
  // 手算：record = `患者${patientName}，主诉：${symptom}，诊断：${diagnosis}，建议门诊随访。`
  // 测试2：patientName='王五', symptom='咳嗽3天', diagnosis='急性支气管炎'
  //   → record='患者王五，主诉：咳嗽3天，诊断：急性支气管炎，建议门诊随访。'
  // 测试3：patientName='赵六', symptom='头痛1周', diagnosis='紧张性头痛'
  //   → record='患者赵六，主诉：头痛1周，诊断：紧张性头痛，建议门诊随访。'
  const record = `患者${input.patientName}，主诉：${input.symptom}，诊断：${input.diagnosis}，建议门诊随访。`;
  // 手算：doctor = 'AI门诊助手'（固定值）
  // 测试2：doctor='AI门诊助手'
  // 测试3：doctor='AI门诊助手'
  const doctor = "AI门诊助手";
  return { record, doctor };
}

/**
 * 构建门诊病历智能生成报告。
 *
 * @param result 门诊病历生成结果
 * @returns 门诊病历生成报告（record + doctor 透传）
 */
export function buildAiOutpatientRecordGenReport(result: AiOutpatientRecordGenResultV14): AiOutpatientRecordGenReportV14 {
  // 手算：透传 record + doctor
  // 测试4：{record='测试病历', doctor='AI门诊助手'} → 透传
  return { record: result.record, doctor: result.doctor };
}
