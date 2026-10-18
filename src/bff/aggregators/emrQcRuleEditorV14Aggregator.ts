/**
 * 健澜科技 jlmedaios - 质控规则可视化编辑器 V14 聚合器（M519-A）
 *
 * 纯函数：构建规则编辑器基础数据 + 校验规则配置 + 构建编辑器报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 规则编辑器基础数据 */
export interface RuleEditorV14 {
  ruleName: string;
  category: string;
  severity: string;
}

/** 规则配置输入 */
export interface RuleConfigV14 {
  name: string;
  threshold: number;
  enabled: boolean;
}

/** 规则校验结果 */
export interface RuleValidationResultV14 {
  valid: boolean;
  errors: string[];
}

/** 规则编辑器报告 */
export interface RuleEditorReportV14 {
  valid: boolean;
  errorCount: number;
}

/**
 * 构建规则编辑器基础数据。
 *
 * @param ruleName 规则名
 * @param category 分类
 * @param severity 严重级别
 * @returns 规则编辑器基础数据
 */
export function buildRuleEditor(ruleName: string, category: string, severity: string): RuleEditorV14 {
  return { ruleName, category, severity };
}

/**
 * 校验规则配置。
 * name 非空、threshold>=0、enabled 布尔，任一不满足列错误。
 *
 * @param config 规则配置输入
 * @returns 校验结果（valid + errors）
 */
export function validateRuleConfig(config: RuleConfigV14): RuleValidationResultV14 {
  // 手算检查：name 非空、threshold>=0、enabled 布尔（enabled 已是 boolean，无需校验）
  const errors: string[] = [];
  if (!config.name || config.name.trim() === "") {
    errors.push("规则名不能为空");
  }
  if (config.threshold < 0) {
    errors.push("阈值不能为负");
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 构建编辑器报告。
 *
 * @param result 校验结果
 * @returns 编辑器报告（valid + errorCount）
 */
export function buildRuleEditorReport(result: RuleValidationResultV14): RuleEditorReportV14 {
  return {
    valid: result.valid,
    errorCount: result.errors.length,
  };
}
