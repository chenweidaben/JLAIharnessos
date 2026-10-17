/**
 * 健澜科技 jlmedaios - 退役经验存档与复用 V13 纯函数（M305-C）
 *
 * archiveRetiredExperienceV13 / searchArchivedV13 / resurrectExperienceV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 归档经验 */
export interface ArchivedExpV13 {
  experienceId: string;
  title: string;
  status: "retired" | "archived" | "active";
  retireReason: string;
  version: number;
}

/**
 * 归档（纯函数）：status="archived"，保留原文+退役原因。
 *
 * @param exp 经验
 * @returns 归档后
 */
export function archiveRetiredExperienceV13(exp: ArchivedExpV13): ArchivedExpV13 {
  return { ...exp, status: "archived" };
}

/**
 * 归档检索（纯函数）：按标题关键词模糊匹配。
 *
 * @param query 关键词
 * @param archivedList 归档列表
 * @returns 命中
 */
export function searchArchivedV13(query: string, archivedList: ArchivedExpV13[]): ArchivedExpV13[] {
  if (!query) return [];
  return archivedList.filter((e) => e.title.includes(query));
}

/**
 * 复活（纯函数）：有新证据 → status="active"，版本+1。
 *
 * @param archived 归档经验
 * @param newEvidence 新证据（非空表示有新证据）
 * @returns 复活后经验
 */
export function resurrectExperienceV13(archived: ArchivedExpV13, newEvidence: string): ArchivedExpV13 {
  if (!newEvidence) return archived;
  return { ...archived, status: "active", version: archived.version + 1, retireReason: "" };
}
