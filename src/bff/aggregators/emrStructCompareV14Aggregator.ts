/**
 * 健澜科技 jlmedaios - 病历结构化数据对比 V14 聚合器（M532-D，M532 收官）
 *
 * 纯函数：构建对比基础数据 + 结构化对比 + 构建对比报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 对比基础数据 */
export interface StructCompareV14 {
  deptA: string;
  deptB: string;
}

/** 对比输入 */
export interface StructCompareInputV14 {
  deptARate: number;
  deptBRate: number;
}

/** 对比结果 */
export interface StructCompareResultV14 {
  diff: number;
  betterDept: string;
}

/** 对比报告 */
export interface StructCompareReportV14 {
  diff: number;
  betterDept: string;
}

/**
 * 构建对比基础数据。
 *
 * @param deptA A科室
 * @param deptB B科室
 * @returns 对比基础数据
 */
export function buildStructCompare(deptA: string, deptB: string): StructCompareV14 {
  return { deptA, deptB };
}

/**
 * 结构化对比。
 * diff = Math.abs(deptARate - deptBRate)；betterDept = deptARate >= deptBRate ? 'A科室' : 'B科室'。
 *
 * @param input 对比输入（A科室结构化率 + B科室结构化率）
 * @returns 对比结果（diff + betterDept）
 */
export function compareStructRecords(input: StructCompareInputV14): StructCompareResultV14 {
  // 手算：diff = Math.abs(deptARate - deptBRate)
  // 测试2：Math.abs(92.0 - 78.0) = 14.0
  // 测试3：Math.abs(65.0 - 85.0) = 20.0
  const diff = Math.abs(input.deptARate - input.deptBRate);
  // 手算：betterDept = deptARate >= deptBRate ? 'A科室' : 'B科室'
  // 测试2：92.0 >= 78.0 → betterDept='A科室'
  // 测试3：65.0 >= 85.0 = false → betterDept='B科室'
  const betterDept = input.deptARate >= input.deptBRate ? "A科室" : "B科室";
  return { diff, betterDept };
}

/**
 * 构建对比报告。
 *
 * @param result 对比结果
 * @returns 对比报告（diff + betterDept 透传）
 */
export function buildStructCompareReport(result: StructCompareResultV14): StructCompareReportV14 {
  // 手算：透传 diff + betterDept
  // 测试4：{diff:14.0, betterDept:'A科室'} → diff=14.0, betterDept='A科室'
  return { diff: result.diff, betterDept: result.betterDept };
}
