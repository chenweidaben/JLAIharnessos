/**
 * 健澜科技 jlmedaios - 病历模板使用统计 V14 聚合器（M468-C）
 *
 * 纯函数：按模板聚合使用/修改次数 + 修改率 + 降序排名。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 单次使用记录 */
export interface TemplateUsageV14 {
  templateId: string;
  used: boolean;
  modified: boolean;
}

/** 聚合结果 */
export interface TemplateUsageAggregatedV14 {
  templateId: string;
  useCount: number;
  modifyCount: number;
  modifyRate: number;
}

/** 排名结果 */
export interface TemplateRankedV14 {
  templateId: string;
  useCount: number;
  modifyRate: number;
  rank: number;
}

/**
 * 按 templateId 聚合：useCount=used=true 次数；modifyCount=used 且 modified=true 次数；modifyRate=modifyCount/useCount×100。
 *
 * @param usages 使用记录列表
 * @returns 聚合结果（按 useCount 降序）
 */
export function aggregateTemplateUsage(usages: TemplateUsageV14[]): TemplateUsageAggregatedV14[] {
  if (usages.length === 0) return [];
  const map = new Map<string, { useCount: number; modifyCount: number }>();
  for (const u of usages) {
    if (!u.used) continue;
    const entry = map.get(u.templateId) ?? { useCount: 0, modifyCount: 0 };
    entry.useCount += 1;
    if (u.modified) entry.modifyCount += 1;
    map.set(u.templateId, entry);
  }
  const result: TemplateUsageAggregatedV14[] = Array.from(map.entries()).map(([templateId, agg]) => ({
    templateId,
    useCount: agg.useCount,
    modifyCount: agg.modifyCount,
    modifyRate: agg.useCount > 0 ? Math.round((agg.modifyCount / agg.useCount) * 100) : 0,
  }));
  return result.sort((a, b) => b.useCount - a.useCount);
}

/**
 * 按 useCount 降序排名（rank 从 1 开始）。
 *
 * @param aggregated 聚合结果
 * @returns 排名列表
 */
export function rankTemplates(aggregated: TemplateUsageAggregatedV14[]): TemplateRankedV14[] {
  return aggregated
    .sort((a, b) => b.useCount - a.useCount)
    .map((item, idx) => ({
      templateId: item.templateId,
      useCount: item.useCount,
      modifyRate: item.modifyRate,
      rank: idx + 1,
    }));
}
