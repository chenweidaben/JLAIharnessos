/**
 * 健澜科技 jlmedaios - 病历AI急诊留观病历生成 V14 聚合器（M560-C）
 *
 * 纯函数：构建 AI 急诊留观病历生成基础数据 + AI 急诊留观病历生成 + 构建急诊留观病历生成报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 急诊留观病历生成基础数据 */
export interface AiEmergencyObsNoteGenV14 {
  recordId: string;
  dept: string;
}

/** AI 急诊留观病历生成输入 */
export interface AiEmergencyObsNoteGenInputV14 {
  patientName: string;
  observationHours: number;
  condition: string;
}

/** AI 急诊留观病历生成结果 */
export interface AiEmergencyObsNoteGenResultV14 {
  note: string;
  doctor: string;
}

/** 急诊留观病历生成报告 */
export interface AiEmergencyObsNoteGenReportV14 {
  note: string;
  doctor: string;
}

/**
 * 构建 AI 急诊留观病历生成基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 急诊留观病历生成基础数据
 */
export function buildAiEmergencyObsNoteGen(recordId: string, dept: string): AiEmergencyObsNoteGenV14 {
  return { recordId, dept };
}

/**
 * AI 急诊留观病历生成。
 * note = `${patientName}留观${observationHours}小时，当前病情：${condition}，继续观察。`
 * doctor = 'AI急诊助手'
 *
 * @param input 留观病历生成输入（患者姓名 + 留观小时数 + 病情）
 * @returns 留观病历生成结果（note + doctor）
 */
export function genEmergencyObsNoteByAi(input: AiEmergencyObsNoteGenInputV14): AiEmergencyObsNoteGenResultV14 {
  // 手算：note = `${patientName}留观${observationHours}小时，当前病情：${condition}，继续观察。`
  // 测试2：patientName='王五', observationHours=6, condition='生命体征平稳'
  //   = '王五留观6小时，当前病情：生命体征平稳，继续观察。'
  // 测试3：patientName='赵六', observationHours=12, condition='仍有胸痛'
  //   = '赵六留观12小时，当前病情：仍有胸痛，继续观察。'
  const note = `${input.patientName}留观${input.observationHours}小时，当前病情：${input.condition}，继续观察。`;
  // 手算：doctor = 'AI急诊助手'（固定）
  const doctor = "AI急诊助手";
  return { note, doctor };
}

/**
 * 构建急诊留观病历生成报告。
 *
 * @param result 留观病历生成结果
 * @returns 留观病历生成报告（note + doctor 透传）
 */
export function buildAiEmergencyObsNoteGenReport(result: AiEmergencyObsNoteGenResultV14): AiEmergencyObsNoteGenReportV14 {
  // 手算：透传 note + doctor
  // 测试4：{note='测试记录', doctor='AI急诊助手'} → 透传
  return { note: result.note, doctor: result.doctor };
}
