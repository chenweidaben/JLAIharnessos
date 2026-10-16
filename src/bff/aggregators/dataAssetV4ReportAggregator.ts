/**
 * 健澜科技 jlmedaios - 数据资产 V4 纯函数（M253-D）
 *
 * buildDataAssetV4Report / assessDataQualityV4 / classifyDataLevelV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估数据质量 V4（纯函数）。
 *
 * @param dimensions 维度
 * @returns 质量
 */
export function assessDataQualityV4(dimensions: { completeness: number; accuracy: number; consistency: number; timeliness: number; uniqueness: number; compliance: number }): { overall: number; adequate: boolean } {
  const overall = Math.round((dimensions.completeness + dimensions.accuracy + dimensions.consistency + dimensions.timeliness + dimensions.uniqueness + dimensions.compliance) / 6);
  return { overall, adequate: overall >= 95 };
}

/**
 * 分类数据级别 V4（纯函数）。
 *
 * @param data 数据
 * @returns 级别
 */
export function classifyDataLevelV4(data: { type: string; sensitivity: number }): { level: string; encrypted: boolean; masked: boolean } {
  let level = "L1公开";
  let encrypted = false;
  let masked = false;
  if (data.sensitivity >= 90) {
    level = "L4敏感";
    encrypted = true;
    masked = true;
  } else if (data.sensitivity >= 60) {
    level = "L3内部";
    encrypted = true;
  } else if (data.sensitivity >= 30) {
    level = "L2内部";
  }
  return { level, encrypted, masked };
}

/** 数据资产 V4 报告输出 */
export interface DataAssetV4Report {
  timeRange: string;
  catalog: { asset: number; business: number; tech: number; lineage: number };
  standard: { dataElement: number; dataset: number; code: number; value: number };
  quality: { completeness: number; accuracy: number; consistency: number; timeliness: number; uniqueness: number; compliance: number };
  security: { classification: number; desensitization: number; encryption: number; audit: number; dlp: number };
  sharing: { catalog: number; application: number; approval: number; api: number };
  governance: { owner: number; steward: number; committee: number; kpi: number };
  lifecycle: { acquisition: number; storage: number; use: number; archive: number; destruction: number };
  service: { api: number; subscription: number; push: number; report: number; qa: number };
  suggestions: string[];
}

/**
 * 构建数据资产 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 数据资产 V4 报告
 */
export function buildDataAssetV4Report(timeRange: string): DataAssetV4Report {
  return {
    timeRange,
    catalog: { asset: 5000, business: 3000, tech: 4000, lineage: 80 },
    standard: { dataElement: 10000, dataset: 5000, code: 2000, value: 3000 },
    quality: { completeness: 98, accuracy: 99, consistency: 97, timeliness: 95, uniqueness: 99, compliance: 100 },
    security: { classification: 5000, desensitization: 1000, encryption: 80, audit: 100, dlp: 90 },
    sharing: { catalog: 200, application: 100, approval: 95, api: 50 },
    governance: { owner: 50, steward: 200, committee: 1, kpi: 90 },
    lifecycle: { acquisition: 10000, storage: 50000, use: 30000, archive: 5000, destruction: 100 },
    service: { api: 50, subscription: 100, push: 200, report: 300, qa: 50 },
    suggestions: ["提升数据完整性", "扩大数据共享"],
  };
}
