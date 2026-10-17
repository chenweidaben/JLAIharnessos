/**
 * 健澜科技 jlmedaios - 继续教育 V13（覆盖率）纯函数（M361-C）
 *
 * computeContinuingEduHoursCompletionRateV13 / computeContinuingEduProjectPassRateV13 / computeContinuingEduCoverageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 继续教育（覆盖率）记录 */
export interface ContinuingEduCoverageRecordV13 {
  completedHours: number;
  requiredHours: number;
  passedProjects: number;
  attendedProjects: number;
  coveredPersons: number;
  requiredPersons: number;
}

/**
 * 继教学时完成率（纯函数）：完成学时/要求学时×100，保留 2 位小数。
 *
 * @param records 继续教育记录列表
 * @returns 继教学时完成率百分比
 */
export function computeContinuingEduHoursCompletionRateV13(records: ContinuingEduCoverageRecordV13[]): number {
  const completed = records.reduce((acc, r) => acc + r.completedHours, 0);
  const required = records.reduce((acc, r) => acc + r.requiredHours, 0);
  if (required === 0) return 0;
  return Math.round((completed / required) * 10000) / 100;
}

/**
 * 继教项目通过率（纯函数）：通过项目数/参加项目数×100，保留 2 位小数。
 *
 * @param records 继续教育记录列表
 * @returns 继教项目通过率百分比
 */
export function computeContinuingEduProjectPassRateV13(records: ContinuingEduCoverageRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.passedProjects, 0);
  const attended = records.reduce((acc, r) => acc + r.attendedProjects, 0);
  if (attended === 0) return 0;
  return Math.round((passed / attended) * 10000) / 100;
}

/**
 * 继教覆盖率（纯函数）：参加继教人数/应参加人数×100，保留 2 位小数。
 *
 * @param records 继续教育记录列表
 * @returns 继教覆盖率百分比
 */
export function computeContinuingEduCoverageRateV13(records: ContinuingEduCoverageRecordV13[]): number {
  const covered = records.reduce((acc, r) => acc + r.coveredPersons, 0);
  const required = records.reduce((acc, r) => acc + r.requiredPersons, 0);
  if (required === 0) return 0;
  return Math.round((covered / required) * 10000) / 100;
}
