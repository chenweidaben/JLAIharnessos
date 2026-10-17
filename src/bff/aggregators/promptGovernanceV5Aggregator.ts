/**
 * 健澜科技 jlmedaios - Prompt 工程与模板治理 V5 纯函数（M280-B）
 *
 * renderPromptV5 / versionPromptV5 / evalPromptV5 / buildPromptGovernanceV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** Prompt 模板 */
export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  systemPrompt: string;
  userTemplate: string;
  variables: string[];
  status: "draft" | "active" | "deprecated";
}

/**
 * 渲染 Prompt V5（纯函数）：将变量占位符替换为实际值。
 *
 * @param template 模板
 * @param vars 变量键值对
 * @returns 渲染后的 user prompt
 */
export function renderPromptV5(template: PromptTemplate, vars: Record<string, string>): string {
  let rendered = template.userTemplate;
  for (const key of template.variables) {
    const value = vars[key] ?? "";
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return rendered;
}

/**
 * 版本升级 V5（纯函数）：语义化版本号 minor +1。
 *
 * @param oldVer 旧版本
 * @param note 变更说明
 * @returns 新版本号
 */
export function versionPromptV5(oldVer: string, note: string): { newVersion: string; changes: string } {
  const parts = oldVer.split(".").map((p) => Number(p));
  const minor = (parts[1] ?? 0) + 1;
  const major = parts[0] ?? 1;
  return { newVersion: `${major}.${minor}.0`, changes: note };
}

/** 评测 rubric */
export interface EvalRubric {
  accuracy: number;
  completeness: number;
  safety: number;
}

/**
 * Prompt 评测 V5（纯函数）：三项加权平均，满分 100。
 *
 * @param output 输出
 * @param rubric 评分
 * @returns 综合分
 */
export function evalPromptV5(output: string, rubric: EvalRubric): { score: number; passed: boolean } {
  const score = Math.round((rubric.accuracy * 0.5 + rubric.completeness * 0.3 + rubric.safety * 0.2) * 10) / 10;
  return { score, passed: score >= 80 && output.length > 0 };
}

/** 治理看板输出 */
export interface PromptGovernanceV5Report {
  totalTemplates: number;
  activeCount: number;
  draftCount: number;
  avgEvalScore: number;
  suggestions: string[];
}

/**
 * 构建 Prompt 治理看板（纯函数）。
 *
 * @param templates 模板列表
 * @param scores 评测分数列表
 * @returns 看板
 */
export function buildPromptGovernanceV5Report(templates: PromptTemplate[], scores: number[]): PromptGovernanceV5Report {
  const activeCount = templates.filter((t) => t.status === "active").length;
  const draftCount = templates.filter((t) => t.status === "draft").length;
  const avgEvalScore = scores.length > 0
    ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10
    : 0;
  return {
    totalTemplates: templates.length,
    activeCount,
    draftCount,
    avgEvalScore,
    suggestions: avgEvalScore < 80
      ? ["平均评测分低于80，需优化Prompt并补充few-shot示例"]
      : ["Prompt质量稳定，保持版本治理"],
  };
}
