/**
 * 健澜科技 jlmedaios - 患者端门户类型（M80-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export interface PortalPending {
  upcomingAppt: number;
  unreadReports: number;
  unreadNotifs: number;
  depositDue: number;
  followupDue: number;
  surveyDue: number;
}

export interface PortalView {
  upcomingAppointments: number;
  unreadReportsCount: number;
  unreadNotificationsCount: number;
  depositBalance: number;
  pendingFollowups: number;
  pendingSurveys: number;
  pending: PortalPending;
}
