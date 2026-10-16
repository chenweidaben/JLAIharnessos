/**
 * 健澜科技 jlmedaios - 合规管理深化纯函数（M198-B）
 *
 * buildComplianceReport / checkCompliance / generateComplianceReport
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 合规检查（纯函数）。
 *
 * @param item 检查项
 * @param regulation 法规要求
 * @returns 合规结果
 */
export function checkCompliance(item: { status: 'compliant' | 'non_compliant' | 'partial'; evidence: string }, regulation: string): { compliant: boolean; score: number; remark: string } {
  if (item.status === 'compliant' && item.evidence.length > 0) {
    return { compliant: true, score: 100, remark: `符合${regulation}要求` };
  }
  if (item.status === 'partial') {
    return { compliant: false, score: 60, remark: `部分符合${regulation}，需补充证据` };
  }
  return { compliant: false, score: 0, remark: `不符合${regulation}，需整改` };
}

/** 合规发现 */
export interface ComplianceFinding {
  id: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

/**
 * 生成合规报告（纯函数）。
 *
 * @param findings 发现列表
 * @returns 合规报告
 */
export function generateComplianceReport(findings: ComplianceFinding[]): { total: number; high: number; medium: number; low: number; overallScore: number } {
  const high = findings.filter((f) => f.severity === 'high').length;
  const medium = findings.filter((f) => f.severity === 'medium').length;
  const low = findings.filter((f) => f.severity === 'low').length;
  const overallScore = Math.max(0, 100 - high * 20 - medium * 10 - low * 5);
  return { total: findings.length, high, medium, low, overallScore };
}

/** 合规报告输出 */
export interface ComplianceReport {
  timeRange: string;
  laws: { dataSecurity: boolean; privacy: boolean; cybersecurity: boolean; basicMedical: boolean };
  industry: { emrStandard: boolean; interoperability: string; smartServiceGrade: string };
  medicalQuality: { compliant: number; issues: number };
  insurance: { compliant: number; issues: number };
  drug: { compliant: number; issues: number };
  device: { compliant: number; issues: number };
  training: { sessions: number; attendees: number; passRate: number };
  audit: { internal: number; external: number };
  findings: { high: number; medium: number; low: number; overallScore: number };
  suggestions: string[];
}

/**
 * 构建合规报告。
 *
 * @param timeRange 时间范围
 * @returns 合规报告
 */
export function buildComplianceReport(timeRange: string): ComplianceReport {
  const findings: ComplianceFinding[] = [
    { id: 'F1', severity: 'high', description: '数据加密覆盖不足' },
    { id: 'F2', severity: 'medium', description: '培训记录不完整' },
    { id: 'F3', severity: 'low', description: '公示信息更新滞后' },
  ];
  const report = generateComplianceReport(findings);

  return {
    timeRange,
    laws: { dataSecurity: true, privacy: true, cybersecurity: true, basicMedical: true },
    industry: { emrStandard: true, interoperability: '四甲', smartServiceGrade: '五级' },
    medicalQuality: { compliant: 95, issues: 5 },
    insurance: { compliant: 98, issues: 2 },
    drug: { compliant: 99, issues: 1 },
    device: { compliant: 97, issues: 3 },
    training: { sessions: 20, attendees: 500, passRate: 0.95 },
    audit: { internal: 5, external: 2 },
    findings: report,
    suggestions: ['优先整改高危发现', '完善合规培训记录'],
  };
}
