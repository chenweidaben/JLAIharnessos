/**
 * 健澜科技 jlmedaios - 病历质量科室对比 V14 聚合器（M536-C）
 *
 * 纯函数：构建科室对比基础数据 + 科室对比 + 构建对比报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室对比基础数据 */
export interface QualityCompareV14 {
  deptA: string;
  deptB: string;
}

/** 科室对比输入 */
export interface QualityCompareInputV14 {
  scoreA: number;
  scoreB: number;
}

/** 科室对比结果 */
export interface QualityCompareResultV14 {
  diff: number;
  betterDept: string;
}

/** 科室对比报告 */
export interface QualityCompareReportV14 {
  diff: number;
  betterDept: string;
}

/**
 * 构建科室对比基础数据。
 *
 * @param deptA A科室名
 * @param deptB B科室名
 * @returns 科室对比基础数据
 */
export function buildQualityCompare(deptA: string, deptB: string): QualityCompareV14 {
  return { deptA, deptB };
}

/**
 * 科室对比。
 * diff = Math.abs(scoreA - scoreB)
 * betterDept = scoreA >= scoreB ? 'A科室' : 'B科室'
 *
 * @param input 对比输入（A得分 + B得分）
 * @returns 对比结果（diff + betterDept）
 */
export function compareDeptQuality(input: QualityCompareInputV14): QualityCompareResultV14 {
  // 手算：diff = |scoreA - scoreB|
  // 测试2：scoreA=92, scoreB=78 → diff = |92-78| = 14
  // 测试3：scoreA=65, scoreB=85 → diff = |65-85| = 20
  const diff = Math.abs(input.scoreA - input.scoreB);
  // 手算：betterDept = scoreA >= scoreB ? 'A科室' : 'B科室'
  // 测试2：92 >= 78 → 'A科室'
  // 测试3：65 >= 85? false → 'B科室'
  const betterDept = input.scoreA >= input.scoreB ? "A科室" : "B科室";
  return { diff, betterDept };
}

/**
 * 构建对比报告。
 *
 * @param result 对比结果
 * @returns 对比报告（diff + betterDept 透传）
 */
export function buildQualityCompareReport(result: QualityCompareResultV14): QualityCompareReportV14 {
  // 手算：透传 diff + betterDept
  // 测试4：{diff=14.0, betterDept='A科室'} → diff=14.0, betterDept='A科室'
  return { diff: result.diff, betterDept: result.betterDept };
}
