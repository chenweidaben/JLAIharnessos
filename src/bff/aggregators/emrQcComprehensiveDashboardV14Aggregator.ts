/**
 * 健澜科技 jlmedaios - 病历质控综合看板（避让版）V14 聚合器（M542-A）
 *
 * 纯函数：构建质控看板基础数据 + 看板加载 + 构建看板报告。
 * 避让说明：基础名 emrQcDashboardV14 已被 M468-A（指标体系大屏）占用，M484-A 已有 emrQcMetricDashboardV14（-metric-dashboard 避让），本片采用 -comprehensive 后缀避让。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控看板基础数据 */
export interface QcComprehensiveDashboardV14 {
  dept: string;
  month: string;
}

/** 看板加载输入 */
export interface QcComprehensiveDashboardInputV14 {
  totalRecords: number;
  qualifiedRecords: number;
  defectCount: number;
}

/** 看板加载结果 */
export interface QcComprehensiveDashboardResultV14 {
  passRate: number;
  defectPerRecord: number;
}

/** 看板报告 */
export interface QcComprehensiveDashboardReportV14 {
  passRate: number;
  defectPerRecord: number;
}

/**
 * 构建质控看板基础数据。
 *
 * @param dept 科室
 * @param month 月份
 * @returns 质控看板基础数据
 */
export function buildQcComprehensiveDashboard(dept: string, month: string): QcComprehensiveDashboardV14 {
  return { dept, month };
}

/**
 * 看板加载。
 * passRate = totalRecords>0 ? Math.round(qualifiedRecords/totalRecords*1000)/10 : 100
 * defectPerRecord = totalRecords>0 ? Math.round(defectCount/totalRecords*100)/10 : 0
 *
 * @param input 加载输入（总病历数 + 合格数 + 缺陷数）
 * @returns 加载结果（passRate + defectPerRecord）
 */
export function loadQcComprehensiveDashboard(input: QcComprehensiveDashboardInputV14): QcComprehensiveDashboardResultV14 {
  // 手算：passRate = totalRecords>0 ? Math.round(qualifiedRecords/totalRecords*1000)/10 : 100
  // 测试2：totalRecords=500, qualifiedRecords=480 → 480/500*1000=0.96*1000=960 → Math.round(960)/10=960/10=96.0
  // 测试3：totalRecords=0 → 保护分支 → passRate=100.0
  const passRate = input.totalRecords > 0 ? Math.round((input.qualifiedRecords / input.totalRecords) * 1000) / 10 : 100;
  // 手算：defectPerRecord = totalRecords>0 ? Math.round(defectCount/totalRecords*100)/10 : 0
  // 测试2：totalRecords=500, defectCount=25 → 25/500*100=0.05*100=5 → Math.round(5)/10=5/10=0.5
  // 测试3：totalRecords=0 → 保护分支 → defectPerRecord=0
  const defectPerRecord = input.totalRecords > 0 ? Math.round((input.defectCount / input.totalRecords) * 100) / 10 : 0;
  return { passRate, defectPerRecord };
}

/**
 * 构建看板报告。
 *
 * @param result 加载结果
 * @returns 看板报告（passRate + defectPerRecord 透传）
 */
export function buildQcComprehensiveDashboardReport(result: QcComprehensiveDashboardResultV14): QcComprehensiveDashboardReportV14 {
  // 手算：透传 passRate + defectPerRecord
  // 测试4：{passRate=96.0, defectPerRecord=0.5} → passRate=96.0, defectPerRecord=0.5
  return { passRate: result.passRate, defectPerRecord: result.defectPerRecord };
}
