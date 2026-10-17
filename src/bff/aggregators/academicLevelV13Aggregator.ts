/**
 * 健澜科技 jlmedaios - 学术水平 V13 纯函数（M403-D，M403 收官）
 *
 * computeNationalAcademicSocietyPositionCountV13 / computeSCIPaperCountV13 / computeNationalResearchProjectCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 学术水平记录 */
export interface AcademicLevelRecordV13 {
  nationalPosition: number;
  sciPaper: number;
  nationalProject: number;
}

/**
 * 国家级学会任职数（纯函数）：求和。
 *
 * @param records 学术水平记录列表
 * @returns 国家级学会任职数
 */
export function computeNationalAcademicSocietyPositionCountV13(records: AcademicLevelRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.nationalPosition, 0);
}

/**
 * SCI 论文数（纯函数）：求和。
 *
 * @param records 学术水平记录列表
 * @returns SCI 论文数
 */
export function computeSCIPaperCountV13(records: AcademicLevelRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.sciPaper, 0);
}

/**
 * 国家级课题立项数（纯函数）：求和。
 *
 * @param records 学术水平记录列表
 * @returns 国家级课题立项数
 */
export function computeNationalResearchProjectCountV13(records: AcademicLevelRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.nationalProject, 0);
}
