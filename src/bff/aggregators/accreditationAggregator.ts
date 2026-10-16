/**
 * 健澜科技 jlmedaios - 医院等级评审纯函数（M205-D）
 *
 * buildAccreditationReport / assessAccreditationReadiness / generateRectificationPlan
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 评审准备清单项 */
export interface ChecklistItem {
  item: string;
  ready: boolean;
}

/**
 * 评估评审准备度（纯函数）。
 *
 * @param checklist 准备清单
 * @returns 准备度评估
 */
export function assessAccreditationReadiness(checklist: ChecklistItem[]): { readyRate: number; ready: boolean; missing: string[] } {
  const total = checklist.length;
  const readyCount = checklist.filter((i) => i.ready).length;
  const readyRate = total > 0 ? readyCount / total : 0;
  const missing = checklist.filter((i) => !i.ready).map((i) => i.item);
  return { readyRate, ready: readyRate >= 0.9, missing };
}

/** 评审发现 */
export interface AccreditationFinding {
  clause: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

/**
 * 生成整改计划（纯函数）。
 *
 * @param findings 发现问题
 * @returns 整改计划
 */
export function generateRectificationPlan(findings: AccreditationFinding[]): { total: number; highPriority: number; actions: string[] } {
  const highPriority = findings.filter((f) => f.severity === 'high').length;
  const actions = findings.map((f) => `[${f.severity}] ${f.clause}: ${f.description}`);
  return { total: findings.length, highPriority, actions };
}

/** 等级评审报告输出 */
export interface AccreditationReport {
  timeRange: string;
  tertiary: { chapters: number; coreClauses: number; starClauses: number; selfScore: number };
  emr: { level: number; target: number };
  interoperability: { level: number; target: number };
  smartHospital: { service: boolean; management: boolean; patient: boolean };
  preparation: { selfAssessment: number; policies: number; drills: number; training: number };
  onSite: { ledger: number; tracer: number; interview: number; dataAnalysis: number };
  rectification: { cycles: number; closedLoop: number };
  suggestions: string[];
}

/**
 * 构建等级评审报告。
 *
 * @param timeRange 时间范围
 * @returns 等级评审报告
 */
export function buildAccreditationReport(timeRange: string): AccreditationReport {
  return {
    timeRange,
    tertiary: { chapters: 12, coreClauses: 50, starClauses: 20, selfScore: 85 },
    emr: { level: 5, target: 6 },
    interoperability: { level: 4, target: 5 },
    smartHospital: { service: true, management: true, patient: false },
    preparation: { selfAssessment: 100, policies: 200, drills: 10, training: 500 },
    onSite: { ledger: 500, tracer: 50, interview: 100, dataAnalysis: 20 },
    rectification: { cycles: 5, closedLoop: 4 },
    suggestions: ['电子病历评级冲击 6 级', '智慧服务补齐短板'],
  };
}
