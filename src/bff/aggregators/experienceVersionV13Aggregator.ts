/**
 * 健澜科技 jlmedaios - 经验更新与版本迭代 V13 纯函数（M296-C）
 *
 * createNewVersionV13 / getVersionHistoryV13 / compareVersionsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 经验版本 */
export interface ExperienceVersionV13 {
  experienceId: string;
  version: number;
  title: string;
  content: string;
  authorId: string;
  archived: boolean;
}

/**
 * 生成新版本（纯函数）：version+1，旧版本 archived=true。
 *
 * @param oldExperience 旧版本
 * @param newContent 新内容
 * @param authorId 作者
 * @returns 新版本
 */
export function createNewVersionV13(
  oldExperience: ExperienceVersionV13,
  newContent: string,
  authorId: string,
): ExperienceVersionV13 {
  return {
    experienceId: oldExperience.experienceId,
    version: oldExperience.version + 1,
    title: oldExperience.title,
    content: newContent,
    authorId,
    archived: false,
  };
}

/**
 * 版本历史（纯函数）：按 experienceId 过滤并按 version 升序返回。
 *
 * @param experienceId 经验ID
 * @param allVersions 全部版本
 * @returns 版本历史
 */
export function getVersionHistoryV13(
  experienceId: string,
  allVersions: ExperienceVersionV13[],
): ExperienceVersionV13[] {
  return allVersions
    .filter((v) => v.experienceId === experienceId)
    .sort((a, b) => a.version - b.version);
}

/**
 * 版本差异对比（纯函数）：返回发生变化的字段名列表。
 *
 * @param v1 旧版本
 * @param v2 新版本
 * @returns 变更字段
 */
export function compareVersionsV13(v1: ExperienceVersionV13, v2: ExperienceVersionV13): string[] {
  const diffs: string[] = [];
  if (v1.title !== v2.title) diffs.push("title");
  if (v1.content !== v2.content) diffs.push("content");
  if (v1.authorId !== v2.authorId) diffs.push("authorId");
  return diffs;
}
