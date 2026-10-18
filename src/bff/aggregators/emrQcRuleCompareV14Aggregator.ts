/**
 * 健澜科技 jlmedaios - 质控规则对比分析 V14 聚合器（M519-D，M519 收官）
 *
 * 纯函数：构建规则对比基础数据 + 对比两套规则集 + 构建对比报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 规则对比基础数据 */
export interface RuleCompareV14 {
  deptA: string;
  deptB: string;
  ruleName: string;
}

/** 规则集输入 */
export interface RuleSetV14 {
  dept: string;
  passRate: number;
  ruleCount: number;
}

/** 规则集对比结果 */
export interface RuleCompareResultV14 {
  passRateDiff: number;
  ruleCountDiff: number;
  betterDept: string;
}

/** 规则对比报告 */
export interface RuleCompareReportV14 {
  conclusion: string;
}

/**
 * 构建规则对比基础数据。
 *
 * @param deptA 科室A
 * @param deptB 科室B
 * @param ruleName 规则名
 * @returns 规则对比基础数据
 */
export function buildRuleCompare(deptA: string, deptB: string, ruleName: string): RuleCompareV14 {
  return { deptA, deptB, ruleName };
}

/**
 * 对比两套规则集。
 * passRateDiff=setB.passRate-setA.passRate，保留 1 位小数；ruleCountDiff=setB.ruleCount-setA.ruleCount；setB.passRate>=setA.passRate→betterDept=setB.dept，否则 setA.dept。
 *
 * @param setA 规则集A
 * @param setB 规则集B
 * @returns 对比结果（passRateDiff + ruleCountDiff + betterDept）
 */
export function compareRuleSets(setA: RuleSetV14, setB: RuleSetV14): RuleCompareResultV14 {
  // 手算：passRateDiff = setB.passRate - setA.passRate，保留 1 位小数
  const passRateDiff = Math.round((setB.passRate - setA.passRate) * 10) / 10;
  // 手算：ruleCountDiff = setB.ruleCount - setA.ruleCount
  const ruleCountDiff = setB.ruleCount - setA.ruleCount;
  // 手算：setB.passRate >= setA.passRate → betterDept=setB.dept，否则 setA.dept（相等时取 B）
  const betterDept = setB.passRate >= setA.passRate ? setB.dept : setA.dept;
  return { passRateDiff, ruleCountDiff, betterDept };
}

/**
 * 构建对比报告。
 *
 * @param result 对比结果（只需 passRateDiff + betterDept）
 * @returns 对比报告（conclusion）
 */
export function buildRuleCompareReport(result: { passRateDiff: number; betterDept: string; ruleCountDiff?: number }): RuleCompareReportV14 {
  // 手算：结论包含优势科室
  const conclusion = `${result.betterDept}表现更优（通过率差 ${result.passRateDiff}%）`;
  return { conclusion };
}
