/**
 * 健澜科技 jlmedaios - 模板使用统计分析 V14 聚合器（M525-C）
 *
 * 纯函数：构建使用统计基础数据 + 使用统计分析 + 构建统计报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 使用统计基础数据 */
export interface UsageStatsV14 {
  dept: string;
  period: string;
}

/** 统计分析输入 */
export interface UsageStatsInputV14 {
  templateName: string;
  usedCount: number;
  totalRecords: number;
}

/** 统计分析结果 */
export interface UsageStatsResultV14 {
  usageRate: number;
  popularity: string;
}

/** 统计报告 */
export interface UsageStatsReportV14 {
  usageRate: number;
  popularity: string;
}

/**
 * 构建使用统计基础数据。
 *
 * @param dept 科室
 * @param period 统计周期
 * @returns 使用统计基础数据
 */
export function buildUsageStats(dept: string, period: string): UsageStatsV14 {
  return { dept, period };
}

/**
 * 使用统计分析。
 * usageRate = Math.round(usedCount/totalRecords*1000)/10 保留 1 位小数；
 * usageRate >= 80 → '高频使用'，>= 50 → '中频使用'，>= 20 → '低频使用'，否则 '极少使用'。
 *
 * @param input 统计分析输入（模板名 + 使用次数 + 总记录数）
 * @returns 统计分析结果（usageRate + popularity）
 */
export function analyzeTemplateUsage(input: UsageStatsInputV14): UsageStatsResultV14 {
  // 手算：usageRate = Math.round(usedCount/totalRecords*1000)/10 保留 1 位小数
  // 测试2：usedCount=420, totalRecords=500 → 420/500=0.84 → 0.84*1000=840 → Math.round(840)/10 = 84.0
  // 测试3：usedCount=150, totalRecords=300 → 150/300=0.5 → 0.5*1000=500 → Math.round(500)/10 = 50.0
  const totalRecords = input.totalRecords > 0 ? input.totalRecords : 1;
  const usageRate = Math.round((input.usedCount / totalRecords) * 1000) / 10;
  // 手算：usageRate >= 80 → '高频使用'，>= 50 → '中频使用'，>= 20 → '低频使用'，否则 '极少使用'
  // 测试2：84.0 >= 80 → popularity='高频使用'
  // 测试3：50.0 >= 50 → popularity='中频使用'
  let popularity: string;
  if (usageRate >= 80) {
    popularity = "高频使用";
  } else if (usageRate >= 50) {
    popularity = "中频使用";
  } else if (usageRate >= 20) {
    popularity = "低频使用";
  } else {
    popularity = "极少使用";
  }
  return { usageRate, popularity };
}

/**
 * 构建统计报告。
 *
 * @param result 统计分析结果
 * @returns 统计报告（usageRate + popularity 透传）
 */
export function buildUsageStatsReport(result: UsageStatsResultV14): UsageStatsReportV14 {
  // 手算：透传 usageRate + popularity
  // 测试4：{usageRate:84.0, popularity:'高频使用'} → usageRate=84.0, popularity='高频使用'
  return { usageRate: result.usageRate, popularity: result.popularity };
}
