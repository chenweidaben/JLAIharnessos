/**
 * 健澜科技 jlmedaios - 模型版本迭代记录 V13 纯函数（M321-C）
 *
 * listModelVersionsV13 / computeVersionImprovementV13 / latestVersionV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 模型版本 */
export interface ModelVersionV13 {
  version: string;
  trainingSamples: number;
  releaseDate: string;
  hitRate: number;
}

/**
 * 版本列表（纯函数）。
 *
 * @param versions 版本列表
 * @returns 版本列表
 */
export function listModelVersionsV13(versions: ModelVersionV13[]): ModelVersionV13[] {
  return versions;
}

/**
 * 相邻版本效果提升（纯函数）：v2 命中率 - v1 命中率（pp）。
 *
 * @param v1 上一版本
 * @param v2 当前版本
 * @returns 提升百分点
 */
export function computeVersionImprovementV13(v1: ModelVersionV13, v2: ModelVersionV13): number {
  return v2.hitRate - v1.hitRate;
}

/**
 * 最新版本（纯函数）：按上线时间排序取最后一个。
 *
 * @param versions 版本列表
 * @returns 最新版本，空列表返回 null
 */
export function latestVersionV13(versions: ModelVersionV13[]): ModelVersionV13 | null {
  if (versions.length === 0) return null;
  const sorted = [...versions].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  return sorted[sorted.length - 1];
}
