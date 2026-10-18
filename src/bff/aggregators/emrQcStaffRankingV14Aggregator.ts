/**
 * 健澜科技 jlmedaios - 质控全院人员排名 V14 聚合器（M494-D，M494 收官）
 *
 * 纯函数：人员排名构建 + 全院人员按评分降序排名。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 人员排名 */
export interface StaffRankingV14 {
  staff: string;
  score: number;
  rank: number;
}

/** 人员评分输入 */
export interface StaffScoreV14 {
  staff: string;
  score: number;
}

/**
 * 构建人员排名。
 *
 * @param staff 人员姓名
 * @param score 评分
 * @param rank 排名
 * @returns 人员排名
 */
export function buildStaffRanking(staff: string, score: number, rank: number): StaffRankingV14 {
  return { staff, score, rank };
}

/**
 * 全院人员按评分降序排名。
 *
 * @param staffs 人员评分列表
 * @returns 排名结果（含 rank，从 1 开始）
 */
export function rankStaff(staffs: StaffScoreV14[]): StaffRankingV14[] {
  // 手算：按 score 降序排列，rank 从 1 开始
  const sorted = [...staffs].sort((a, b) => b.score - a.score);
  return sorted.map((s, index) => buildStaffRanking(s.staff, s.score, index + 1));
}
