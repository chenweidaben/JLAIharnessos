/**
 * 健澜科技 jlmedaios - 病历AI护理记录生成 V14 聚合器（M557-A）
 *
 * 纯函数：构建 AI 护理记录生成基础数据 + AI 护理记录生成 + 构建护理记录生成报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 护理记录生成基础数据 */
export interface AiNursingNoteGenV14 {
  recordId: string;
  dept: string;
}

/** AI 护理记录生成输入 */
export interface AiNursingNoteGenInputV14 {
  patientName: string;
  ward: string;
  vitalSigns: string;
}

/** AI 护理记录生成结果 */
export interface AiNursingNoteGenResultV14 {
  note: string;
  recorder: string;
}

/** 护理记录生成报告 */
export interface AiNursingNoteGenReportV14 {
  note: string;
  recorder: string;
}

/**
 * 构建 AI 护理记录生成基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 护理记录生成基础数据
 */
export function buildAiNursingNoteGen(recordId: string, dept: string): AiNursingNoteGenV14 {
  return { recordId, dept };
}

/**
 * AI 护理记录生成。
 * note = `${patientName}在${ward}病区，生命体征：${vitalSigns}，病情平稳。`
 * recorder = 'AI护理助手'
 *
 * @param input 护理记录生成输入（患者姓名 + 病区 + 生命体征）
 * @returns 护理记录生成结果（note + recorder）
 */
export function genNursingNoteByAi(input: AiNursingNoteGenInputV14): AiNursingNoteGenResultV14 {
  // 手算：note = `${patientName}在${ward}病区，生命体征：${vitalSigns}，病情平稳。`
  // 测试2：patientName='张三', ward='心内科', vitalSigns='T36.5℃ P78次/分 R18次/分 BP120/80mmHg'
  //   → note='张三在心内科病区，生命体征：T36.5℃ P78次/分 R18次/分 BP120/80mmHg，病情平稳。'
  // 测试3：patientName='李四', ward='外科', vitalSigns='T37.0℃ P80次/分'
  //   → note='李四在外科病区，生命体征：T37.0℃ P80次/分，病情平稳。'
  const note = `${input.patientName}在${input.ward}病区，生命体征：${input.vitalSigns}，病情平稳。`;
  // 手算：recorder = 'AI护理助手'（固定值）
  // 测试2：recorder='AI护理助手'
  // 测试3：recorder='AI护理助手'
  const recorder = "AI护理助手";
  return { note, recorder };
}

/**
 * 构建护理记录生成报告。
 *
 * @param result 护理记录生成结果
 * @returns 护理记录生成报告（note + recorder 透传）
 */
export function buildAiNursingNoteGenReport(result: AiNursingNoteGenResultV14): AiNursingNoteGenReportV14 {
  // 手算：透传 note + recorder
  // 测试4：{note='测试记录', recorder='AI护理助手'} → 透传
  return { note: result.note, recorder: result.recorder };
}
