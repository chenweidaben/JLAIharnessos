/**
 * 健澜科技 jlmedaios - 人才队伍 V2 纯函数（M219-B）
 *
 * buildTalentReportV2 / assessTalentStructure / buildTalentPipeline
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估人才结构（纯函数）。
 *
 * @param talents 人才总数
 * @returns 结构分
 */
export function assessTalentStructure(talents: { leaders: number; mid: number; junior: number }): { score: number; balanced: boolean } {
  const total = talents.leaders + talents.mid + talents.junior;
  const score = total > 0 ? Math.round((talents.leaders / total) * 100) : 0;
  const balanced = talents.junior >= talents.leaders;
  return { score, balanced };
}

/**
 * 构建人才梯队（纯函数）。
 *
 * @param levels 各层级人数
 * @returns 梯队
 */
export function buildTalentPipeline(levels: { leaders: number; backups: number; young: number }): { depth: number; coverage: number } {
  const depth = levels.backups + levels.young;
  const coverage = levels.leaders > 0 ? depth / levels.leaders : 0;
  return { depth, coverage: Math.round(coverage * 100) / 100 };
}

/** 人才队伍 V2 报告输出 */
export interface TalentReportV2 {
  timeRange: string;
  leading: { academician: number; distinguished: number };
  leaders: { discipline: number };
  young: { backbone: number; greenseed: number };
  nursing: { talents: number };
  tech: { talents: number };
  management: { talents: number };
  recruitment: { positions: number };
  tenure: { reviewed: number };
  suggestions: string[];
}

/**
 * 构建人才队伍 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 人才队伍 V2 报告
 */
export function buildTalentReportV2(timeRange: string): TalentReportV2 {
  return {
    timeRange,
    leading: { academician: 0, distinguished: 2 },
    leaders: { discipline: 10 },
    young: { backbone: 50, greenseed: 20 },
    nursing: { talents: 30 },
    tech: { talents: 20 },
    management: { talents: 15 },
    recruitment: { positions: 30 },
    tenure: { reviewed: 5 },
    suggestions: ['引进领军人才', '加强青苗计划'],
  };
}
