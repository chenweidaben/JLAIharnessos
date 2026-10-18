/**
 * 健澜科技 jlmedaios - 病历AI出院小结生成 V14 聚合器（M547-A）
 *
 * 纯函数：构建 AI 出院小结基础数据 + AI 出院小结生成 + 构建出院小结报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 出院小结基础数据 */
export interface AiDischargeSummaryV14 {
  recordId: string;
  dept: string;
}

/** AI 出院小结生成输入 */
export interface AiDischargeSummaryInputV14 {
  diagnosis: string;
  treatment: string;
}

/** AI 出院小结生成结果 */
export interface AiDischargeSummaryResultV14 {
  summary: string;
  length: number;
}

/** 出院小结报告 */
export interface AiDischargeSummaryReportV14 {
  summary: string;
  length: number;
}

/**
 * 构建 AI 出院小结基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 出院小结基础数据
 */
export function buildAiDischargeSummary(recordId: string, dept: string): AiDischargeSummaryV14 {
  return { recordId, dept };
}

/**
 * AI 出院小结生成。
 * summary = `患者诊断为${diagnosis}，经${treatment}治疗后好转出院。`
 * length = summary.length（JS UTF-16 字符串长度，每个汉字=1）
 *
 * @param input 出院小结输入（诊断 + 治疗经过）
 * @returns 出院小结结果（summary + length）
 */
export function generateDischargeSummaryByAi(input: AiDischargeSummaryInputV14): AiDischargeSummaryResultV14 {
  // 手算：summary = `患者诊断为${diagnosis}，经${treatment}治疗后好转出院。`
  // 测试2：diagnosis='急性心梗', treatment='PCI手术'
  //        → summary='患者诊断为急性心梗，经PCI手术治疗后好转出院。'
  // 测试3：diagnosis='上呼吸道感染', treatment='抗感染'
  //        → summary='患者诊断为上呼吸道感染，经抗感染治疗后好转出院。'
  const summary = `患者诊断为${input.diagnosis}，经${input.treatment}治疗后好转出院。`;
  // 手算：length = summary.length
  // 测试2：'患者诊断为急性心梗，经PCI手术治疗后好转出院。'.length = 24
  //   患(1)者(2)诊(3)断(4)为(5)急(6)性(7)心(8)梗(9)，(10)经(11)P(12)C(13)I(14)手(15)术(16)治(17)疗(18)后(19)好(20)转(21)出(22)院(23)。(24)
  // 测试3：'患者诊断为上呼吸道感染，经抗感染治疗后好转出院。'.length = 24
  //   患(1)者(2)诊(3)断(4)为(5)上(6)呼(7)吸(8)道(9)感(10)染(11)，(12)经(13)抗(14)感(15)染(16)治(17)疗(18)后(19)好(20)转(21)出(22)院(23)。(24)
  const length = summary.length;
  return { summary, length };
}

/**
 * 构建出院小结报告。
 *
 * @param result 出院小结结果
 * @returns 出院小结报告（summary + length 透传）
 */
export function buildAiDischargeSummaryReport(result: AiDischargeSummaryResultV14): AiDischargeSummaryReportV14 {
  // 手算：透传 summary + length
  // 测试4：{summary='患者诊断为急性心梗，经PCI手术治疗后好转出院。', length=24} → 透传
  return { summary: result.summary, length: result.length };
}
