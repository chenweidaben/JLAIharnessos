/**
 * 健澜科技 jlmedaios - 病历结构化数据统计 V14 聚合器（M532-C）
 *
 * 纯函数：构建统计基础数据 + 结构化统计 + 构建统计报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 统计基础数据 */
export interface StructStatsV14 {
  dept: string;
  period: string;
}

/** 统计输入 */
export interface StructStatsInputV14 {
  totalRecords: number;
  structuredRecords: number;
}

/** 统计结果 */
export interface StructStatsResultV14 {
  structRate: number;
  gap: number;
}

/** 统计报告 */
export interface StructStatsReportV14 {
  structRate: number;
  gap: number;
}

/**
 * 构建统计基础数据。
 *
 * @param dept 科室
 * @param period 周期
 * @returns 统计基础数据
 */
export function buildStructStats(dept: string, period: string): StructStatsV14 {
  return { dept, period };
}

/**
 * 结构化统计。
 * structRate = totalRecords > 0 ? Math.round(structuredRecords / totalRecords * 1000) / 10 : 0（保留1位小数）；
 * gap = totalRecords - structuredRecords。
 *
 * @param input 统计输入（总记录数 + 结构化记录数）
 * @returns 统计结果（structRate + gap）
 */
export function computeStructStats(input: StructStatsInputV14): StructStatsResultV14 {
  // 手算：structRate = totalRecords > 0 ? Math.round(structuredRecords / totalRecords * 1000) / 10 : 0
  // 测试2：450/500*1000 = 900 → Math.round=900 → 900/10=90.0
  // 测试3：120/300*1000 = 400 → Math.round=400 → 400/10=40.0
  const structRate =
    input.totalRecords > 0
      ? Math.round((input.structuredRecords / input.totalRecords) * 1000) / 10
      : 0;
  // 手算：gap = totalRecords - structuredRecords
  // 测试2：500-450 = 50
  // 测试3：300-120 = 180
  const gap = input.totalRecords - input.structuredRecords;
  return { structRate, gap };
}

/**
 * 构建统计报告。
 *
 * @param result 统计结果
 * @returns 统计报告（structRate + gap 透传）
 */
export function buildStructStatsReport(result: StructStatsResultV14): StructStatsReportV14 {
  // 手算：透传 structRate + gap
  // 测试4：{structRate:90.0, gap:50} → structRate=90.0, gap=50
  return { structRate: result.structRate, gap: result.gap };
}
