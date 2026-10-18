/**
 * 健澜科技 jlmedaios - 质控规则模拟测试 V14 聚合器（M519-C）
 *
 * 纯函数：构建模拟测试基础数据 + 运行模拟测试 + 构建模拟报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 模拟测试基础数据 */
export interface RuleSimulatorV14 {
  ruleName: string;
  testCases: number;
}

/** 模拟测试结果输入 */
export interface SimulationResultsV14 {
  pass: number;
  fail: number;
}

/** 模拟测试运行结果 */
export interface SimulationResultV14 {
  passRate: number;
  failCount: number;
}

/** 模拟报告 */
export interface SimulatorReportV14 {
  passRate: number;
  status: string;
}

/**
 * 构建模拟测试基础数据。
 *
 * @param ruleName 规则名
 * @param testCases 用例数
 * @returns 模拟测试基础数据
 */
export function buildRuleSimulator(ruleName: string, testCases: number): RuleSimulatorV14 {
  return { ruleName, testCases };
}

/**
 * 运行模拟测试。
 * passRate=pass/(pass+fail)×100，保留 1 位小数，分母为 0 返回 0；failCount=fail。
 *
 * @param simulator 模拟测试基础数据
 * @param results 模拟测试结果输入
 * @returns 运行结果（passRate + failCount）
 */
export function runRuleSimulation(simulator: RuleSimulatorV14, results: SimulationResultsV14): SimulationResultV14 {
  // 避免未使用变量警告
  void simulator;
  // 手算：passRate = pass / (pass + fail) × 100，保留 1 位小数；分母为 0 返回 0
  const total = results.pass + results.fail;
  let passRate = 0;
  if (total !== 0) {
    passRate = Math.round((results.pass / total) * 1000) / 10;
  }
  return { passRate, failCount: results.fail };
}

/**
 * 构建模拟报告。
 * passRate>=90→'通过'，>=70→'基本通过'，否则'需优化'。
 *
 * @param result 运行结果（只需 passRate）
 * @returns 模拟报告（passRate + status）
 */
export function buildRuleSimulatorReport(result: { passRate: number; failCount?: number }): SimulatorReportV14 {
  // 手算：passRate>=90→通过，>=70→基本通过，否则需优化
  let status = "需优化";
  if (result.passRate >= 90) {
    status = "通过";
  } else if (result.passRate >= 70) {
    status = "基本通过";
  }
  return { passRate: result.passRate, status };
}
