/**
 * 健澜科技 jlmedaios - 病历时效合规检查 V14 聚合器（M485-D，M485 收官）
 *
 * 纯函数：时效合规检查 + 报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 时效合规检查结果 */
export interface TimelinessComplianceResultV14 {
  records: { name: string; deadlineHours: number; actualHours: number; overdue: boolean }[];
  overdueCount: number;
  compliantCount: number;
  total: number;
}

/** 时效合规报告 */
export interface TimelinessReportV14 {
  overdueCount: number;
  compliantCount: number;
  total: number;
  compliantRate: number;
}

/**
 * 检查时效合规：actual > deadline 视为超时。
 *
 * @param records 记录数组
 * @returns 检查结果
 */
export function checkTimelinessCompliance(records: { name: string; deadlineHours: number; actualHours: number }[]): TimelinessComplianceResultV14 {
  const checked = records.map((r) => ({
    ...r,
    overdue: r.actualHours > r.deadlineHours,
  }));
  const overdueCount = checked.filter((r) => r.overdue).length;
  const total = checked.length;
  const compliantCount = total - overdueCount;
  return { records: checked, overdueCount, compliantCount, total };
}

/**
 * 构建报告：compliantRate = Math.ceil(compliantCount / total × 100)。
 *
 * @param result 检查结果
 * @returns 报告
 */
export function buildTimelinessReport(result: TimelinessComplianceResultV14): TimelinessReportV14 {
  const { compliantCount, total, overdueCount } = result;
  const compliantRate = total === 0 ? 100 : Math.ceil((compliantCount / total) * 100);
  return { overdueCount, compliantCount, total, compliantRate };
}
