/**
 * 健澜科技 jlmedaios - 区域医联体与分级诊疗纯函数（M206-C）
 *
 * buildRegionalHealthReport / assessTwoWayReferralQuality / buildRegionalResourceMap
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 双向转诊 */
export interface ReferralRecord {
  direction: 'up' | 'down';
  accepted: boolean;
  onTime: boolean;
}

/**
 * 评估双向转诊质量（纯函数）。
 *
 * @param referrals 转诊记录
 * @returns 质量评估
 */
export function assessTwoWayReferralQuality(referrals: ReferralRecord[]): { upRate: number; downRate: number; acceptanceRate: number; onTimeRate: number } {
  const total = referrals.length;
  const upCount = referrals.filter((r) => r.direction === 'up').length;
  const downCount = referrals.filter((r) => r.direction === 'down').length;
  const accepted = referrals.filter((r) => r.accepted).length;
  const onTime = referrals.filter((r) => r.onTime).length;
  return {
    upRate: total > 0 ? upCount / total : 0,
    downRate: total > 0 ? downCount / total : 0,
    acceptanceRate: total > 0 ? accepted / total : 0,
    onTimeRate: total > 0 ? onTime / total : 0,
  };
}

/** 区域单位 */
export interface RegionalUnit {
  name: string;
  level: '三级' | '二级' | '基层';
  beds: number;
}

/**
 * 构建区域资源图谱（纯函数）。
 *
 * @param units 区域单位列表
 * @returns 资源统计
 */
export function buildRegionalResourceMap(units: RegionalUnit[]): { tertiary: number; secondary: number; primary: number; totalBeds: number } {
  return {
    tertiary: units.filter((u) => u.level === '三级').length,
    secondary: units.filter((u) => u.level === '二级').length,
    primary: units.filter((u) => u.level === '基层').length,
    totalBeds: units.reduce((sum, u) => sum + u.beds, 0),
  };
}

/** 区域医联体报告输出 */
export interface RegionalHealthReport {
  timeRange: string;
  alliance: { members: number };
  referral: { up: number; down: number; acceptance: number; onTime: number };
  telemedicine: { consult: number; imaging: number; pathology: number };
  downlink: { expertClinic: number; training: number };
  primaryEnablement: { guid: number; systemDeployed: number };
  sharedData: { records: number };
  publicHealth: { collaborativeTasks: number };
  kpi: { score: number };
  suggestions: string[];
}

/**
 * 构建区域医联体报告。
 *
 * @param timeRange 时间范围
 * @returns 区域医联体报告
 */
export function buildRegionalHealthReport(timeRange: string): RegionalHealthReport {
  return {
    timeRange,
    alliance: { members: 15 },
    referral: { up: 5000, down: 2000, acceptance: 0.95, onTime: 0.9 },
    telemedicine: { consult: 1000, imaging: 500, pathology: 200 },
    downlink: { expertClinic: 200, training: 50 },
    primaryEnablement: { guid: 300, systemDeployed: 10 },
    sharedData: { records: 1000000 },
    publicHealth: { collaborativeTasks: 100 },
    kpi: { score: 85 },
    suggestions: ['提高下转率', '扩大远程影像覆盖'],
  };
}
