/**
 * 健澜科技 jlmedaios - 质控规则版本管理 V14 聚合器（M519-B）
 *
 * 纯函数：构建规则版本基础数据 + 对比规则版本 + 构建版本报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 规则版本基础数据 */
export interface RuleVersionV14 {
  ruleName: string;
  version: string;
  changeLog: string;
}

/** 规则版本对比入参 */
export interface RuleVersionCompareV14 {
  threshold: number;
  enabled: boolean;
}

/** 规则版本对比结果 */
export interface RuleVersionCompareResultV14 {
  changedFields: string[];
  isBreaking: boolean;
}

/** 规则版本报告 */
export interface RuleVersionReportV14 {
  changeCount: number;
  isBreaking: boolean;
}

/**
 * 构建规则版本基础数据。
 *
 * @param ruleName 规则名
 * @param version 版本号
 * @param changeLog 变更日志
 * @returns 规则版本基础数据
 */
export function buildRuleVersion(ruleName: string, version: string, changeLog: string): RuleVersionV14 {
  return { ruleName, version, changeLog };
}

/**
 * 对比规则版本。
 * threshold 变化→'threshold'，enabled 变化→'enabled'；任一变化即 changedFields；enabled 从 true→false 即 breaking。
 *
 * @param oldVersion 旧版本
 * @param newVersion 新版本
 * @returns 对比结果（changedFields + isBreaking）
 */
export function compareRuleVersions(oldVersion: RuleVersionCompareV14, newVersion: RuleVersionCompareV14): RuleVersionCompareResultV14 {
  // 手算检查：threshold 或 enabled 变化即列入 changedFields
  const changedFields: string[] = [];
  if (oldVersion.threshold !== newVersion.threshold) {
    changedFields.push("threshold");
  }
  if (oldVersion.enabled !== newVersion.enabled) {
    changedFields.push("enabled");
  }
  // 手算：enabled 从 true→false 即 breaking
  const isBreaking = oldVersion.enabled === true && newVersion.enabled === false;
  return { changedFields, isBreaking };
}

/**
 * 构建版本报告。
 *
 * @param result 对比结果
 * @returns 版本报告（changeCount + isBreaking）
 */
export function buildRuleVersionReport(result: RuleVersionCompareResultV14): RuleVersionReportV14 {
  return {
    changeCount: result.changedFields.length,
    isBreaking: result.isBreaking,
  };
}
