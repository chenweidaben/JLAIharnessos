/**
 * 健澜科技 jlmedaios - 个人质控档案自动生成 V14 聚合器（M518-B）
 *
 * 纯函数：构建个人档案基础数据 + 生成个人档案统计 + 构建档案摘要。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 个人档案基础数据 */
export interface PersonalProfileV14 {
  doctor: string;
  dept: string;
  totalRecords: number;
}

/** 个人档案统计输入 */
export interface PersonalProfileStatsV14 {
  passRate: number;
  defectCount: number;
  complianceRate: number;
}

/** 个人档案生成结果 */
export interface PersonalProfileResultV14 {
  passRate: number;
  defectCount: number;
  complianceRate: number;
}

/** 个人档案摘要 */
export interface PersonalProfileSummaryV14 {
  grade: string;
}

/**
 * 构建个人档案基础数据。
 *
 * @param doctor 医生姓名
 * @param dept 科室
 * @param totalRecords 病历总数
 * @returns 个人档案基础数据
 */
export function buildPersonalProfile(doctor: string, dept: string, totalRecords: number): PersonalProfileV14 {
  return { doctor, dept, totalRecords };
}

/**
 * 生成个人档案统计。
 * passRate/complianceRate 保留 1 位小数，clamp 0-100。
 *
 * @param profile 个人档案基础数据
 * @param stats 统计输入
 * @returns 个人档案生成结果（passRate + defectCount + complianceRate）
 */
export function generatePersonalProfile(profile: PersonalProfileV14, stats: PersonalProfileStatsV14): PersonalProfileResultV14 {
  // 手算：clamp 0-100，保留 1 位小数
  let passRate = Math.round(Math.min(100, Math.max(0, stats.passRate)) * 10) / 10;
  let complianceRate = Math.round(Math.min(100, Math.max(0, stats.complianceRate)) * 10) / 10;
  // 避免未使用变量警告
  void profile;
  return {
    passRate,
    defectCount: stats.defectCount,
    complianceRate,
  };
}

/**
 * 构建档案摘要。
 * passRate>=90→'优秀'，>=80→'良好'，>=70→'合格'，否则'待改进'。
 *
 * @param result 个人档案生成结果（只需 passRate）
 * @returns 档案摘要（grade）
 */
export function buildPersonalProfileSummary(result: { passRate: number; complianceRate?: number }): PersonalProfileSummaryV14 {
  // 手算：passRate>=90→优秀，>=80→良好，>=70→合格，否则待改进
  let grade = "待改进";
  if (result.passRate >= 90) {
    grade = "优秀";
  } else if (result.passRate >= 80) {
    grade = "良好";
  } else if (result.passRate >= 70) {
    grade = "合格";
  }
  return { grade };
}
