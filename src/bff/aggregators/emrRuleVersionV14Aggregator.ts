/**
 * 健澜科技 jlmedaios - 病历质控规则版本管理 V14 聚合器（M472-B）
 *
 * 纯函数：版本历史按日期降序排列 + 两版本变更差集对比。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 版本条目 */
export interface VersionEntryV14 {
  version: string;
  changes: string;
  date: string;
}

/** 版本历史 */
export interface VersionHistoryV14 {
  ruleId: string;
  versions: VersionEntryV14[];
}

/** 版本对比结果 */
export interface VersionDiffV14 {
  added: string[];
  removed: string[];
}

/**
 * 按 date 降序排列版本历史。
 *
 * @param ruleId 规则 ID
 * @param versions 版本列表
 * @returns 版本历史（降序）
 */
export function buildVersionHistory(ruleId: string, versions: VersionEntryV14[]): VersionHistoryV14 {
  const sorted = [...versions].sort((a, b) => b.date.localeCompare(a.date));
  return { ruleId, versions: sorted };
}

/**
 * 对比两版本 changes 字符串的差异（按逗号分割求差集）。
 * added = v2 有但 v1 没有的关键词
 * removed = v1 有但 v2 没有的关键词
 *
 * @param v1 旧版本
 * @param v2 新版本
 * @returns 对比结果
 */
export function compareVersions(
  v1: Pick<VersionEntryV14, "changes">,
  v2: Pick<VersionEntryV14, "changes">,
): VersionDiffV14 {
  const v1Set = new Set(v1.changes.split(",").map((s) => s.trim()).filter(Boolean));
  const v2Set = new Set(v2.changes.split(",").map((s) => s.trim()).filter(Boolean));
  const added: string[] = [];
  const removed: string[] = [];
  v2Set.forEach((item) => {
    if (!v1Set.has(item)) added.push(item);
  });
  v1Set.forEach((item) => {
    if (!v2Set.has(item)) removed.push(item);
  });
  return { added, removed };
}
