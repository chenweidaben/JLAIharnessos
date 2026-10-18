/**
 * 健澜科技 jlmedaios - 病历复印申请管理 V14 聚合器（M534-C）
 *
 * 纯函数：构建复印申请基础数据 + 复印申请处理 + 构建复印报告。
 * 命名空间与旧 emrCopyRequestV14（病历复印申请模块）区分，本模块专注复印申请管理与费用计算。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 复印申请基础数据 */
export interface CopyRequestManageV14 {
  recordId: string;
  applicant: string;
}

/** 复印申请处理输入 */
export interface CopyRequestManageInputV14 {
  requestId: string;
  pages: number;
  purpose: string;
}

/** 复印申请处理结果 */
export interface CopyRequestManageResultV14 {
  processed: boolean;
  fee: number;
}

/** 复印报告 */
export interface CopyRequestManageReportV14 {
  processed: boolean;
  fee: number;
}

/**
 * 构建复印申请基础数据。
 *
 * @param recordId 病历ID
 * @param applicant 申请人
 * @returns 复印申请基础数据
 */
export function buildCopyRequestManage(recordId: string, applicant: string): CopyRequestManageV14 {
  return { recordId, applicant };
}

/**
 * 复印申请处理。
 * processed = true；fee = pages × 0.5 保留1位小数。
 *
 * @param input 处理输入（申请ID + 页数 + 用途）
 * @returns 处理结果（processed + fee）
 */
export function processCopyRequestManage(input: CopyRequestManageInputV14): CopyRequestManageResultV14 {
  // 手算：processed = true（申请已处理）
  // 测试2：processed=true
  // 测试3：processed=true
  const processed = true;
  // 手算：fee = Math.round(pages * 0.5 * 10) / 10（保留1位小数）
  // 测试2：Math.round(10*0.5*10) = Math.round(50) = 50 → 50/10 = 5.0
  // 测试3：Math.round(25*0.5*10) = Math.round(125) = 125 → 125/10 = 12.5
  const fee = Math.round(input.pages * 0.5 * 10) / 10;
  return { processed, fee };
}

/**
 * 构建复印报告。
 *
 * @param result 处理结果
 * @returns 复印报告（processed + fee 透传）
 */
export function buildCopyRequestManageReport(result: CopyRequestManageResultV14): CopyRequestManageReportV14 {
  // 手算：透传 processed + fee
  // 测试4：{processed:true, fee:5.0} → processed=true, fee=5.0
  return { processed: result.processed, fee: result.fee };
}
