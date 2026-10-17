/**
 * 健澜科技 jlmedaios - 人才团队管理 V13 纯函数（M403-B）
 *
 * computeAcademicianAndMasterCountV13 / computeDoctoralMasterSupervisorCountV13 / computeHighLevelTalentIntroducedCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 人才团队管理记录 */
export interface TalentTeamMgmtRecordV13 {
  academicianCount: number;
  supervisorCount: number;
  highLevelCount: number;
}

/**
 * 院士及国医大师数（纯函数）：求和。
 *
 * @param records 人才团队管理记录列表
 * @returns 院士及国医大师数
 */
export function computeAcademicianAndMasterCountV13(records: TalentTeamMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.academicianCount, 0);
}

/**
 * 博导硕导数（纯函数）：求和。
 *
 * @param records 人才团队管理记录列表
 * @returns 博导硕导数
 */
export function computeDoctoralMasterSupervisorCountV13(records: TalentTeamMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.supervisorCount, 0);
}

/**
 * 高层次人才引进数（纯函数）：求和。
 *
 * @param records 人才团队管理记录列表
 * @returns 高层次人才引进数
 */
export function computeHighLevelTalentIntroducedCountV13(records: TalentTeamMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.highLevelCount, 0);
}
