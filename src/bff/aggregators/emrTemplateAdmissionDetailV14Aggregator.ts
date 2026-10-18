/**
 * 健澜科技 jlmedaios - 入院记录模板细化 V14 聚合器（M523-B）
 *
 * 纯函数：构建入院模板细化基础数据 + 渲染入院模板 + 构建细化报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 入院模板细化基础数据 */
export interface AdmissionDetailV14 {
  dept: string;
  templateVersion: string;
}

/** 渲染输入 */
export interface AdmissionRenderInputV14 {
  sections: string[];
  patientName: string;
}

/** 渲染结果 */
export interface AdmissionRenderResultV14 {
  fieldCount: number;
  renderedLength: number;
}

/** 细化报告 */
export interface AdmissionDetailReportV14 {
  fieldCount: number;
  renderedLength: number;
}

/**
 * 构建入院模板细化基础数据。
 *
 * @param dept 科室
 * @param templateVersion 模板版本
 * @returns 入院模板细化基础数据
 */
export function buildAdmissionDetail(dept: string, templateVersion: string): AdmissionDetailV14 {
  return { dept, templateVersion };
}

/**
 * 渲染入院模板。
 * fieldCount = sections.length × 3；renderedLength = sections.join('').length + patientName.length。
 *
 * @param input 渲染输入（段落列表 + 患者姓名）
 * @returns 渲染结果（fieldCount + renderedLength）
 */
export function renderAdmissionTemplate(input: AdmissionRenderInputV14): AdmissionRenderResultV14 {
  // 手算：fieldCount = sections.length × 3
  // 测试2：sections=['主诉','现病史','既往史'] → 3 × 3 = 9
  // 测试3：sections=['主诉','现病史','既往史','个人史','家族史'] → 5 × 3 = 15
  const fieldCount = input.sections.length * 3;
  // 手算：renderedLength = sections.join('').length + patientName.length
  // 测试2：sections.join('')='主诉现病史既往史' → JS UTF-16 length=8（2+3+3）
  // 测试2：patientName='张三' → length=2
  // 测试2：renderedLength = 8 + 2 = 10
  // 测试3：sections.join('')='主诉现病史既往史个人史家族史' → length=2+3+3+3+3=14
  // 测试3：patientName='李四' → length=2 → renderedLength = 14 + 2 = 16
  const renderedLength = input.sections.join("").length + input.patientName.length;
  return { fieldCount, renderedLength };
}

/**
 * 构建细化报告。
 *
 * @param result 渲染结果
 * @returns 细化报告（fieldCount + renderedLength 透传）
 */
export function buildAdmissionDetailReport(result: AdmissionRenderResultV14): AdmissionDetailReportV14 {
  return { fieldCount: result.fieldCount, renderedLength: result.renderedLength };
}
