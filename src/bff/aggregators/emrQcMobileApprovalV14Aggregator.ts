/**
 * 健澜科技 jlmedaios - 质控移动端审批 V14 聚合器（M526-A）
 *
 * 纯函数：构建移动端审批基础数据 + 移动端审批 + 构建审批报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 移动端审批基础数据 */
export interface MobileApprovalV14 {
  defectId: string;
  approver: string;
}

/** 审批输入 */
export interface MobileApprovalInputV14 {
  defectId: string;
  decision: "通过" | "驳回";
  comment: string;
}

/** 审批结果 */
export interface MobileApprovalResultV14 {
  approved: boolean;
  action: string;
}

/** 审批报告 */
export interface MobileApprovalReportV14 {
  approved: boolean;
  action: string;
}

/**
 * 构建移动端审批基础数据。
 *
 * @param defectId 缺陷ID
 * @param approver 审批人
 * @returns 移动端审批基础数据
 */
export function buildMobileApproval(defectId: string, approver: string): MobileApprovalV14 {
  return { defectId, approver };
}

/**
 * 移动端审批。
 * decision='通过' → approved=true, action='移动端通过'；decision='驳回' → approved=false, action='移动端驳回'。
 *
 * @param input 审批输入（缺陷ID + 审批决定 + 审批意见）
 * @returns 审批结果（approved + action）
 */
export function approveOnMobile(input: MobileApprovalInputV14): MobileApprovalResultV14 {
  // 手算：decision='通过' → approved=true, action='移动端通过'
  // 测试2：decision='通过' → approved=true, action='移动端通过'
  // 测试3：decision='驳回' → approved=false, action='移动端驳回'
  const approved = input.decision === "通过";
  const action = approved ? "移动端通过" : "移动端驳回";
  return { approved, action };
}

/**
 * 构建审批报告。
 *
 * @param result 审批结果
 * @returns 审批报告（approved + action 透传）
 */
export function buildMobileApprovalReport(result: MobileApprovalResultV14): MobileApprovalReportV14 {
  // 手算：透传 approved + action
  // 测试4：{approved:true, action:'移动端通过'} → approved=true, action='移动端通过'
  return { approved: result.approved, action: result.action };
}
