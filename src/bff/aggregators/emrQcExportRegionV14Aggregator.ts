/**
 * 健澜科技 jlmedaios - 质控数据导出区域上报 V14 聚合器（M497-D，M497 收官）
 *
 * 纯函数：区域上报报告构建 + 区域上报格式校验。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 区域上报报告 */
export interface RegionReportV14 {
  region: string;
  period: string;
  metrics: Record<string, number>;
}

/** 格式校验结果 */
export interface RegionValidationV14 {
  valid: boolean;
  errors: string[];
}

/**
 * 构建区域上报报告。
 *
 * @param region 区域
 * @param period 周期
 * @param metrics 指标对象
 * @returns 区域上报报告
 */
export function buildRegionReport(region: string, period: string, metrics: Record<string, number>): RegionReportV14 {
  return { region, period, metrics };
}

/**
 * 校验区域上报格式（region/period 必填，metrics 非空）。
 *
 * @param report 区域上报报告
 * @returns 校验结果
 */
export function validateRegionFormat(report: RegionReportV14): RegionValidationV14 {
  // 手算校验：region/period 必填，metrics 非空对象
  const errors: string[] = [];
  if (!report.region) {
    errors.push("region 必填");
  }
  if (!report.period) {
    errors.push("period 必填");
  }
  if (!report.metrics || Object.keys(report.metrics).length === 0) {
    errors.push("metrics 不能为空");
  }
  return { valid: errors.length === 0, errors };
}
