/**
 * 健澜科技 jlmedaios - 质控干预建议生成 V14 聚合器（M495-D，M495 收官）
 *
 * 纯函数：干预建议生成 + 干预报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 干预建议 */
export interface InterventionV14 {
  level: string;
  suggestion: string;
  action: string;
}

/** 干预报告 */
export interface InterventionReportV14 {
  level: string;
  suggestion: string;
  action: string;
}

/**
 * 按风险等级生成干预建议（低→保持监控/中→加强培训/高→立即整改+专家会诊）。
 *
 * @param level 风险等级
 * @returns 干预建议
 */
export function generateIntervention(level: string): InterventionV14 {
  // 手算建议：低风险→保持监控/中风险→加强培训/高风险→立即整改+专家会诊
  if (level === "低风险") {
    return { level, suggestion: "保持监控", action: "月度常规质控检查" };
  }
  if (level === "中风险") {
    return { level, suggestion: "加强培训", action: "组织病历书写专项培训" };
  }
  return { level, suggestion: "立即整改", action: "立即整改 + 专家会诊" };
}

/**
 * 构建干预报告（level+suggestion+action）。
 *
 * @param level 风险等级
 * @param suggestion 建议
 * @returns 干预报告
 */
export function buildInterventionReport(level: string, suggestion: string): InterventionReportV14 {
  const intervention = generateIntervention(level);
  return { level, suggestion, action: intervention.action };
}
