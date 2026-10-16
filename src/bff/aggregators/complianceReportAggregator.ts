/**
 * 健澜科技 jlmedaios - 合规管理纯函数（M217-B）
 *
 * buildComplianceReport / assessComplianceRisk / trackComplianceItem
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估合规风险（纯函数）。
 *
 * @param regulations 法规数
 * @param gaps 差距数
 * @returns 风险等级
 */
export function assessComplianceRisk(regulations: number, gaps: number): { level: string; score: number } {
  const score = gaps / Math.max(regulations, 1);
  let level = '低';
  if (score > 0.3) level = '高';
  else if (score > 0.1) level = '中';
  return { level, score };
}

/** 合规项目 */
export interface ComplianceItem {
  name: string;
  status: '合规' | '整改中' | '不合规';
}

/**
 * 追踪合规项目（纯函数）。
 *
 * @param items 项目列表
 * @returns 合规率
 */
export function trackComplianceItem(items: ComplianceItem[]): { complianceRate: number; total: number } {
  const compliant = items.filter((i) => i.status === '合规').length;
  const total = items.length;
  return { complianceRate: total > 0 ? compliant / total : 0, total };
}

/** 合规报告输出 */
export interface ComplianceReport {
  timeRange: string;
  medicalRegulations: { items: number };
  pharmaRegulations: { items: number };
  insurance: { audits: number };
  price: { compliant: boolean };
  procurement: { sunshines: number };
  fireSafety: { compliant: boolean };
  training: { sessions: number };
  suggestions: string[];
}

/**
 * 构建合规报告。
 *
 * @param timeRange 时间范围
 * @returns 合规报告
 */
export function buildComplianceReport(timeRange: string): ComplianceReport {
  return {
    timeRange,
    medicalRegulations: { items: 50 },
    pharmaRegulations: { items: 30 },
    insurance: { audits: 5 },
    price: { compliant: true },
    procurement: { sunshines: 100 },
    fireSafety: { compliant: true },
    training: { sessions: 20 },
    suggestions: ['加强医保自查', '增加合规培训次数'],
  };
}
