/**
 * 健澜科技 jlmedaios - 科室质控排名（避让版）V14 聚合器（M542-B）
 *
 * 纯函数：构建科室排名基础数据 + 科室排名 + 构建排名报告。
 * 避让说明：M493-C 已有 emrQcDeptRankingV14（-ranking 后缀，同主题），本片采用 -list 后缀避让（emrQcDeptRankListV14）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室排名基础数据 */
export interface QcDeptRankListV14 {
  month: string;
}

/** 科室排名输入 */
export interface QcDeptRankListInputV14 {
  depts: { name: string; score: number }[];
}

/** 科室排名结果 */
export interface QcDeptRankListResultV14 {
  topDept: string;
  rankCount: number;
}

/** 排名报告 */
export interface QcDeptRankListReportV14 {
  topDept: string;
  rankCount: number;
}

/**
 * 构建科室排名基础数据。
 *
 * @param month 月份
 * @returns 科室排名基础数据
 */
export function buildQcDeptRankList(month: string): QcDeptRankListV14 {
  return { month };
}

/**
 * 科室排名。
 * rankCount = depts.length
 * topDept = depts.length>0 ? depts.reduce((best, d)=>d.score>best.score?d:best).name : '无科室'
 *
 * @param input 排名输入（科室列表）
 * @returns 排名结果（topDept + rankCount）
 */
export function rankQcDeptList(input: QcDeptRankListInputV14): QcDeptRankListResultV14 {
  // 手算：rankCount = depts.length
  // 测试2：depts=[心内科95, 呼吸科88, 普外科92] → rankCount=3
  // 测试3：depts=[] → rankCount=0
  const rankCount = input.depts.length;
  // 手算：topDept = depts.length>0 ? reduce 最高分科室名 : '无科室'
  // 测试2：心内科95 > 呼吸科88 → best=心内科95；心内科95 > 普外科92 → best=心内科95 → topDept='心内科'
  // 测试3：depts=[] → topDept='无科室'
  const topDept = input.depts.length > 0
    ? input.depts.reduce((best, d) => (d.score > best.score ? d : best)).name
    : "无科室";
  return { topDept, rankCount };
}

/**
 * 构建排名报告。
 *
 * @param result 排名结果
 * @returns 排名报告（topDept + rankCount 透传）
 */
export function buildQcDeptRankListReport(result: QcDeptRankListResultV14): QcDeptRankListReportV14 {
  // 手算：透传 topDept + rankCount
  // 测试4：{topDept='心内科', rankCount=3} → topDept='心内科', rankCount=3
  return { topDept: result.topDept, rankCount: result.rankCount };
}
