/**
 * 健澜科技 jlmedaios - 模板审批流程 V14 聚合器（M524-D，M524 收官）
 *
 * 纯函数：构建审批流程基础数据 + 提交审批 + 构建审批报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 审批流程基础数据 */
export interface TemplateApprovalV14 {
  templateName: string;
  submitter: string;
}

/** 审批输入 */
export interface TemplateApprovalInputV14 {
  templateName: string;
  submitter: string;
  urgency: "常规" | "紧急";
}

/** 审批结果 */
export interface TemplateApprovalResultV14 {
  status: string;
  estimatedDays: number;
}

/** 审批报告 */
export interface TemplateApprovalReportV14 {
  status: string;
  sla: string;
}

/**
 * 构建审批流程基础数据。
 *
 * @param templateName 模板名
 * @param submitter 提交人
 * @returns 审批流程基础数据
 */
export function buildTemplateApproval(templateName: string, submitter: string): TemplateApprovalV14 {
  return { templateName, submitter };
}

/**
 * 提交审批。
 * status='待审批'；urgency='紧急'→estimatedDays=1，否则 estimatedDays=3。
 *
 * @param input 审批输入（模板名 + 提交人 + 紧急程度）
 * @returns 审批结果（status + estimatedDays）
 */
export function submitApproval(input: TemplateApprovalInputV14): TemplateApprovalResultV14 {
  // 手算：status='待审批'
  // 测试2：urgency='紧急' → estimatedDays=1
  // 测试3：urgency='常规' → estimatedDays=3
  const status = "待审批";
  const estimatedDays = input.urgency === "紧急" ? 1 : 3;
  return { status, estimatedDays };
}

/**
 * 构建审批报告。
 * estimatedDays <= 1 → sla='24小时内审批'；<= 3 → sla='3个工作日内审批'；否则 sla='7个工作日内审批'。
 *
 * @param result 审批结果
 * @returns 审批报告（status + sla）
 */
export function buildTemplateApprovalReport(result: TemplateApprovalResultV14): TemplateApprovalReportV14 {
  // 手算：estimatedDays=1 <= 1 → sla='24小时内审批'
  // 测试4：estimatedDays=1 → sla='24小时内审批'
  let sla: string;
  if (result.estimatedDays <= 1) {
    sla = "24小时内审批";
  } else if (result.estimatedDays <= 3) {
    sla = "3个工作日内审批";
  } else {
    sla = "7个工作日内审批";
  }
  return { status: result.status, sla };
}
