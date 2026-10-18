/**
 * 健澜科技 jlmedaios - 病历调阅申请审批 V14 聚合器（M534-A）
 *
 * 纯函数：构建调阅申请基础数据 + 调阅审批 + 构建审批报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 调阅申请基础数据 */
export interface AccessRequestV14 {
  recordId: string;
  applicant: string;
}

/** 调阅审批输入 */
export interface AccessRequestInputV14 {
  requestId: string;
  decision: "批准" | "拒绝";
  reason: string;
}

/** 调阅审批结果 */
export interface AccessRequestResultV14 {
  approved: boolean;
  action: string;
}

/** 调阅审批报告 */
export interface AccessRequestReportV14 {
  approved: boolean;
  action: string;
}

/**
 * 构建调阅申请基础数据。
 *
 * @param recordId 病历ID
 * @param applicant 申请人
 * @returns 调阅申请基础数据
 */
export function buildAccessRequest(recordId: string, applicant: string): AccessRequestV14 {
  return { recordId, applicant };
}

/**
 * 调阅审批。
 * decision='批准' → approved=true, action='已批准调阅'；
 * decision='拒绝' → approved=false, action='已拒绝调阅'。
 *
 * @param input 审批输入（申请ID + 审批决定 + 审批理由）
 * @returns 审批结果（approved + action）
 */
export function approveAccessRequest(input: AccessRequestInputV14): AccessRequestResultV14 {
  // 手算：decision='批准' → approved=true, action='已批准调阅'
  // 测试2：decision='批准' → approved=true, action='已批准调阅'
  // 手算：decision='拒绝' → approved=false, action='已拒绝调阅'
  // 测试3：decision='拒绝' → approved=false, action='已拒绝调阅'
  if (input.decision === "批准") {
    return { approved: true, action: "已批准调阅" };
  }
  return { approved: false, action: "已拒绝调阅" };
}

/**
 * 构建审批报告。
 *
 * @param result 审批结果
 * @returns 审批报告（approved + action 透传）
 */
export function buildAccessRequestReport(result: AccessRequestResultV14): AccessRequestReportV14 {
  // 手算：透传 approved + action
  // 测试4：{approved=true, action='已批准调阅'} → approved=true, action='已批准调阅'
  return { approved: result.approved, action: result.action };
}
