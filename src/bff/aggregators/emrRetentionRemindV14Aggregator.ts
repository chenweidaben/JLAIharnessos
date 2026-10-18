/**
 * 健澜科技 jlmedaios - 病历保存期限提醒 V14 聚合器（M541-C）
 *
 * 纯函数：构建保存期限提醒基础数据 + 保存期限检测 + 构建提醒报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 保存期限提醒基础数据 */
export interface RetentionRemindV14 {
  recordId: string;
  dept: string;
}

/** 保存期限检测输入 */
export interface RetentionRemindInputV14 {
  yearsSinceArchive: number;
  retentionYears: number;
}

/** 保存期限检测结果 */
export interface RetentionRemindResultV14 {
  expiring: boolean;
  monthsLeft: number;
}

/** 提醒报告 */
export interface RetentionRemindReportV14 {
  expiring: boolean;
  monthsLeft: number;
}

/**
 * 构建保存期限提醒基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 保存期限提醒基础数据
 */
export function buildRetentionRemind(recordId: string, dept: string): RetentionRemindV14 {
  return { recordId, dept };
}

/**
 * 保存期限检测。
 * monthsLeft = Math.max(0, Math.ceil((retentionYears - yearsSinceArchive) * 12))
 * expiring = monthsLeft <= 6
 *
 * @param input 检测输入（归档年数 + 保存年限）
 * @returns 检测结果（expiring + monthsLeft）
 */
export function detectRetentionExpire(input: RetentionRemindInputV14): RetentionRemindResultV14 {
  // 手算：monthsLeft = Math.max(0, Math.ceil((retentionYears - yearsSinceArchive) * 12))
  // 测试2：yearsSinceArchive=29.5, retentionYears=30 → (30-29.5)*12=0.5*12=6 → Math.ceil(6)=6
  // 测试3：yearsSinceArchive=5, retentionYears=30 → (30-5)*12=25*12=300 → Math.ceil(300)=300
  const monthsLeft = Math.max(0, Math.ceil((input.retentionYears - input.yearsSinceArchive) * 12));
  // 手算：expiring = monthsLeft <= 6
  // 测试2：monthsLeft=6 → 6<=6=true → expiring=true
  // 测试3：monthsLeft=300 → 300<=6=false → expiring=false
  const expiring = monthsLeft <= 6;
  return { expiring, monthsLeft };
}

/**
 * 构建提醒报告。
 *
 * @param result 检测结果
 * @returns 提醒报告（expiring + monthsLeft 透传）
 */
export function buildRetentionRemindReport(result: RetentionRemindResultV14): RetentionRemindReportV14 {
  // 手算：透传 expiring + monthsLeft
  // 测试4：{expiring=true, monthsLeft=6} → expiring=true, monthsLeft=6
  return { expiring: result.expiring, monthsLeft: result.monthsLeft };
}
