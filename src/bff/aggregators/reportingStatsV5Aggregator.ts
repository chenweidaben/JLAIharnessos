/**
 * 健澜科技 jlmedaios - 卫生健康统计与医改监测上报 V5 纯函数（M278-A）
 *
 * buildStatReportV5 / validateReportV5 / diffReportV5 / buildReportingStatsV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 业务记录 */
export interface StatRecord {
  outpatientVolume: number;
  inpatientDays: number;
  surgeryCount: number;
  revenue: number;
}

/** 统计报表 */
export interface StatReport {
  reportType: string;
  period: string;
  outpatientVolume: number;
  inpatientDays: number;
  surgeryCount: number;
  revenue: number;
  missingFields: string[];
  status: "draft" | "validated" | "submitted";
}

/**
 * 生成统计报表 V5（纯函数）：汇总记录。
 *
 * @param records 业务记录
 * @param period 报告期
 * @returns 报表
 */
export function buildStatReportV5(records: StatRecord[], period: string): StatReport {
  const outpatientVolume = records.reduce((s, r) => s + r.outpatientVolume, 0);
  const inpatientDays = records.reduce((s, r) => s + r.inpatientDays, 0);
  const surgeryCount = records.reduce((s, r) => s + r.surgeryCount, 0);
  const revenue = records.reduce((s, r) => s + r.revenue, 0);
  return {
    reportType: "医改监测",
    period,
    outpatientVolume,
    inpatientDays,
    surgeryCount,
    revenue,
    missingFields: [],
    status: "draft",
  };
}

/**
 * 校验报表 V5（纯函数）：缺项/逻辑/口径校验。
 *
 * @param report 报表
 * @returns 校验结果
 */
export function validateReportV5(report: StatReport): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (report.outpatientVolume === 0) issues.push("门诊量为0，疑似缺项");
  if (report.inpatientDays === 0) issues.push("住院日为0，疑似缺项");
  if (report.revenue < 0) issues.push("收入为负，逻辑错误");
  if (report.inpatientDays > 0 && report.surgeryCount > report.inpatientDays * 10) {
    issues.push("手术数与住院日口径不匹配");
  }
  const valid = issues.length === 0;
  return { valid, issues };
}

/**
 * 本地与已上报差异 V5（纯函数）。
 *
 * @param local 本地报表
 * @param submitted 已上报报表
 * @returns 差异
 */
export function diffReportV5(local: StatReport, submitted: StatReport): { field: string; localValue: number; submittedValue: number }[] {
  const fields = ["outpatientVolume", "inpatientDays", "surgeryCount", "revenue"] as const;
  const diffs: { field: string; localValue: number; submittedValue: number }[] = [];
  for (const f of fields) {
    if (local[f] !== submitted[f]) {
      diffs.push({ field: f, localValue: local[f], submittedValue: submitted[f] });
    }
  }
  return diffs;
}

/** 上报看板输出 */
export interface ReportingStatsV5Report {
  totalTasks: number;
  draftCount: number;
  validatedCount: number;
  submittedCount: number;
  pendingValidation: number;
  suggestions: string[];
}

/**
 * 构建上报看板（纯函数）。
 *
 * @param tasks 上报任务
 * @returns 看板
 */
export function buildReportingStatsV5Report(tasks: { status: StatReport["status"]; valid: boolean }[]): ReportingStatsV5Report {
  const draftCount = tasks.filter((t) => t.status === "draft").length;
  const validatedCount = tasks.filter((t) => t.status === "validated").length;
  const submittedCount = tasks.filter((t) => t.status === "submitted").length;
  const pendingValidation = tasks.filter((t) => t.status === "draft" && !t.valid).length;
  return {
    totalTasks: tasks.length,
    draftCount,
    validatedCount,
    submittedCount,
    pendingValidation,
    suggestions: pendingValidation > 0
      ? ["存在待校验报表，需完成缺项与逻辑校验后上报"]
      : ["报表校验与上报流转正常"],
  };
}
