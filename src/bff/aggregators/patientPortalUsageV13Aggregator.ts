/**
 * 健澜科技 jlmedaios - 患者门户使用度 V13 纯函数（M316-D）
 *
 * computeMonthlyActiveRateV13 / computeFeatureUsageRatesV13 / identifyLowUsagePatientsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门户用户 */
export interface PortalUserV13 {
  userId: string;
  isMonthlyActive: boolean;
  usedAppointment: boolean;
  usedReportQuery: boolean;
  usedOnlinePayment: boolean;
  usedMessageCenter: boolean;
  daysSinceLastLogin: number;
}

/** 功能使用率 */
export interface FeatureUsageV13 {
  appointment: number;
  reportQuery: number;
  onlinePayment: number;
  messageCenter: number;
}

/**
 * 月活率（纯函数）：本月活跃用户数/总注册用户数×100。
 *
 * @param users 用户列表
 * @returns 月活率百分比
 */
export function computeMonthlyActiveRateV13(users: PortalUserV13[]): number {
  if (users.length === 0) return 0;
  const active = users.filter((u) => u.isMonthlyActive).length;
  return Math.round((active / users.length) * 100);
}

/**
 * 4 功能使用率（纯函数）：预约/报告查询/在线支付/消息中心 各功能使用率。
 *
 * @param users 用户列表
 * @returns 功能使用率
 */
export function computeFeatureUsageRatesV13(users: PortalUserV13[]): FeatureUsageV13 {
  if (users.length === 0) {
    return { appointment: 0, reportQuery: 0, onlinePayment: 0, messageCenter: 0 };
  }
  const total = users.length;
  return {
    appointment: Math.round((users.filter((u) => u.usedAppointment).length / total) * 100),
    reportQuery: Math.round((users.filter((u) => u.usedReportQuery).length / total) * 100),
    onlinePayment: Math.round((users.filter((u) => u.usedOnlinePayment).length / total) * 100),
    messageCenter: Math.round((users.filter((u) => u.usedMessageCenter).length / total) * 100),
  };
}

/**
 * 低使用患者列表（纯函数）：30 天未登录。
 *
 * @param users 用户列表
 * @returns 低使用患者 ID 列表
 */
export function identifyLowUsagePatientsV13(users: PortalUserV13[]): string[] {
  return users.filter((u) => u.daysSinceLastLogin > 30).map((u) => u.userId);
}
