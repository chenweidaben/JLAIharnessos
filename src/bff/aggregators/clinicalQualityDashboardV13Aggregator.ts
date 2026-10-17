/**
 * 健澜科技 jlmedaios - 医疗质量总仪表盘 V13 纯函数（M322-A）
 *
 * computeQualityIndicatorsV13 / gradeQualityIndicatorV13 / buildQualityDashboardV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质量仪表盘输入 */
export interface QualityDashboardInputV13 {
  cmi: number;
  avgStayDays: number;
  bedTurnover: number;
  threeDayDiagnosisRate: number;
}

/** 指标灯色 */
export type IndicatorLightV13 = "green" | "yellow" | "red";

/** 质量指标项 */
export interface QualityIndicatorItemV13 {
  name: string;
  value: number;
  light: IndicatorLightV13;
}

/** 仪表盘汇总 */
export interface QualityDashboardResultV13 {
  indicators: QualityIndicatorItemV13[];
}

/**
 * 4 大指标计算（纯函数）。
 *
 * @param data 质量仪表盘输入
 * @returns 4 大指标值
 */
export function computeQualityIndicatorsV13(data: QualityDashboardInputV13): QualityDashboardInputV13 {
  return { ...data };
}

/**
 * 红黄绿判定（纯函数）：按指标阈值判定。
 *
 * @param indicator 指标名（cmi/avgStayDays/bedTurnover/threeDayDiagnosisRate）
 * @param value 指标值
 * @returns 灯色
 */
export function gradeQualityIndicatorV13(
  indicator: "cmi" | "avgStayDays" | "bedTurnover" | "threeDayDiagnosisRate",
  value: number,
): IndicatorLightV13 {
  if (indicator === "cmi") {
    if (value >= 1.0) return "green";
    if (value >= 0.8) return "yellow";
    return "red";
  }
  if (indicator === "avgStayDays") {
    if (value <= 7) return "green";
    if (value <= 10) return "yellow";
    return "red";
  }
  if (indicator === "bedTurnover") {
    if (value >= 3) return "green";
    if (value >= 2) return "yellow";
    return "red";
  }
  // threeDayDiagnosisRate
  if (value >= 90) return "green";
  if (value >= 80) return "yellow";
  return "red";
}

/**
 * 仪表盘汇总（纯函数）：4 指标 + 灯色。
 *
 * @param data 质量仪表盘输入
 * @returns 仪表盘汇总
 */
export function buildQualityDashboardV13(data: QualityDashboardInputV13): QualityDashboardResultV13 {
  const indicators: QualityIndicatorItemV13[] = [
    { name: "CMI", value: data.cmi, light: gradeQualityIndicatorV13("cmi", data.cmi) },
    { name: "平均住院日", value: data.avgStayDays, light: gradeQualityIndicatorV13("avgStayDays", data.avgStayDays) },
    { name: "床位周转率", value: data.bedTurnover, light: gradeQualityIndicatorV13("bedTurnover", data.bedTurnover) },
    { name: "三日确诊率", value: data.threeDayDiagnosisRate, light: gradeQualityIndicatorV13("threeDayDiagnosisRate", data.threeDayDiagnosisRate) },
  ];
  return { indicators };
}
