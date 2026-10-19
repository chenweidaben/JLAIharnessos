/**
 * 健澜科技 jlmedaios - 病历AI临床指南推荐 V14 聚合器（M554-D，M554 收官）
 *
 * 纯函数：构建 AI 临床指南推荐基础数据 + AI 临床指南推荐 + 构建临床指南推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 临床指南推荐基础数据 */
export interface AiClinicalGuidelineRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 临床指南推荐输入 */
export interface AiClinicalGuidelineRecoInputV14 {
  diagnosis: string;
  specialty: string;
}

/** AI 临床指南推荐结果 */
export interface AiClinicalGuidelineRecoResultV14 {
  guidelineName: string;
  version: string;
}

/** 临床指南推荐报告 */
export interface AiClinicalGuidelineRecoReportV14 {
  guidelineName: string;
  version: string;
}

/**
 * 构建 AI 临床指南推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 临床指南推荐基础数据
 */
export function buildAiClinicalGuidelineReco(recordId: string, dept: string): AiClinicalGuidelineRecoV14 {
  return { recordId, dept };
}

/**
 * AI 临床指南推荐。
 * guidelineName = diagnosis.includes('心梗')
 *   ? '急性ST段抬高型心梗诊疗指南'
 *   : diagnosis.includes('肺炎')
 *     ? '社区获得性肺炎诊断和治疗指南'
 *     : '常见病临床诊疗指南'
 * version = '2024版'
 *
 * @param input 临床指南推荐输入（诊断 + 专科）
 * @returns 临床指南推荐结果（guidelineName + version）
 */
export function recommendClinicalGuidelineByAi(input: AiClinicalGuidelineRecoInputV14): AiClinicalGuidelineRecoResultV14 {
  // 手算：guidelineName = diagnosis.includes('心梗')
  //   ? '急性ST段抬高型心梗诊疗指南'
  //   : diagnosis.includes('肺炎')
  //     ? '社区获得性肺炎诊断和治疗指南'
  //     : '常见病临床诊疗指南'
  // 测试2：diagnosis='急性心梗' → includes('心梗')=true → guidelineName='急性ST段抬高型心梗诊疗指南'
  // 测试3：diagnosis='上呼吸道感染' → 不含心梗/肺炎 → guidelineName='常见病临床诊疗指南'
  const guidelineName = input.diagnosis.includes("心梗")
    ? "急性ST段抬高型心梗诊疗指南"
    : input.diagnosis.includes("肺炎")
      ? "社区获得性肺炎诊断和治疗指南"
      : "常见病临床诊疗指南";
  // 手算：version = '2024版'（统一版本）
  // 测试2：version='2024版'
  // 测试3：version='2024版'
  const version = "2024版";
  return { guidelineName, version };
}

/**
 * 构建临床指南推荐报告。
 *
 * @param result 临床指南推荐结果
 * @returns 临床指南推荐报告（guidelineName + version 透传）
 */
export function buildAiClinicalGuidelineRecoReport(result: AiClinicalGuidelineRecoResultV14): AiClinicalGuidelineRecoReportV14 {
  // 手算：透传 guidelineName + version
  // 测试4：{guidelineName='急性ST段抬高型心梗诊疗指南', version='2024版'} → 透传
  return { guidelineName: result.guidelineName, version: result.version };
}
