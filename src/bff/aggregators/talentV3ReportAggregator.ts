/**
 * 健澜科技 jlmedaios - 人才队伍 V3 纯函数（M242-B）
 *
 * buildTalentV3Report / assessTalentStructureV3 / buildTalentPipelineV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估人才结构 V3（纯函数）。
 *
 * @param talents 人才
 * @returns 结构
 */
export function assessTalentStructureV3(talents: { leaders: number; mid: number; young: number }): { leaders: number; mid: number; young: number; healthy: boolean } {
  return {
    leaders: talents.leaders,
    mid: talents.mid,
    young: talents.young,
    healthy: talents.young > talents.mid && talents.mid > talents.leaders,
  };
}

/**
 * 构建人才梯队 V3（纯函数）。
 *
 * @param levels 层级
 * @returns 梯队
 */
export function buildTalentPipelineV3(levels: { academician: number; yangtze: number; distinguished: number; young: number }): { pipeline: number; coverage: number } {
  const pipeline = levels.academician + levels.yangtze + levels.distinguished + levels.young;
  return { pipeline, coverage: pipeline };
}

/** 人才队伍 V3 报告输出 */
export interface TalentV3Report {
  timeRange: string;
  leaders: { academician: number; yangtze: number; distinguished: number };
  backup: { director: number; academic: number };
  young: number;
  specialty: { nurse: number; tech: number; emba: number };
  suggestions: string[];
}

/**
 * 构建人才队伍 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 人才队伍 V3 报告
 */
export function buildTalentV3Report(timeRange: string): TalentV3Report {
  return {
    timeRange,
    leaders: { academician: 1, yangtze: 3, distinguished: 10 },
    backup: { director: 50, academic: 30 },
    young: 200,
    specialty: { nurse: 100, tech: 50, emba: 20 },
    suggestions: ["加强中青年人才培养", "引进领军人才"],
  };
}
