/**
 * 健澜科技 jlmedaios - 病历AI病区交班报告生成 V14 聚合器（M557-D，M557 收官）
 *
 * 纯函数：构建 AI 病区交班报告生成基础数据 + AI 病区交班报告生成 + 构建病区交班报告生成报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 病区交班报告生成基础数据 */
export interface AiShiftReportGenV14 {
  recordId: string;
  dept: string;
}

/** AI 病区交班报告生成输入 */
export interface AiShiftReportGenInputV14 {
  ward: string;
  patientCount: number;
  criticalCount: number;
}

/** AI 病区交班报告生成结果 */
export interface AiShiftReportGenResultV14 {
  report: string;
  handoverNote: string;
}

/** 病区交班报告生成报告 */
export interface AiShiftReportGenReportV14 {
  report: string;
  handoverNote: string;
}

/**
 * 构建 AI 病区交班报告生成基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 病区交班报告生成基础数据
 */
export function buildAiShiftReportGen(recordId: string, dept: string): AiShiftReportGenV14 {
  return { recordId, dept };
}

/**
 * AI 病区交班报告生成。
 * report = `${ward}病区今日在院${patientCount}人，危重${criticalCount}人，病情平稳。`
 * handoverNote = criticalCount > 0 ? '注意观察危重患者病情变化，及时记录。' : '今日无特殊交班事项。'
 *
 * @param input 交班报告生成输入（病区 + 在院人数 + 危重人数）
 * @returns 交班报告生成结果（report + handoverNote）
 */
export function genShiftReportByAi(input: AiShiftReportGenInputV14): AiShiftReportGenResultV14 {
  // 手算：report = `${ward}病区今日在院${patientCount}人，危重${criticalCount}人，病情平稳。`
  // 测试2：ward='心内科', patientCount=30, criticalCount=3
  //   → report='心内科病区今日在院30人，危重3人，病情平稳。'
  // 测试3：ward='外科', patientCount=25, criticalCount=0
  //   → report='外科病区今日在院25人，危重0人，病情平稳。'
  const report = `${input.ward}病区今日在院${input.patientCount}人，危重${input.criticalCount}人，病情平稳。`;
  // 手算：handoverNote = criticalCount > 0 ? '注意观察危重患者病情变化，及时记录。' : '今日无特殊交班事项。'
  // 测试2：criticalCount=3 > 0 → handoverNote='注意观察危重患者病情变化，及时记录。'
  // 测试3：criticalCount=0 → handoverNote='今日无特殊交班事项。'
  const handoverNote = input.criticalCount > 0 ? "注意观察危重患者病情变化，及时记录。" : "今日无特殊交班事项。";
  return { report, handoverNote };
}

/**
 * 构建病区交班报告生成报告。
 *
 * @param result 交班报告生成结果
 * @returns 交班报告生成报告（report + handoverNote 透传）
 */
export function buildAiShiftReportGenReport(result: AiShiftReportGenResultV14): AiShiftReportGenReportV14 {
  // 手算：透传 report + handoverNote
  // 测试4：{report='测试报告', handoverNote='测试注意事项'} → 透传
  return { report: result.report, handoverNote: result.handoverNote };
}
