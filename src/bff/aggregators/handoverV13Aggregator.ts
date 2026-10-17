/**
 * 健澜科技 jlmedaios - 继任者经验传承交接 V13 纯函数（M297-A）
 *
 * buildHandoverPackageV13 / confirmHandoverV13 / buildHandoverInboxV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 交接经验 */
export interface HandoverExperienceV13 {
  experienceId: string;
  title: string;
  bucket: "fresh" | "aging" | "stale" | "archive";
}

/** 交接包 */
export interface HandoverPackageV13 {
  packageId: string;
  fromDoctor: string;
  toDoctor: string;
  experienceCount: number;
  freshCount: number;
  staleCount: number;
  adaptationNote: string;
  status: "pending" | "accepted" | "rejected";
}

/**
 * 打包交接（纯函数）：聚合 fromDoc 名下经验，统计 fresh/stale，生成适配说明。
 *
 * @param fromDoc 原作者
 * @param toDoc 继任者
 * @param experiences 经验列表
 * @returns 交接包
 */
export function buildHandoverPackageV13(
  fromDoc: string,
  toDoc: string,
  experiences: HandoverExperienceV13[],
): HandoverPackageV13 {
  const fresh = experiences.filter((e) => e.bucket === "fresh").length;
  const stale = experiences.filter((e) => e.bucket === "stale").length;
  return {
    packageId: `pkg-${fromDoc}-${toDoc}`,
    fromDoctor: fromDoc,
    toDoctor: toDoc,
    experienceCount: experiences.length,
    freshCount: fresh,
    staleCount: stale,
    adaptationNote: stale > fresh
      ? "部分经验已过期，建议先复核再复用"
      : "经验整体新鲜，可直接参考",
    status: "pending",
  };
}

/**
 * 确认交接（纯函数）：pending → accepted / rejected。
 *
 * @param pkg 交接包
 * @param action accept | reject
 * @returns 新状态包
 */
export function confirmHandoverV13(
  pkg: HandoverPackageV13,
  action: "accept" | "reject",
): HandoverPackageV13 {
  return {
    ...pkg,
    status: action === "accept" ? "accepted" : "rejected",
  };
}

/**
 * 继任者收件箱（纯函数）：只返回 toDocId 匹配且 status=pending 的包。
 *
 * @param toDocId 继任者ID
 * @param allPackages 全部交接包
 * @returns 待收件箱
 */
export function buildHandoverInboxV13(
  toDocId: string,
  allPackages: HandoverPackageV13[],
): HandoverPackageV13[] {
  return allPackages.filter(
    (p) => p.toDoctor === toDocId && p.status === "pending",
  );
}
