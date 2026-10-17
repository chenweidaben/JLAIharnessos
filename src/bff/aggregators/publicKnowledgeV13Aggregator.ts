/**
 * 健澜科技 jlmedaios - 离任医生知识资产保留 V13 纯函数（M297-C）
 *
 * archiveDoctorKnowledgeV13 / buildPublicKnowledgeV13 / creditOriginalAuthorV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医生经验 */
export interface DoctorExpV13 {
  experienceId: string;
  title: string;
  dept: string;
  author: string;
  content: string;
}

/** 归档后经验 */
export interface ArchivedExpV13 {
  experienceId: string;
  title: string;
  dept: string;
  originalAuthor: string;
  content: string;
  scope: "public";
}

/** 院级公共知识库 */
export interface PublicKnowledgeV13 {
  dept: string;
  count: number;
  items: ArchivedExpV13[];
}

/**
 * 离任归档（纯函数）：个人→院级 public，署名保留为 originalAuthor。
 *
 * @param doctorId 离任医生ID
 * @param experiences 其名下经验
 * @returns 归档后经验列表
 */
export function archiveDoctorKnowledgeV13(
  doctorId: string,
  experiences: DoctorExpV13[],
): ArchivedExpV13[] {
  void doctorId;
  return experiences.map((e): ArchivedExpV13 => ({
    experienceId: e.experienceId,
    title: e.title,
    dept: e.dept,
    originalAuthor: e.author,
    content: e.content,
    scope: "public",
  }));
}

/**
 * 署名标注（纯函数）：返回"原作者：XXX"文本。
 *
 * @param e 归档经验
 * @returns 署名
 */
export function creditOriginalAuthorV13(e: ArchivedExpV13): string {
  return `原作者：${e.originalAuthor}`;
}

/**
 * 院级公共知识库（纯函数）：按 dept 分组，experienceId 去重。
 *
 * @param archivedExperiences 归档经验列表
 * @returns 分组知识库
 */
export function buildPublicKnowledgeV13(
  archivedExperiences: ArchivedExpV13[],
): PublicKnowledgeV13[] {
  const seen = new Set<string>();
  const deduped = archivedExperiences.filter((e) => {
    if (seen.has(e.experienceId)) return false;
    seen.add(e.experienceId);
    return true;
  });
  const byDept = new Map<string, ArchivedExpV13[]>();
  for (const e of deduped) {
    const cur = byDept.get(e.dept) ?? [];
    cur.push(e);
    byDept.set(e.dept, cur);
  }
  return [...byDept.entries()].map(([dept, items]) => ({
    dept,
    count: items.length,
    items,
  }));
}
