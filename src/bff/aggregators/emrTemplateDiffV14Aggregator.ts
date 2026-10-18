/**
 * 健澜科技 jlmedaios - 病历模板版本对比 V14 聚合器（M466-C）
 *
 * 纯函数：两版本字段 key 列表差集对比 + 变更摘要生成。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 模板版本 */
export interface TemplateVersionV14 {
  version: string;
  fields: string[];
}

/** 版本差异结果 */
export interface TemplateDiffV14 {
  added: string[];
  removed: string[];
  changed: string[];
}

/**
 * 对比两版本字段列表，求差集。
 *
 * @param v1 旧版本
 * @param v2 新版本
 * @returns 差异结果（added/removed/changed）
 */
export function diffTemplates(v1: TemplateVersionV14, v2: TemplateVersionV14): TemplateDiffV14 {
  const v1Set = new Set(v1.fields);
  const v2Set = new Set(v2.fields);
  const added = v2.fields.filter((f) => !v1Set.has(f));
  const removed = v1.fields.filter((f) => !v2Set.has(f));
  const changed: string[] = [];
  return { added, removed, changed };
}

/**
 * 生成变更摘要文本。
 *
 * @param diff 差异结果
 * @returns 摘要字符串
 */
export function summarizeChanges(diff: TemplateDiffV14): string {
  const parts: string[] = [];
  if (diff.added.length > 0) parts.push(`新增 ${diff.added.length} 个字段`);
  if (diff.removed.length > 0) parts.push(`删除 ${diff.removed.length} 个字段`);
  if (diff.changed.length > 0) parts.push(`修改 ${diff.changed.length} 个字段`);
  return parts.length > 0 ? parts.join("，") : "两版本无差异";
}
