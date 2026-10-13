/**
 * 健澜科技 jlmedaios - 患者端门户纯函数（M80-A）
 * 待办计数 / 最紧急项。纯函数无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface PortalPending {
  upcomingAppt: number;
  unreadReports: number;
  unreadNotifs: number;
  depositDue: number;
  followupDue: number;
  surveyDue: number;
}

/** 汇总患者端待办计数。 */
export function pendingCount(input: {
  bookedAppts: number;
  unreadReports: number;
  unreadNotifs: number;
  depositDue: number;
  followupDue: number;
  surveyDue: number;
}): PortalPending {
  return {
    upcomingAppt: input.bookedAppts,
    unreadReports: input.unreadReports,
    unreadNotifs: input.unreadNotifs,
    depositDue: input.depositDue,
    followupDue: input.followupDue,
    surveyDue: input.surveyDue,
  };
}

export interface PortalItem {
  key: string;
  urgent: boolean;
}

/** 取最紧急项（首个 urgent；无则返回首项或 null）。 */
export function highlight(items: PortalItem[]): PortalItem | null {
  if (items.length === 0) return null;
  return items.find((i) => i.urgent) ?? items[0];
}
