/**
 * 健澜科技 jlmedaios - 纪检监察纯函数（M194-B）
 *
 * buildDisciplineInspectionReport / assessIntegrityRisk / classifyDisciplineAction
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 岗位廉政风险数据 */
export interface PositionData {
  position: string;
  hasApprovalPower: boolean;
  hasProcurementPower: boolean;
  hasFinancePower: boolean;
}

/**
 * 廉政风险评估（纯函数）。
 *
 * @param data 岗位数据
 * @returns 风险等级
 */
export function assessIntegrityRisk(data: PositionData): 'low' | 'medium' | 'high' {
  let risk = 0;
  if (data.hasApprovalPower) risk += 1;
  if (data.hasProcurementPower) risk += 1;
  if (data.hasFinancePower) risk += 1;
  if (risk >= 2) return 'high';
  if (risk === 1) return 'medium';
  return 'low';
}

/** 执纪类型 */
export type DisciplineActionType = 'warning' | 'serious_warning' | 'demotion' | 'dismissal' | 'expulsion';

/** 执纪处分分类（纯函数）。
 *
 * @param action 处分类型
 * @returns 严重程度
 */
export function classifyDisciplineAction(action: DisciplineActionType): { severity: string; level: number } {
  const map: Record<DisciplineActionType, { severity: string; level: number }> = {
    warning: { severity: '轻', level: 1 },
    serious_warning: { severity: '轻', level: 2 },
    demotion: { severity: '重', level: 3 },
    dismissal: { severity: '重', level: 4 },
    expulsion: { severity: '最重', level: 5 },
  };
  return map[action];
}

/** 纪检监察报告输出 */
export interface DisciplineInspectionReport {
  dept: string;
  timeRange: string;
  organization: { committee: number; members: number };
  integrityEducation: { sessions: number; participants: number };
  riskPoints: { total: number; high: number; medium: number; low: number };
  supervision: { inspections: number; problems: number };
  complaints: { received: number; handled: number };
  disciplineActions: { total: number; bySeverity: Record<string, number> };
  styleImprovement: { eightRegulations: number; siFengRectification: number };
  suggestions: string[];
}

/**
 * 构建纪检监察报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 纪检报告
 */
export function buildDisciplineInspectionReport(dept: string, timeRange: string): DisciplineInspectionReport {
  return {
    dept,
    timeRange,
    organization: { committee: 1, members: 8 },
    integrityEducation: { sessions: 6, participants: 800 },
    riskPoints: { total: 45, high: 8, medium: 20, low: 17 },
    supervision: { inspections: 12, problems: 5 },
    complaints: { received: 3, handled: 3 },
    disciplineActions: { total: 1, bySeverity: { 轻: 1 } },
    styleImprovement: { eightRegulations: 4, siFengRectification: 2 },
    suggestions: ['加强重点岗位廉政风险防控', '常态化开展警示教育'],
  };
}
