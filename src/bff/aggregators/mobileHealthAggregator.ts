/**
 * 健澜科技 jlmedaios - 移动医疗深化纯函数（M195-C）
 *
 * buildMobileHealthReport / trackMobileUsage / predictMobileHealthTrend
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 移动使用数据 */
export interface MobileUsageData {
  doctorAppUsers: number;
  nurseAppUsers: number;
  patientAppUsers: number;
  dailyActiveUsers: number;
  avgSessionMinutes: number;
}

/** 移动使用追踪（纯函数）。
 *
 * @param data 使用数据
 * @returns 使用统计
 */
export function trackMobileUsage(data: MobileUsageData): { totalUsers: number; dauRate: number } {
  const totalUsers = data.doctorAppUsers + data.nurseAppUsers + data.patientAppUsers;
  const dauRate = totalUsers > 0 ? data.dailyActiveUsers / totalUsers : 0;
  return { totalUsers, dauRate };
}

/** 趋势数据 */
export interface MobileTrendData {
  currentUsers: number;
  growthRate: number;
}

/**
 * 移动健康趋势预测（纯函数）。
 *
 * @param data 趋势数据
 * @returns 预测结果
 */
export function predictMobileHealthTrend(data: MobileTrendData): { nextMonthUsers: number; growth: string } {
  const nextMonthUsers = Math.round(data.currentUsers * (1 + data.growthRate));
  const growth = data.growthRate > 0.1 ? 'high' : data.growthRate > 0.05 ? 'medium' : 'low';
  return { nextMonthUsers, growth };
}

/** 移动医疗报告输出 */
export interface MobileHealthReport {
  timeRange: string;
  doctorApp: { users: number; tasksCompleted: number };
  nurseApp: { users: number; tasksCompleted: number };
  patientApp: { users: number; ma u: number };
  infusion: { mobileInfusions: number };
  nursing: { records: number };
  rounds: { visits: number };
  followup: { cases: number };
  wearable: { devices: number; monitoredPatients: number };
  usage: { totalUsers: number; dauRate: number };
  suggestions: string[];
}

/**
 * 构建移动医疗报告。
 *
 * @param timeRange 时间范围
 * @returns 移动医疗报告
 */
export function buildMobileHealthReport(timeRange: string): MobileHealthReport {
  const usageData: MobileUsageData = {
    doctorAppUsers: 500,
    nurseAppUsers: 800,
    patientAppUsers: 30000,
    dailyActiveUsers: 15000,
    avgSessionMinutes: 15,
  };

  const usage = trackMobileUsage(usageData);

  return {
    timeRange,
    doctorApp: { users: 500, tasksCompleted: 8000 },
    nurseApp: { users: 800, tasksCompleted: 12000 },
    patientApp: { users: 30000, mau: 20000 },
    infusion: { mobileInfusions: 5000 },
    nursing: { records: 20000 },
    rounds: { visits: 3000 },
    followup: { cases: 1500 },
    wearable: { devices: 800, monitoredPatients: 600 },
    usage,
    suggestions: ['提升患者端 MAU', '增加可穿戴设备接入'],
  };
}
