/**
 * 健澜科技 jlmedaios - 资产盘点周期 V13 纯函数（M305-B）
 *
 * scheduleAssetAuditV13 / buildAuditChecklistV13 / notifyDepartmentHeadV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 盘点经验 */
export interface AuditExpV13 {
  experienceId: string;
  title: string;
  assetScore: number;
}

/** 通知 */
export interface AuditNoticeV13 {
  deptHead: string;
  message: string;
  itemCount: number;
}

/**
 * 盘点周期（纯函数）：距上次>90天 → 需盘点。
 *
 * @param daysSinceLastAudit 距上次盘点天数
 * @returns 是否需要盘点
 */
export function scheduleAssetAuditV13(daysSinceLastAudit: number): boolean {
  return daysSinceLastAudit > 90;
}

/**
 * 盘点清单（纯函数）：按资产分升序，最低的排最前。
 *
 * @param staleExperiences 待退役经验
 * @returns 清单
 */
export function buildAuditChecklistV13(staleExperiences: AuditExpV13[]): AuditExpV13[] {
  return [...staleExperiences].sort((a, b) => a.assetScore - b.assetScore);
}

/**
 * 通知主任（纯函数）：生成待复核通知，含条数。
 *
 * @param checklist 清单
 * @returns 通知
 */
export function notifyDepartmentHeadV13(checklist: AuditExpV13[]): AuditNoticeV13 {
  return {
    deptHead: "科室主任",
    message: `有待复核 ${checklist.length} 条经验，请确认是否归档`,
    itemCount: checklist.length,
  };
}
