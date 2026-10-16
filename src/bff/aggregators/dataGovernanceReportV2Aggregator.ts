/**
 * 健澜科技 jlmedaios - 数据治理 V2 纯函数（M227-B）
 *
 * buildDataGovernanceReportV2 / assessDataQuality / classifyDataLevel
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估数据质量（六维，纯函数）。
 *
 * @param dimensions 六维达标数
 * @returns 质量评级
 */
export function assessDataQuality(dimensions: number): { level: string; score: number } {
  let level = '待改进';
  if (dimensions >= 5) level = '优秀';
  else if (dimensions >= 3) level = '良好';
  return { level, score: dimensions * 16.7 };
}

/**
 * 数据分类分级（纯函数）。
 *
 * @param data 数据描述
 * @returns 分级
 */
export function classifyDataLevel(data: string): { level: string; masked: boolean } {
  let level = '公开';
  let masked = false;
  if (data.includes('身份证') || data.includes('病历')) {
    level = '敏感';
    masked = true;
  } else if (data.includes('密码') || data.includes('财务')) {
    level = '核心';
    masked = true;
  }
  return { level, masked };
}

/** 数据治理 V2 报告输出 */
export interface DataGovernanceReportV2 {
  timeRange: string;
  standards: { defined: number };
  quality: { dimensions: number };
  security: { classified: number; masked: boolean };
  architecture: { ods: boolean; dw: boolean; lake: boolean };
  asset: { catalog: number };
  lifecycle: { archived: number };
  org: { owner: number };
  service: { api: number; dashboard: number };
  suggestions: string[];
}

/**
 * 构建数据治理 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 数据治理 V2 报告
 */
export function buildDataGovernanceReportV2(timeRange: string): DataGovernanceReportV2 {
  return {
    timeRange,
    standards: { defined: 500 },
    quality: { dimensions: 5 },
    security: { classified: 1000, masked: true },
    architecture: { ods: true, dw: true, lake: true },
    asset: { catalog: 200 },
    lifecycle: { archived: 5000 },
    org: { owner: 40 },
    service: { api: 100, dashboard: 20 },
    suggestions: ['完善数据标准', '加强数据脱敏'],
  };
}
