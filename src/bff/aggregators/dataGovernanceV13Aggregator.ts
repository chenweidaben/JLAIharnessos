/**
 * 健澜科技 jlmedaios - 数据治理成熟度 V13 纯函数（M323-D）
 *
 * assessMasterDataMaturityV13 / assessMetadataMaturityV13 / assessDataQualityMaturityV13 / assessDataSecurityMaturityV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 数据治理评估项 */
export interface DataGovernanceItemV13 {
  dimension: "masterData" | "metadata" | "dataQuality" | "dataSecurity";
  level: number;
}

/** 成熟度等级 */
export type MaturityLevelV13 = 1 | 2 | 3 | 4;

/** 成熟度等级标签 */
export const MATURITY_LABEL_V13: Record<MaturityLevelV13, string> = {
  1: "初始",
  2: "可重复",
  3: "已管理",
  4: "优化",
};

/**
 * 主数据成熟度等级（纯函数）：取均值四舍五入到 1-4。
 *
 * @param items 评估项列表
 * @returns 成熟度等级
 */
export function assessMasterDataMaturityV13(items: DataGovernanceItemV13[]): MaturityLevelV13 {
  const masterItems = items.filter((i) => i.dimension === "masterData");
  if (masterItems.length === 0) return 1;
  const sum = masterItems.reduce((acc, i) => acc + i.level, 0);
  const avg = Math.round(sum / masterItems.length);
  return Math.max(1, Math.min(4, avg)) as MaturityLevelV13;
}

/**
 * 元数据成熟度等级（纯函数）：取均值四舍五入到 1-4。
 *
 * @param items 评估项列表
 * @returns 成熟度等级
 */
export function assessMetadataMaturityV13(items: DataGovernanceItemV13[]): MaturityLevelV13 {
  const metaItems = items.filter((i) => i.dimension === "metadata");
  if (metaItems.length === 0) return 1;
  const sum = metaItems.reduce((acc, i) => acc + i.level, 0);
  const avg = Math.round(sum / metaItems.length);
  return Math.max(1, Math.min(4, avg)) as MaturityLevelV13;
}

/**
 * 数据质量成熟度等级（纯函数）：取均值四舍五入到 1-4。
 *
 * @param items 评估项列表
 * @returns 成熟度等级
 */
export function assessDataQualityMaturityV13(items: DataGovernanceItemV13[]): MaturityLevelV13 {
  const qualityItems = items.filter((i) => i.dimension === "dataQuality");
  if (qualityItems.length === 0) return 1;
  const sum = qualityItems.reduce((acc, i) => acc + i.level, 0);
  const avg = Math.round(sum / qualityItems.length);
  return Math.max(1, Math.min(4, avg)) as MaturityLevelV13;
}

/**
 * 数据安全成熟度等级（纯函数）：取均值四舍五入到 1-4。
 *
 * @param items 评估项列表
 * @returns 成熟度等级
 */
export function assessDataSecurityMaturityV13(items: DataGovernanceItemV13[]): MaturityLevelV13 {
  const securityItems = items.filter((i) => i.dimension === "dataSecurity");
  if (securityItems.length === 0) return 1;
  const sum = securityItems.reduce((acc, i) => acc + i.level, 0);
  const avg = Math.round(sum / securityItems.length);
  return Math.max(1, Math.min(4, avg)) as MaturityLevelV13;
}
