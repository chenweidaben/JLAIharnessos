/**
 * 健澜科技 jlmedaios - DOCTOR_MUSE 主动式晨间简报 V11 纯函数（M293-A）
 *
 * buildMorningBriefV11 / prioritizeBriefV11 / formatBriefV11
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 晨间简报条目 */
export interface BriefItemV11 {
  id: string;
  category: "critical" | "surgery" | "review" | "approval" | "weightDelta";
  title: string;
  priority: number;
}

export interface MorningScheduleV11 {
  surgeryId: string;
  title: string;
}

export interface CriticalAlertV11 {
  alertId: string;
  title: string;
}

export interface PendingCaseV11 {
  caseId: string;
  title: string;
}

export interface ApprovalV11 {
  approvalId: string;
  title: string;
}

export interface WeightDeltaV11 {
  ruleId: string;
  delta: number;
}

/** 晨间简报 */
export interface MorningBriefV11 {
  doctorId: string;
  items: BriefItemV11[];
  surgeryCount: number;
  criticalCount: number;
  reviewCount: number;
  approvalCount: number;
  weightDeltaCount: number;
}

const PRIORITY_MAP: Record<BriefItemV11["category"], number> = {
  critical: 1,
  surgery: 2,
  review: 3,
  approval: 4,
  weightDelta: 5,
};

/**
 * 晨间简报聚合 V11（纯函数）：合并五类输入为统一条目。
 *
 * @param doctorId 医生ID
 * @param schedule 今日手术
 * @param alerts 危重警报
 * @param pendingCases 待复盘案例
 * @param approvals 待审批
 * @param weightDeltas 昨日反馈权重变化
 * @returns 简报
 */
export function buildMorningBriefV11(
  doctorId: string,
  schedule: MorningScheduleV11[],
  alerts: CriticalAlertV11[],
  pendingCases: PendingCaseV11[],
  approvals: ApprovalV11[],
  weightDeltas: WeightDeltaV11[],
): MorningBriefV11 {
  const items: BriefItemV11[] = [
    ...alerts.map((a): BriefItemV11 => ({
      id: a.alertId,
      category: "critical",
      title: a.title,
      priority: PRIORITY_MAP.critical,
    })),
    ...schedule.map((s): BriefItemV11 => ({
      id: s.surgeryId,
      category: "surgery",
      title: s.title,
      priority: PRIORITY_MAP.surgery,
    })),
    ...pendingCases.map((c): BriefItemV11 => ({
      id: c.caseId,
      category: "review",
      title: c.title,
      priority: PRIORITY_MAP.review,
    })),
    ...approvals.map((a): BriefItemV11 => ({
      id: a.approvalId,
      category: "approval",
      title: a.title,
      priority: PRIORITY_MAP.approval,
    })),
    ...weightDeltas.map((w): BriefItemV11 => ({
      id: w.ruleId,
      category: "weightDelta",
      title: `规则${w.ruleId}权重变化${w.delta > 0 ? "+" : ""}${w.delta.toFixed(2)}`,
      priority: PRIORITY_MAP.weightDelta,
    })),
  ];
  return {
    doctorId,
    items,
    surgeryCount: schedule.length,
    criticalCount: alerts.length,
    reviewCount: pendingCases.length,
    approvalCount: approvals.length,
    weightDeltaCount: weightDeltas.length,
  };
}

/**
 * 简报排序 V11（纯函数）：critical > surgery > review > approval > weightDelta。
 *
 * @param items 条目列表
 * @returns 排序后条目
 */
export function prioritizeBriefV11(items: BriefItemV11[]): BriefItemV11[] {
  return [...items].sort((a, b) => a.priority - b.priority);
}

/**
 * 人话简报 V11（纯函数）：含关键数字。
 *
 * @param brief 简报
 * @returns 文本
 */
export function formatBriefV11(brief: MorningBriefV11): string {
  return (
    `早上好，${brief.doctorId}。今日${brief.surgeryCount}台手术，` +
    `${brief.criticalCount}条危重警报需立即处理，` +
    `${brief.reviewCount}个待复盘案例，${brief.approvalCount}项待审批，` +
    `另有${brief.weightDeltaCount}条规则权重发生变化。`
  );
}
