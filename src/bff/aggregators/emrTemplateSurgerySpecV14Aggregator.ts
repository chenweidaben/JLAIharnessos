/**
 * 健澜科技 jlmedaios - 手术记录模板规范 V14 聚合器（M523-C）
 *
 * 纯函数：构建手术模板规范基础数据 + 校验手术模板 + 构建规范报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手术模板规范基础数据 */
export interface SurgerySpecV14 {
  surgeryType: string;
  specVersion: string;
}

/** 校验输入 */
export interface SurgeryValidateInputV14 {
  hasPreOp: boolean;
  hasIncision: boolean;
  hasAnesthesia: boolean;
  hasPostOp: boolean;
}

/** 校验结果 */
export interface SurgeryValidateResultV14 {
  valid: boolean;
  missingFields: string[];
}

/** 规范报告 */
export interface SurgerySpecReportV14 {
  valid: boolean;
  missingCount: number;
}

/**
 * 构建手术模板规范基础数据。
 *
 * @param surgeryType 手术类型
 * @param specVersion 规范版本
 * @returns 手术模板规范基础数据
 */
export function buildSurgerySpec(surgeryType: string, specVersion: string): SurgerySpecV14 {
  return { surgeryType, specVersion };
}

/**
 * 校验手术模板。
 * 4 字段都 true 才 valid=true；否则列出缺失项（缺术前小结/缺切口记录/缺麻醉记录/缺术后记录）。
 *
 * @param input 校验输入（4 项检查）
 * @returns 校验结果（valid + missingFields）
 */
export function validateSurgeryTemplate(input: SurgeryValidateInputV14): SurgeryValidateResultV14 {
  // 手算：4 字段都 true 才 valid=true
  // 测试2：{hasPreOp:true, hasIncision:true, hasAnesthesia:true, hasPostOp:true} → valid=true, missingFields=[]
  // 手算：否则列出缺失项
  // 测试3：hasIncision=false → '缺切口记录'; hasPostOp=false → '缺术后记录'
  // 测试3：missingFields=['缺切口记录','缺术后记录'], valid=false
  const missingFields: string[] = [];
  if (!input.hasPreOp) {
    missingFields.push("缺术前小结");
  }
  if (!input.hasIncision) {
    missingFields.push("缺切口记录");
  }
  if (!input.hasAnesthesia) {
    missingFields.push("缺麻醉记录");
  }
  if (!input.hasPostOp) {
    missingFields.push("缺术后记录");
  }
  const valid = missingFields.length === 0;
  return { valid, missingFields };
}

/**
 * 构建规范报告。
 *
 * @param result 校验结果
 * @returns 规范报告（valid + missingCount）
 */
export function buildSurgerySpecReport(result: SurgeryValidateResultV14): SurgerySpecReportV14 {
  // 手算：missingCount = missingFields.length
  // 测试4：missingFields=['缺切口记录','缺术后记录'] → missingCount=2
  const missingCount = result.missingFields.length;
  return { valid: result.valid, missingCount };
}
