/**
 * 健澜科技 jlmedaios - MANAGER_MUSE 主动式周会简报 V11 纯函数（M293-D）
 *
 * buildManagerBriefV11 / prioritizeManagerBriefV11 / formatManagerBriefV11
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 周会条目 */
export interface ManagerBriefItemV11 {
  id: string;
  category: "majorComplaint" | "kpiRed" | "failureHotspot" | "approval" | "knowledgeGrowth";
  title: string;
  priority: number;
}

export interface ManagerKpiV11 {
  kpiId: string;
  name: string;
  value: number;
  target: number;
}

export interface ComplaintV11 {
  complaintId: string;
  level: "major" | "normal";
  title: string;
}

export interface ApprovalV11 {
  approvalId: string;
  title: string;
}

export interface KnowledgeGrowthV11 {
  deltaPct: number;
}

export interface FailureHotspotV11 {
  rootCause: string;
  count: number;
}

/** 周会简报 */
export interface ManagerBriefV11 {
  managerId: string;
  items: ManagerBriefItemV11[];
  majorComplaintCount: number;
  kpiRedCount: number;
  failureHotspotCount: number;
  approvalCount: number;
  knowledgeGrowthPct: number;
}

const PRIORITY_MAP: Record<ManagerBriefItemV11["category"], number> = {
  majorComplaint: 1,
  kpiRed: 2,
  failureHotspot: 3,
  approval: 4,
  knowledgeGrowth: 5,
};

/**
 * 周会简报聚合 V11（纯函数）：合并五类输入为统一条目。
 *
 * @param managerId 管理者ID
 * @param kpis KPI 列表（value<target 视为红项）
 * @param complaints 投诉
 * @param approvals 待审批
 * @param knowledgeGrowth 知识资产增长
 * @param failureHotspots 失败复发热点
 * @returns 简报
 */
export function buildManagerBriefV11(
  managerId: string,
  kpis: ManagerKpiV11[],
  complaints: ComplaintV11[],
  approvals: ApprovalV11[],
  knowledgeGrowth: KnowledgeGrowthV11,
  failureHotspots: FailureHotspotV11[],
): ManagerBriefV11 {
  const redKpis = kpis.filter((k) => k.value < k.target);
  const majorComplaints = complaints.filter((c) => c.level === "major");
  const items: ManagerBriefItemV11[] = [
    ...majorComplaints.map((c): ManagerBriefItemV11 => ({
      id: c.complaintId,
      category: "majorComplaint",
      title: c.title,
      priority: PRIORITY_MAP.majorComplaint,
    })),
    ...redKpis.map((k): ManagerBriefItemV11 => ({
      id: k.kpiId,
      category: "kpiRed",
      title: `KPI 红项 ${k.name}（${k.value}/${k.target}）`,
      priority: PRIORITY_MAP.kpiRed,
    })),
    ...failureHotspots.map((f): ManagerBriefItemV11 => ({
      id: f.rootCause,
      category: "failureHotspot",
      title: `失败复发 ${f.rootCause}（${f.count}次）`,
      priority: PRIORITY_MAP.failureHotspot,
    })),
    ...approvals.map((a): ManagerBriefItemV11 => ({
      id: a.approvalId,
      category: "approval",
      title: `审批 ${a.title}`,
      priority: PRIORITY_MAP.approval,
    })),
    {
      id: "kg",
      category: "knowledgeGrowth",
      title: `知识资产周环比+${knowledgeGrowth.deltaPct}%`,
      priority: PRIORITY_MAP.knowledgeGrowth,
    },
  ];
  return {
    managerId,
    items,
    majorComplaintCount: majorComplaints.length,
    kpiRedCount: redKpis.length,
    failureHotspotCount: failureHotspots.length,
    approvalCount: approvals.length,
    knowledgeGrowthPct: knowledgeGrowth.deltaPct,
  };
}

/**
 * 周会排序 V11（纯函数）：majorComplaint > kpiRed > failureHotspot > approval > knowledgeGrowth。
 *
 * @param items 条目列表
 * @returns 排序后条目
 */
export function prioritizeManagerBriefV11(items: ManagerBriefItemV11[]): ManagerBriefItemV11[] {
  return [...items].sort((a, b) => a.priority - b.priority);
}

/**
 * 人话周会 V11（纯函数）：含关键数字。
 *
 * @param brief 简报
 * @returns 文本
 */
export function formatManagerBriefV11(brief: ManagerBriefV11): string {
  return (
    `周会简报（${brief.managerId}）：${brief.majorComplaintCount}起重大投诉，` +
    `${brief.kpiRedCount}项KPI红项，${brief.failureHotspotCount}个失败复发热点，` +
    `${brief.approvalCount}项待审批，知识资产周环比+${brief.knowledgeGrowthPct}%。`
  );
}
