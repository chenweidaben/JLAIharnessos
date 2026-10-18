/**
 * 健澜科技 jlmedaios - 病案首页逻辑校验 V14 聚合器（M535-B）
 *
 * 纯函数：构建首页逻辑校验基础数据 + 首页逻辑校验 + 构建逻辑校验报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 首页逻辑校验基础数据 */
export interface HomepageLogicV14 {
  recordId: string;
  dept: string;
}

/** 首页逻辑校验输入 */
export interface HomepageLogicInputV14 {
  admissionDays: number;
  age: number;
  hasSurgery: boolean;
}

/** 首页逻辑校验结果 */
export interface HomepageLogicResultV14 {
  valid: boolean;
  errors: string[];
}

/** 首页逻辑校验报告 */
export interface HomepageLogicReportV14 {
  valid: boolean;
  errors: string[];
}

/**
 * 构建首页逻辑校验基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 首页逻辑校验基础数据
 */
export function buildHomepageLogic(recordId: string, dept: string): HomepageLogicV14 {
  return { recordId, dept };
}

/**
 * 首页逻辑校验。
 * errors 初始空数组；依次检查 3 个条件：
 *   1) admissionDays < 0 → errors.push('住院天数不能为负')
 *   2) age < 0 → errors.push('年龄不能为负')
 *   3) hasSurgery && admissionDays === 0 → errors.push('手术患者住院天数不能为0')
 * valid = errors.length === 0。
 *
 * @param input 校验输入（住院天数 + 年龄 + 是否手术）
 * @returns 校验结果（valid + errors）
 */
export function checkHomepageLogic(input: HomepageLogicInputV14): HomepageLogicResultV14 {
  const errors: string[] = [];
  // 手算：条件1 admissionDays < 0 → '住院天数不能为负'
  // 测试2：admissionDays=7 → 7<0=false → 不触发
  // 测试3：admissionDays=0 → 0<0=false → 不触发
  if (input.admissionDays < 0) {
    errors.push("住院天数不能为负");
  }
  // 手算：条件2 age < 0 → '年龄不能为负'
  // 测试2：age=45 → 45<0=false → 不触发
  // 测试3：age=45 → 45<0=false → 不触发
  if (input.age < 0) {
    errors.push("年龄不能为负");
  }
  // 手算：条件3 hasSurgery && admissionDays === 0 → '手术患者住院天数不能为0'
  // 测试2：hasSurgery=true, admissionDays=7 → true && 7===0=false → 不触发
  // 测试3：hasSurgery=true, admissionDays=0 → true && 0===0=true → 触发
  if (input.hasSurgery && input.admissionDays === 0) {
    errors.push("手术患者住院天数不能为0");
  }
  // 手算：valid = errors.length === 0
  // 测试2：errors=[] → valid=true
  // 测试3：errors=['手术患者住院天数不能为0'] → valid=false
  const valid = errors.length === 0;
  return { valid, errors };
}

/**
 * 构建逻辑校验报告。
 *
 * @param result 校验结果
 * @returns 校验报告（valid + errors 透传）
 */
export function buildHomepageLogicReport(result: HomepageLogicResultV14): HomepageLogicReportV14 {
  // 手算：透传 valid + errors
  // 测试4：{valid:false, errors=['手术患者住院天数不能为0']} → valid=false, errors=['手术患者住院天数不能为0']
  return { valid: result.valid, errors: result.errors };
}
