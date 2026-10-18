/**
 * 健澜科技 jlmedaios - 病历质量改进建议 V14 聚合器（M536-D）
 *
 * 纯函数：构建改进建议基础数据 + 改进建议生成 + 构建改进报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 改进建议基础数据 */
export interface QualityImproveV14 {
  dept: string;
  recordId: string;
}

/** 改进建议输入 */
export interface QualityImproveInputV14 {
  score: number;
  block: number;
  major: number;
  minor: number;
}

/** 改进建议结果 */
export interface QualityImproveResultV14 {
  suggestions: string[];
  priority: string;
}

/** 改进建议报告 */
export interface QualityImproveReportV14 {
  suggestions: string[];
  priority: string;
}

/**
 * 构建改进建议基础数据。
 *
 * @param dept 科室
 * @param recordId 病历ID
 * @returns 改进建议基础数据
 */
export function buildQualityImprove(dept: string, recordId: string): QualityImproveV14 {
  return { dept, recordId };
}

/**
 * 改进建议生成。
 * suggestions 初始空数组；依次检查 3 个条件：
 *   1) block > 0 → suggestions.push('存在阻断项，需立即整改')
 *   2) major > 0 → suggestions.push('存在主要缺陷，需限期整改')
 *   3) minor > 0 → suggestions.push('存在次要缺陷，建议优化')
 * priority = block > 0 ? '高' : major > 0 ? '中' : '低'
 *
 * @param input 建议输入（综合得分 + 阻断数 + 主要缺陷数 + 次要缺陷数）
 * @returns 建议结果（suggestions + priority）
 */
export function suggestQualityImprovement(input: QualityImproveInputV14): QualityImproveResultV14 {
  const suggestions: string[] = [];
  // 手算：条件1 block > 0 → '存在阻断项，需立即整改'
  // 测试2：block=1 → 1>0=true → 加入
  // 测试3：block=0 → 0>0=false → 不加入
  if (input.block > 0) {
    suggestions.push("存在阻断项，需立即整改");
  }
  // 手算：条件2 major > 0 → '存在主要缺陷，需限期整改'
  // 测试2：major=2 → 2>0=true → 加入
  // 测试3：major=0 → 0>0=false → 不加入
  if (input.major > 0) {
    suggestions.push("存在主要缺陷，需限期整改");
  }
  // 手算：条件3 minor > 0 → '存在次要缺陷，建议优化'
  // 测试2：minor=3 → 3>0=true → 加入
  // 测试3：minor=1 → 1>0=true → 加入
  if (input.minor > 0) {
    suggestions.push("存在次要缺陷，建议优化");
  }
  // 手算：priority = block>0→高 / major>0→中 / 否则→低
  // 测试2：block=1>0 → '高'
  // 测试3：block=0, major=0 → '低'
  const priority = input.block > 0 ? "高" : input.major > 0 ? "中" : "低";
  return { suggestions, priority };
}

/**
 * 构建改进报告。
 *
 * @param result 建议结果
 * @returns 改进报告（suggestions + priority 透传）
 */
export function buildQualityImproveReport(result: QualityImproveResultV14): QualityImproveReportV14 {
  // 手算：透传 suggestions + priority
  // 测试4：{suggestions=['存在阻断项，需立即整改','存在主要缺陷，需限期整改','存在次要缺陷，建议优化'], priority='高'} → 透传
  return { suggestions: result.suggestions, priority: result.priority };
}
