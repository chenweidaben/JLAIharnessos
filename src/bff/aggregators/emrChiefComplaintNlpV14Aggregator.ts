/**
 * 健澜科技 jlmedaios - 病历主诉结构化提取 V14 聚合器（M529-A）
 *
 * 纯函数：构建主诉提取基础数据 + 主诉结构化提取 + 构建提取报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 主诉提取基础数据 */
export interface ChiefComplaintNlpV14 {
  recordId: string;
  dept: string;
}

/** 主诉提取输入 */
export interface ChiefComplaintNlpInputV14 {
  rawText: string;
}

/** 主诉提取结果 */
export interface ChiefComplaintNlpResultV14 {
  symptom: string;
  duration: string;
  hasSymptom: boolean;
}

/** 主诉提取报告 */
export interface ChiefComplaintNlpReportV14 {
  hasSymptom: boolean;
  fieldCount: number;
}

/**
 * 构建主诉提取基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 主诉提取基础数据
 */
export function buildChiefComplaintNlp(recordId: string, dept: string): ChiefComplaintNlpV14 {
  return { recordId, dept };
}

/**
 * 主诉结构化提取。
 * 按空格分割，第1段=symptom，第2段=duration（空则''）；hasSymptom=symptom!==''。
 *
 * @param input 提取输入（原始文本）
 * @returns 提取结果（symptom + duration + hasSymptom）
 */
export function extractChiefComplaintStruct(input: ChiefComplaintNlpInputV14): ChiefComplaintNlpResultV14 {
  // 手算：按空格分割
  // 测试2：'胸痛 3天'.split(' ') = ['胸痛', '3天']
  // 测试3：'头晕'.split(' ') = ['头晕']
  const parts = input.rawText.split(" ");
  // 手算：symptom = 第1段
  // 测试2：symptom='胸痛'
  // 测试3：symptom='头晕'
  const symptom = parts[0] ?? "";
  // 手算：duration = 第2段（空则''）
  // 测试2：duration='3天'
  // 测试3：duration=''（仅1段）
  const duration = parts[1] ?? "";
  // 手算：hasSymptom = symptom !== ''
  // 测试2/3：hasSymptom=true
  const hasSymptom = symptom !== "";
  return { symptom, duration, hasSymptom };
}

/**
 * 构建提取报告。
 *
 * @param result 提取结果
 * @returns 提取报告（hasSymptom + fieldCount=3）
 */
export function buildChiefComplaintNlpReport(result: ChiefComplaintNlpResultV14): ChiefComplaintNlpReportV14 {
  // 手算：fieldCount = 3（symptom + duration + hasSymptom）
  // 测试4：fieldCount=3
  return { hasSymptom: result.hasSymptom, fieldCount: 3 };
}
