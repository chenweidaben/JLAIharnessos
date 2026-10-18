/**
 * 健澜科技 jlmedaios - 病历现病史结构化提取 V14 聚合器（M529-B）
 *
 * 纯函数：构建现病史提取基础数据 + 现病史结构化提取 + 构建提取报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 现病史提取基础数据 */
export interface HpiNlpV14 {
  recordId: string;
  dept: string;
}

/** 现病史提取输入 */
export interface HpiNlpInputV14 {
  rawText: string;
}

/** 现病史提取结果 */
export interface HpiNlpResultV14 {
  onset: string;
  course: string;
  treatment: string;
  hasInfo: boolean;
}

/** 现病史提取报告 */
export interface HpiNlpReportV14 {
  hasInfo: boolean;
  fieldCount: number;
}

/**
 * 构建现病史提取基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 现病史提取基础数据
 */
export function buildHpiNlp(recordId: string, dept: string): HpiNlpV14 {
  return { recordId, dept };
}

/**
 * 现病史结构化提取。
 * 按句号分割，第1段=onset 起病情况，第2段=course 病情演变，第3段=treatment 诊疗经过；
 * hasInfo = rawText.length > 0。
 *
 * @param input 提取输入（原始文本）
 * @returns 提取结果（onset + course + treatment + hasInfo）
 */
export function extractHpiStruct(input: HpiNlpInputV14): HpiNlpResultV14 {
  // 手算：按句号分割
  // 测试2：'3天前无明显诱因出现胸痛。伴胸闷气促。自行含服硝酸甘油缓解。'
  //        .split('。') = ['3天前无明显诱因出现胸痛', '伴胸闷气促', '自行含服硝酸甘油缓解', '']
  // 测试3：'胸痛1周'.split('。') = ['胸痛1周']
  const parts = input.rawText.split("。");
  // 手算：onset = 第1段（起病情况）
  // 测试2：onset='3天前无明显诱因出现胸痛'
  // 测试3：onset='胸痛1周'
  const onset = parts[0] ?? "";
  // 手算：course = 第2段（病情演变，空则''）
  // 测试2：course='伴胸闷气促'
  // 测试3：course=''（仅1段）
  const course = parts[1] ?? "";
  // 手算：treatment = 第3段（诊疗经过，空则''）
  // 测试2：treatment='自行含服硝酸甘油缓解'
  // 测试3：treatment=''（仅1段）
  const treatment = parts[2] ?? "";
  // 手算：hasInfo = rawText.length > 0
  // 测试2/3：hasInfo=true
  const hasInfo = input.rawText.length > 0;
  return { onset, course, treatment, hasInfo };
}

/**
 * 构建提取报告。
 *
 * @param result 提取结果
 * @returns 提取报告（hasInfo + fieldCount=4）
 */
export function buildHpiNlpReport(result: HpiNlpResultV14): HpiNlpReportV14 {
  // 手算：fieldCount = 4（onset + course + treatment + hasInfo）
  // 测试4：fieldCount=4
  return { hasInfo: result.hasInfo, fieldCount: 4 };
}
