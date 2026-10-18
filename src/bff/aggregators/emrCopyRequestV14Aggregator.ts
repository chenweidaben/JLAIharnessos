/**
 * 健澜科技 jlmedaios - 病历复印申请 V14 聚合器（M482-A）
 *
 * 纯函数：复印申请构建 + 审批。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 复印申请 */
export interface CopyRequestV14 {
  patientName: string;
  purpose: string;
  copies: number;
}

/** 复印申请审批结果 */
export interface CopyRequestStatusV14 {
  patientName: string;
  purpose: string;
  copies: number;
  status: string;
}

/**
 * 构建复印申请。
 *
 * @param patientName 患者姓名
 * @param purpose 用途
 * @param copies 份数
 * @returns 复印申请
 */
export function buildCopyRequest(patientName: string, purpose: string, copies: number): CopyRequestV14 {
  return { patientName, purpose, copies };
}

/**
 * 审批复印申请：approved=true → '已批准'，false → '已拒绝'。
 *
 * @param request 复印申请
 * @param approved 是否批准
 * @returns 审批结果
 */
export function approveCopyRequest(request: CopyRequestV14, approved: boolean): CopyRequestStatusV14 {
  return {
    patientName: request.patientName,
    purpose: request.purpose,
    copies: request.copies,
    status: approved ? "已批准" : "已拒绝",
  };
}
