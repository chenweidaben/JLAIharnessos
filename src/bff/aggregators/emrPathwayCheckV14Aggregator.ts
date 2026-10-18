/**
 * 健澜科技 jlmedaios - 病历临床路径符合性检查 V14 聚合器（M537-B）
 *
 * 纯函数：构建路径检查基础数据 + 路径符合性检查 + 构建路径报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 路径检查基础数据 */
export interface PathwayCheckV14 {
  recordId: string;
  pathwayName: string;
}

/** 路径检查输入 */
export interface PathwayCheckInputV14 {
  expectedSteps: number;
  actualSteps: number;
  deviationDays: number;
}

/** 路径检查结果 */
export interface PathwayCheckResultV14 {
  compliant: boolean;
  complianceRate: number;
}

/** 路径检查报告 */
export interface PathwayCheckReportV14 {
  compliant: boolean;
  complianceRate: number;
}

/**
 * 构建路径检查基础数据。
 *
 * @param recordId 病历ID
 * @param pathwayName 路径名
 * @returns 路径检查基础数据
 */
export function buildPathwayCheck(recordId: string, pathwayName: string): PathwayCheckV14 {
  return { recordId, pathwayName };
}

/**
 * 路径符合性检查。
 * complianceRate = expectedSteps > 0 ? Math.round((1 - Math.abs(actualSteps - expectedSteps) / expectedSteps) * 1000) / 10 : 100
 * compliant = complianceRate >= 80 && deviationDays <= 2
 *
 * @param input 检查输入（预期步骤 + 实际步骤 + 偏差天数）
 * @returns 检查结果（compliant + complianceRate）
 */
export function checkPathwayCompliance(input: PathwayCheckInputV14): PathwayCheckResultV14 {
  // 手算：complianceRate = (1 - |实际-预期| / 预期) × 100 保留1位小数
  // 测试2：expectedSteps=10, actualSteps=9 → |9-10|/10 = 1/10 = 0.1
  //   complianceRate = Math.round((1-0.1)*1000)/10 = Math.round(0.9*1000)/10 = Math.round(900)/10 = 900/10 = 90.0
  // 测试3：expectedSteps=10, actualSteps=6 → |6-10|/10 = 4/10 = 0.4
  //   complianceRate = Math.round((1-0.4)*1000)/10 = Math.round(0.6*1000)/10 = Math.round(600)/10 = 600/10 = 60.0
  const complianceRate = input.expectedSteps > 0
    ? Math.round((1 - Math.abs(input.actualSteps - input.expectedSteps) / input.expectedSteps) * 1000) / 10
    : 100;
  // 手算：compliant = complianceRate >= 80 && deviationDays <= 2
  // 测试2：complianceRate=90.0 >= 80, deviationDays=1 <= 2 → compliant=true
  // 测试3：complianceRate=60.0 >= 80? false → compliant=false
  const compliant = complianceRate >= 80 && input.deviationDays <= 2;
  return { compliant, complianceRate };
}

/**
 * 构建路径报告。
 *
 * @param result 检查结果
 * @returns 路径报告（compliant + complianceRate 透传）
 */
export function buildPathwayCheckReport(result: PathwayCheckResultV14): PathwayCheckReportV14 {
  // 手算：透传 compliant + complianceRate
  // 测试4：{compliant=true, complianceRate=90.0} → compliant=true, complianceRate=90.0
  return { compliant: result.compliant, complianceRate: result.complianceRate };
}
