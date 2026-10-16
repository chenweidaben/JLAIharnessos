/**
 * 健澜科技 jlmedaios - 数据资产与数据治理深化 V3 纯函数（M206-D）
 *
 * buildDataAssetReportV3 / scoreDataQuality / classifyDataLevel
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 数据质量六维指标 */
export interface DataQualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  uniqueness: number;
  validity: number;
}

/**
 * 数据质量评分（纯函数）。
 *
 * @param metrics 六维指标
 * @returns 综合得分
 */
export function scoreDataQuality(metrics: DataQualityMetrics): number {
  const avg = (metrics.completeness + metrics.accuracy + metrics.consistency + metrics.timeliness + metrics.uniqueness + metrics.validity) / 6;
  return Math.round(avg * 100);
}

/** 数据分类分级 */
export interface DataAssetItem {
  sensitivity: 'public' | 'internal' | 'sensitive' | 'core';
  volume: number;
}

/**
 * 数据分类分级（纯函数）。
 *
 * @param item 数据资产
 * @returns 分级结果
 */
export function classifyDataLevel(item: DataAssetItem): { level: string; encryption: boolean } {
  switch (item.sensitivity) {
    case 'core':
      return { level: '核心数据', encryption: true };
    case 'sensitive':
      return { level: '敏感数据', encryption: true };
    case 'internal':
      return { level: '内部数据', encryption: false };
    default:
      return { level: '公开数据', encryption: false };
  }
}

/** 数据资产 V3 报告输出 */
export interface DataAssetReportV3 {
  timeRange: string;
  catalog: { total: number; domains: number };
  standards: { adopted: number };
  quality: { sixDimAvg: number; issueCount: number };
  security: { classified: number; masked: number; watermarked: number };
  sharing: { APIs: number; consumers: number };
  applications: { cdss: number; operation: number; research: number; drg: number };
  governance: { org: number; stewards: number };
  lifecycle: { archived: number };
  suggestions: string[];
}

/**
 * 构建数据资产 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 数据资产 V3 报告
 */
export function buildDataAssetReportV3(timeRange: string): DataAssetReportV3 {
  return {
    timeRange,
    catalog: { total: 1000, domains: 20 },
    standards: { adopted: 50 },
    quality: { sixDimAvg: 92, issueCount: 50 },
    security: { classified: 800, masked: 300, watermarked: 200 },
    sharing: { APIs: 200, consumers: 50 },
    applications: { cdss: 10, operation: 20, research: 5, drg: 1 },
    governance: { org: 3, stewards: 50 },
    lifecycle: { archived: 100 },
    suggestions: ['提高数据完整性', '扩大数据共享 API'],
  };
}
