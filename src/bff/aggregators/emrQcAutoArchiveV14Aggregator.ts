/**
 * 健澜科技 jlmedaios - 病历自动归档触发 V14 聚合器（M521-A）
 *
 * 纯函数：构建归档触发基础数据 + 触发自动归档 + 构建归档报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 归档触发基础数据 */
export interface AutoArchiveV14 {
  recordId: string;
  dept: string;
  daysSinceDischarge: number;
}

/** 归档配置 */
export interface AutoArchiveConfigV14 {
  archiveAfterDays: number;
  requireQcPass: boolean;
  qcPassed: boolean;
}

/** 归档触发结果 */
export interface AutoArchiveTriggerResultV14 {
  triggered: boolean;
  reason: string;
}

/** 归档报告 */
export interface AutoArchiveReportV14 {
  triggered: boolean;
  reason: string;
}

/**
 * 构建归档触发基础数据。
 *
 * @param recordId 记录ID
 * @param dept 科室
 * @param daysSinceDischarge 出院后天数
 * @returns 归档触发基础数据
 */
export function buildAutoArchive(recordId: string, dept: string, daysSinceDischarge: number): AutoArchiveV14 {
  return { recordId, dept, daysSinceDischarge };
}

/**
 * 触发自动归档。
 * daysSinceDischarge>=archiveAfterDays 且 (requireQcPass=false 或 qcPassed=true)→triggered=true, reason='满足归档条件'；否则 triggered=false, reason 为未满足条件说明。
 *
 * @param record 归档触发基础数据
 * @param config 归档配置
 * @returns 触发结果（triggered + reason）
 */
export function triggerAutoArchive(record: AutoArchiveV14, config: AutoArchiveConfigV14): AutoArchiveTriggerResultV14 {
  // 手算检查：daysSinceDischarge>=archiveAfterDays 且 (requireQcPass=false 或 qcPassed=true) 才触发
  const daysOk = record.daysSinceDischarge >= config.archiveAfterDays;
  const qcOk = !config.requireQcPass || config.qcPassed;
  if (daysOk && qcOk) {
    return { triggered: true, reason: "满足归档条件" };
  }
  // 手算：未满足条件说明
  let reason = "未满足归档条件";
  if (!daysOk) {
    reason = `出院后天数不足（需>=${config.archiveAfterDays}天，当前${record.daysSinceDischarge}天）`;
  } else if (!qcOk) {
    reason = "质控未通过";
  }
  return { triggered: false, reason };
}

/**
 * 构建归档报告。
 *
 * @param result 触发结果
 * @returns 归档报告（triggered + reason）
 */
export function buildAutoArchiveReport(result: AutoArchiveTriggerResultV14): AutoArchiveReportV14 {
  return { triggered: result.triggered, reason: result.reason };
}
