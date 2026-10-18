/**
 * 健澜科技 jlmedaios - 病历模板质控联动 V14 聚合器（M477-D，M477 收官）
 *
 * 纯函数：模板-质控规则关联构建 + 规则查询。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 模板-质控规则关联 */
export interface TemplateQcLinkV14 {
  templateId: string;
  templateName: string;
  rules: string[];
}

/**
 * 构建模板-质控规则关联。
 *
 * @param templateId 模板 ID
 * @param templateName 模板名
 * @param rules 关联质控规则列表
 * @returns 模板-质控规则关联
 */
export function buildTemplateQcLink(templateId: string, templateName: string, rules: string[]): TemplateQcLinkV14 {
  return { templateId, templateName, rules: [...rules] };
}

/**
 * 根据模板 ID 查关联质控规则。
 *
 * @param links 关联列表
 * @param templateId 模板 ID
 * @returns 关联规则列表（未找到返回空数组）
 */
export function getQcRulesForTemplate(links: TemplateQcLinkV14[], templateId: string): string[] {
  const link = links.find((l) => l.templateId === templateId);
  return link ? [...link.rules] : [];
}
