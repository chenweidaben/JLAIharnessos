/**
 * 健澜科技 jlmedaios - 病历复印申请管理（避让版）V14 聚合器（M540-A）
 *
 * 纯函数：构建复印申请基础数据 + 创建复印申请 + 构建申请报告。
 * 避让说明：基础名 emrCopyRequestV14 已被旧批次占用，M534-C 已有 emrCopyRequestManageV14（-manage 后缀），
 *          本片采用 -apply 后缀避让（emrCopyRequestApplyV14）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 复印申请基础数据 */
export interface CopyRequestApplyV14 {
  recordId: string;
  applicant: string;
}

/** 创建复印申请输入 */
export interface CopyRequestApplyInputV14 {
  recordId: string;
  pages: number;
  purpose: string;
}

/** 创建复印申请结果 */
export interface CopyRequestApplyResultV14 {
  requestId: string;
  fee: number;
}

/** 申请报告 */
export interface CopyRequestApplyReportV14 {
  requestId: string;
  fee: number;
}

/**
 * 构建复印申请基础数据。
 *
 * @param recordId 病历ID
 * @param applicant 申请人
 * @returns 复印申请基础数据
 */
export function buildCopyRequestApply(recordId: string, applicant: string): CopyRequestApplyV14 {
  return { recordId, applicant };
}

/**
 * 创建复印申请。
 * requestId = 'COPY' + Date.now().toString().slice(-6)
 * fee = Math.round(pages * 0.5 * 10) / 10
 *
 * @param input 创建输入（病历ID + 页数 + 用途）
 * @returns 创建结果（requestId + fee）
 */
export function createCopyRequestApply(input: CopyRequestApplyInputV14): CopyRequestApplyResultV14 {
  // 手算：requestId = 'COPY' + Date.now().toString().slice(-6)
  // 测试2：recordId='REC700', pages=10 → requestId 以 'COPY' 开头
  // 测试3：recordId='REC701', pages=20 → requestId 以 'COPY' 开头
  const requestId = "COPY" + Date.now().toString().slice(-6);
  // 手算：fee = Math.round(pages * 0.5 * 10) / 10
  // 测试2：pages=10 → Math.round(10*0.5*10)/10 = Math.round(50)/10 = 5.0
  // 测试3：pages=20 → Math.round(20*0.5*10)/10 = Math.round(100)/10 = 10.0
  const fee = Math.round(input.pages * 0.5 * 10) / 10;
  return { requestId, fee };
}

/**
 * 构建申请报告。
 *
 * @param result 创建结果
 * @returns 申请报告（requestId + fee 透传）
 */
export function buildCopyRequestApplyReport(result: CopyRequestApplyResultV14): CopyRequestApplyReportV14 {
  // 手算：透传 requestId + fee
  // 测试4：{requestId='COPY123456', fee=5.0} → requestId='COPY123456', fee=5.0
  return { requestId: result.requestId, fee: result.fee };
}
