/**
 * 健澜科技 jlmedaios - 风险管理深化纯函数（M198-D）
 *
 * buildRiskManagementReport / assessRiskLevel / generateRiskResponse
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 风险等级评估（纯函数）。
 *
 * @param probability 概率（1-5）
 * @param impact 影响（1-5）
 * @returns 风险等级
 */
export function assessRiskLevel(probability: number, impact: number): { level: 'low' | 'medium' | 'high' | 'critical'; score: number } {
  const score = probability * impact;
  if (score >= 20) return { level: 'critical', score };
  if (score >= 12) return { level: 'high', score };
  if (score >= 6) return { level: 'medium', score };
  return { level: 'low', score };
}

/** 风险数据 */
export interface RiskData {
  riskType: 'strategic' | 'operational' | 'financial' | 'legal' | 'safety';
  level: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 生成风险应对方案（纯函数）。
 *
 * @param risk 风险数据
 * @returns 应对策略
 */
export function generateRiskResponse(risk: RiskData): { strategy: 'avoid' | 'reduce' | 'transfer' | 'accept'; action: string } {
  if (risk.level === 'critical' || risk.level === 'high') {
    return { strategy: 'reduce', action: '立即制定缓解措施，指定责任人' };
  }
  if (risk.level === 'medium') {
    return { strategy: 'reduce', action: '定期监控，制定应急预案' };
  }
  return { strategy: 'accept', action: '接受风险，记录在案' };
}

/** 风险管理报告输出 */
export interface RiskManagementReport {
  timeRange: string;
  identification: { strategic: number; operational: number; financial: number; legal: number; safety: number };
  assessment: { low: number; medium: number; high: number; critical: number };
  response: { avoid: number; reduce: number; transfer: number; accept: number };
  monitoring: { monitored: number; alerts: number };
  emergency: { plans: number; drills: number; incidents: number };
  continuity: { bia: number; bcp: number; drp: number };
  report: { issued: number };
  culture: { training: number; awarenessRate: number };
  suggestions: string[];
}

/**
 * 构建风险管理报告。
 *
 * @param timeRange 时间范围
 * @returns 风险管理报告
 */
export function buildRiskManagementReport(timeRange: string): RiskManagementReport {
  return {
    timeRange,
    identification: { strategic: 5, operational: 15, financial: 8, legal: 6, safety: 10 },
    assessment: { low: 10, medium: 20, high: 12, critical: 2 },
    response: { avoid: 3, reduce: 25, transfer: 5, accept: 11 },
    monitoring: { monitored: 48, alerts: 15 },
    emergency: { plans: 10, drills: 4, incidents: 3 },
    continuity: { bia: 5, bcp: 5, drp: 5 },
    report: { issued: 12 },
    culture: { training: 15, awarenessRate: 0.9 },
    suggestions: ['加强高风险监控频率', '增加应急演练次数'],
  };
}
