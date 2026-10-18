/**
 * 健澜科技 jlmedaios - 质控移动端查看 V14 聚合器（M526-B）
 *
 * 纯函数：构建移动端查看基础数据 + 移动端查看 + 构建查看报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 移动端查看基础数据 */
export interface MobileViewV14 {
  recordId: string;
  viewer: string;
}

/** 查看输入 */
export interface MobileViewInputV14 {
  recordId: string;
  sections: string[];
}

/** 查看结果 */
export interface MobileViewResultV14 {
  viewedSections: number;
  viewLength: number;
}

/** 查看报告 */
export interface MobileViewReportV14 {
  viewedSections: number;
  viewLength: number;
}

/**
 * 构建移动端查看基础数据。
 *
 * @param recordId 病历ID
 * @param viewer 查看人
 * @returns 移动端查看基础数据
 */
export function buildMobileView(recordId: string, viewer: string): MobileViewV14 {
  return { recordId, viewer };
}

/**
 * 移动端查看。
 * viewedSections = sections.length；viewLength = sections.join('').length（JS UTF-16 每个汉字=1）。
 *
 * @param input 查看输入（病历ID + 段落列表）
 * @returns 查看结果（viewedSections + viewLength）
 */
export function viewOnMobile(input: MobileViewInputV14): MobileViewResultV14 {
  // 手算：viewedSections = sections.length
  // 测试2：sections=['入院记录','病程记录','出院小结'] → viewedSections=3
  // 测试3：sections=['手术记录'] → viewedSections=1
  const viewedSections = input.sections.length;
  // 手算：viewLength = sections.join('').length（JS UTF-16 每个汉字=1）
  // 测试2：'入院记录'(4)+'病程记录'(4)+'出院小结'(4) = 12 → viewLength=12
  //        注：规格原文写 11，实际函数逻辑为 12，按实际逻辑修正
  // 测试3：'手术记录'(4) → viewLength=4
  const viewLength = input.sections.join("").length;
  return { viewedSections, viewLength };
}

/**
 * 构建查看报告。
 *
 * @param result 查看结果
 * @returns 查看报告（viewedSections + viewLength 透传）
 */
export function buildMobileViewReport(result: MobileViewResultV14): MobileViewReportV14 {
  // 手算：透传 viewedSections + viewLength
  // 测试4：{viewedSections:3, viewLength:12} → viewedSections=3, viewLength=12
  return { viewedSections: result.viewedSections, viewLength: result.viewLength };
}
