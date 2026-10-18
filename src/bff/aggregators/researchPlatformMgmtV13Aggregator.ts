/**
 * 健澜科技 jlmedaios - 科研平台管理 V13 纯函数（M456-D，M456 收官，学科建设与科研管理组）
 *
 * computeResearchPlatformLabOpenRateV13 / computeResearchPlatformEquipmentSharingRateV13 / computeResearchPlatformAcceptanceQualifiedRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科研平台管理记录 */
export interface ResearchPlatformMgmtRecordV13 {
  opened: number;
  totalLab: number;
  shared: number;
  totalEquipment: number;
  qualified: number;
  totalAcceptance: number;
}

/**
 * 重点实验室开放率（纯函数）：已开放实验室数/重点实验室总数×100，保留 2 位小数。
 *
 * @param records 科研平台管理记录列表
 * @returns 重点实验室开放率百分比
 */
export function computeResearchPlatformLabOpenRateV13(records: ResearchPlatformMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalLab, 0);
  if (total === 0) return 0;
  const opened = records.reduce((acc, r) => acc + r.opened, 0);
  return Math.round((opened / total) * 10000) / 100;
}

/**
 * 科研设备共享率（纯函数）：已共享科研设备数/科研设备总数×100，保留 2 位小数。
 *
 * @param records 科研平台管理记录列表
 * @returns 科研设备共享率百分比
 */
export function computeResearchPlatformEquipmentSharingRateV13(records: ResearchPlatformMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalEquipment, 0);
  if (total === 0) return 0;
  const shared = records.reduce((acc, r) => acc + r.shared, 0);
  return Math.round((shared / total) * 10000) / 100;
}

/**
 * 平台验收合格率（纯函数）：验收合格平台数/验收平台总数×100，保留 2 位小数。
 *
 * @param records 科研平台管理记录列表
 * @returns 平台验收合格率百分比
 */
export function computeResearchPlatformAcceptanceQualifiedRateV13(records: ResearchPlatformMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAcceptance, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}
