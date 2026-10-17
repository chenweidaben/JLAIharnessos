/**
 * 健澜科技 jlmedaios - 人才发展 V13 纯函数（M397-B）
 *
 * computeHighLevelTalentCountV13 / computeTitleStructureCompositionV13 / computeTalentTrainingPlanCompletionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 职称结构构成 */
export interface TitleStructureCompositionV13 {
  senior: number;
  deputySenior: number;
  intermediate: number;
  junior: number;
}

/** 人才发展记录 */
export interface TalentDevelopmentRecordV13 {
  highLevelCount: number;
  senior: number;
  deputySenior: number;
  intermediate: number;
  junior: number;
  completedCount: number;
  plannedCount: number;
}

/**
 * 高层次人才数（纯函数）：求和。
 *
 * @param records 人才发展记录列表
 * @returns 高层次人才数
 */
export function computeHighLevelTalentCountV13(records: TalentDevelopmentRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.highLevelCount, 0);
}

/**
 * 职称结构构成（纯函数）：返回各级别职称人数的聚合对象。
 *
 * @param records 人才发展记录列表
 * @returns 职称结构构成 {senior, deputySenior, intermediate, junior}
 */
export function computeTitleStructureCompositionV13(records: TalentDevelopmentRecordV13[]): TitleStructureCompositionV13 {
  if (records.length === 0) return { senior: 0, deputySenior: 0, intermediate: 0, junior: 0 };
  return {
    senior: records.reduce((acc, r) => acc + r.senior, 0),
    deputySenior: records.reduce((acc, r) => acc + r.deputySenior, 0),
    intermediate: records.reduce((acc, r) => acc + r.intermediate, 0),
    junior: records.reduce((acc, r) => acc + r.junior, 0),
  };
}

/**
 * 人才培养计划完成率（纯函数）：已完成人数/计划人数×100，保留 2 位小数。
 *
 * @param records 人才发展记录列表
 * @returns 人才培养计划完成率百分比
 */
export function computeTalentTrainingPlanCompletionRateV13(records: TalentDevelopmentRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.plannedCount, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedCount, 0);
  return Math.round((completed / total) * 10000) / 100;
}
