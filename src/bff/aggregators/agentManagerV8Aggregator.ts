/**
 * 健澜科技 jlmedaios - 管理者 Personal Agent（Manager MUSE）工作台 V8 纯函数（M290-D）
 *
 * buildManagerTodoV8 / prioritizeManagerV8 / buildManagerDigestV8
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 管理者待办 */
export interface ManagerTodo {
  id: string;
  type: "majorComplaint" | "kpiRed" | "approval";
  title: string;
  severity: "high" | "medium" | "low";
}

/** KPI 指标 */
export interface ManagerKpi {
  kpiId: string;
  name: string;
  value: number;
  target: number;
}

/** 投诉 */
export interface ManagerComplaint {
  complaintId: string;
  level: "major" | "normal";
  title: string;
}

/** 待审批 */
export interface ManagerApproval {
  approvalId: string;
  title: string;
}

/**
 * 管理者待办合并 V8（纯函数）：KPI 缺口/投诉/审批三类合并。
 *
 * @param kpis KPI 列表（value<target 视为红项）
 * @param complaints 投诉列表（level=major 单独分类）
 * @param approvals 待审批列表
 * @returns 待办列表
 */
export function buildManagerTodoV8(
  kpis: ManagerKpi[],
  complaints: ManagerComplaint[],
  approvals: ManagerApproval[],
): ManagerTodo[] {
  const fromKpis: ManagerTodo[] = kpis
    .filter((k) => k.value < k.target)
    .map((k) => ({
      id: k.kpiId,
      type: "kpiRed",
      title: `KPI 缺口 ${k.name}（${k.value}/${k.target}）`,
      severity: "medium" as const,
    }));
  const fromComplaints: ManagerTodo[] = complaints.map((c) => ({
    id: c.complaintId,
    type: c.level === "major" ? "majorComplaint" : "approval",
    title: c.title,
    severity: c.level === "major" ? ("high" as const) : ("low" as const),
  }));
  const fromApprovals: ManagerTodo[] = approvals.map((a) => ({
    id: a.approvalId,
    type: "approval",
    title: `审批 ${a.title}`,
    severity: "low" as const,
  }));
  return [...fromKpis, ...fromComplaints, ...fromApprovals];
}

/**
 * 管理者待办排序 V8（纯函数）：majorComplaint > kpiRed > approval。
 *
 * @param todos 待办列表
 * @returns 排序后列表
 */
export function prioritizeManagerV8(todos: ManagerTodo[]): ManagerTodo[] {
  const score = (t: ManagerTodo["type"]) =>
    t === "majorComplaint" ? 0 : t === "kpiRed" ? 1 : 2;
  return [...todos].sort((a, b) => score(a.type) - score(b.type));
}

/**
 * 管理驾驶舱摘要 V8（纯函数）：redKpiCount/complaintCount/pendingApprovalCount。
 *
 * @param kpis KPI 列表
 * @param complaints 投诉列表
 * @param approvals 待审批列表
 * @returns 摘要
 */
export function buildManagerDigestV8(
  kpis: ManagerKpi[],
  complaints: ManagerComplaint[],
  approvals: ManagerApproval[],
): { redKpiCount: number; complaintCount: number; majorComplaintCount: number; pendingApprovalCount: number } {
  return {
    redKpiCount: kpis.filter((k) => k.value < k.target).length,
    complaintCount: complaints.length,
    majorComplaintCount: complaints.filter((c) => c.level === "major").length,
    pendingApprovalCount: approvals.length,
  };
}
