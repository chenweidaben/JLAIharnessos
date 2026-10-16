/**
 * 健澜科技 jlmedaios - 学科建设 V2 纯函数（M219-A）
 *
 * buildDisciplineReportV2 / assessDisciplineLevel / buildDisciplineDevelopmentPlan
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 学科等级 */
export type DisciplineLevel = '国家级' | '省级' | '市级' | '院级';

/**
 * 评估学科等级（纯函数）。
 *
 * @param discipline 学科名称
 * @returns 等级
 */
export function assessDisciplineLevel(discipline: string): DisciplineLevel {
  if (discipline.includes('国家')) return '国家级';
  if (discipline.includes('省')) return '省级';
  if (discipline.includes('市')) return '市级';
  return '院级';
}

/**
 * 构建学科发展计划（纯函数）。
 *
 * @param current 当前等级
 * @param target 目标等级
 * @returns 计划
 */
export function buildDisciplineDevelopmentPlan(current: number, target: number): { gap: number; actions: string[] } {
  const gap = Math.max(0, target - current);
  const actions: string[] = [];
  if (gap > 0) actions.push(`从 ${current} 级提升至 ${target} 级`);
  if (gap > 1) actions.push('加强 MDT 多学科协作');
  return { gap, actions };
}

/** 学科建设 V2 报告输出 */
export interface DisciplineReportV2 {
  timeRange: string;
  national: { specialties: number };
  provincial: { specialties: number };
  diseaseCenters: { chestPain: number; stroke: number; trauma: number };
  mdt: { teams: number };
  interdisciplinary: { groups: number };
  subspecialty: { departments: number };
  assessment: { score: number };
  collaboration: { university: number };
  suggestions: string[];
}

/**
 * 构建学科建设 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 学科建设 V2 报告
 */
export function buildDisciplineReportV2(timeRange: string): DisciplineReportV2 {
  return {
    timeRange,
    national: { specialties: 2 },
    provincial: { specialties: 8 },
    diseaseCenters: { chestPain: 1, stroke: 1, trauma: 1 },
    mdt: { teams: 15 },
    interdisciplinary: { groups: 5 },
    subspecialty: { departments: 30 },
    assessment: { score: 85 },
    collaboration: { university: 3 },
    suggestions: ['争创国家级重点专科', '加强专病中心建设'],
  };
}
