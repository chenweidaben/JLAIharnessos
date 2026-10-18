/**
 * 健澜科技 jlmedaios - 病历归档规则 V14 聚合器（M478-B）
 *
 * 纯函数：归档规则构建 + 归档资格检查。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 归档规则 */
export interface ArchiveRuleV14 {
  name: string;
  condition: string;
  retentionYears: number;
}

/** 病历归档资格检查数据 */
export interface ArchiveEligibilityRecordV14 {
  daysSinceDischarge: number;
  reviewed: boolean;
}

/**
 * 构建归档规则。
 *
 * @param name 规则名
 * @param condition 条件描述
 * @param retentionYears 保存年限
 * @returns 归档规则
 */
export function buildArchiveRule(name: string, condition: string, retentionYears: number): ArchiveRuleV14 {
  return { name, condition, retentionYears };
}

/**
 * 检查病历是否符合归档条件：daysSinceDischarge>=30 且 reviewed=true。
 *
 * @param record 病历数据
 * @param rule 归档规则
 * @returns 是否符合归档条件
 */
export function checkArchiveEligibility(
  record: ArchiveEligibilityRecordV14,
  _rule: ArchiveRuleV14,
): boolean {
  return record.daysSinceDischarge >= 30 && record.reviewed === true;
}
