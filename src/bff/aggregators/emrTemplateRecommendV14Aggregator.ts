/**
 * 健澜科技 jlmedaios - 病历模板智能推荐 V14 聚合器（M539-A）
 *
 * 纯函数：构建模板推荐基础数据 + 模板推荐 + 构建推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 模板推荐基础数据 */
export interface TemplateRecommendV14 {
  dept: string;
  doctorId: string;
}

/** 模板推荐输入 */
export interface TemplateRecommendInputV14 {
  dept: string;
  recordType: string;
}

/** 模板推荐结果 */
export interface TemplateRecommendResultV14 {
  recommended: string[];
  matchCount: number;
}

/** 推荐报告 */
export interface TemplateRecommendReportV14 {
  recommended: string[];
  matchCount: number;
}

/**
 * 构建模板推荐基础数据。
 *
 * @param dept 科室
 * @param doctorId 医生ID
 * @returns 模板推荐基础数据
 */
export function buildTemplateRecommend(dept: string, doctorId: string): TemplateRecommendV14 {
  return { dept, doctorId };
}

/**
 * 模板推荐。
 * recommended = dept === '心内科' && recordType === '入院记录'
 *   ? ['心内科入院记录模板A', '心内科入院记录模板B']
 *   : ['通用入院记录模板']
 * matchCount = recommended.length
 *
 * @param input 推荐输入（科室 + 病历类型）
 * @returns 推荐结果（recommended + matchCount）
 */
export function recommendTemplate(input: TemplateRecommendInputV14): TemplateRecommendResultV14 {
  // 手算：recommended = dept === '心内科' && recordType === '入院记录' ? 2 个专科模板 : 1 个通用模板
  // 测试2：dept='心内科', recordType='入院记录' → ['心内科入院记录模板A','心内科入院记录模板B']
  // 测试3：dept='骨科', recordType='入院记录' → ['通用入院记录模板']
  const recommended: string[] =
    input.dept === "心内科" && input.recordType === "入院记录"
      ? ["心内科入院记录模板A", "心内科入院记录模板B"]
      : ["通用入院记录模板"];
  // 手算：matchCount = recommended.length
  // 测试2：recommended.length = 2 → matchCount=2
  // 测试3：recommended.length = 1 → matchCount=1
  const matchCount = recommended.length;
  return { recommended, matchCount };
}

/**
 * 构建推荐报告。
 *
 * @param result 推荐结果
 * @returns 推荐报告（recommended + matchCount 透传）
 */
export function buildTemplateRecommendReport(result: TemplateRecommendResultV14): TemplateRecommendReportV14 {
  // 手算：透传 recommended + matchCount
  // 测试4：{recommended=['心内科入院记录模板A','心内科入院记录模板B'], matchCount=2} → 透传
  return { recommended: result.recommended, matchCount: result.matchCount };
}
