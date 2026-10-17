/**
 * 健澜科技 jlmedaios - 安保消防与应急指挥 V5 纯函数（M279-B）
 *
 * classifySecurityIncidentV5 / dispatchEmergencyV5 / assessFireSafetyV5 / buildSecurityEmergencyV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 安全事件 */
export interface SecurityEvent {
  incidentType: string;
  location: string;
  severity: number;
  peopleInvolved: number;
}

/** 事件分级 */
export type IncidentLevel = "一般" | "较大" | "重大";

/** 消防检查项 */
export interface FireCheck {
  item: string;
  passed: boolean;
}

/**
 * 事件分级 V5（纯函数）。
 *
 * @param event 安全事件
 * @returns 分级
 */
export function classifySecurityIncidentV5(event: SecurityEvent): IncidentLevel {
  if (event.incidentType.includes("火灾") || event.peopleInvolved >= 5 || event.severity >= 8) {
    return "重大";
  } else if (event.incidentType.includes("暴力") || event.peopleInvolved >= 2 || event.severity >= 5) {
    return "较大";
  }
  return "一般";
}

/**
 * 应急调度 V5（纯函数）：按级别调度力量。
 *
 * @param event 事件
 * @returns 调度方案
 */
export function dispatchEmergencyV5(event: SecurityEvent): { level: IncidentLevel; teams: string[]; responseMinutes: number } {
  const level = classifySecurityIncidentV5(event);
  let teams: string[] = ["安保巡逻队"];
  let responseMinutes = 10;
  if (level === "重大") {
    teams = ["消防", "安保", "医疗", "行政值班"];
    responseMinutes = 3;
  } else if (level === "较大") {
    teams = ["安保", "值班医生"];
    responseMinutes = 5;
  }
  return { level, teams, responseMinutes };
}

/**
 * 消防安全评估 V5（纯函数）：通过率。
 *
 * @param checks 检查项
 * @returns 评估结果
 */
export function assessFireSafetyV5(checks: FireCheck[]): { passRate: number; passCount: number; failItems: string[] } {
  const passCount = checks.filter((c) => c.passed).length;
  const failItems = checks.filter((c) => !c.passed).map((c) => c.item);
  const passRate = checks.length > 0 ? Math.round((passCount / checks.length) * 1000) / 10 : 0;
  return { passRate, passCount, failItems };
}

/** 应急指挥看板输出 */
export interface SecurityEmergencyV5Report {
  totalIncidents: number;
  majorCount: number;
  avgResponseMinutes: number;
  firePassRate: number;
  suggestions: string[];
}

/**
 * 构建应急指挥看板（纯函数）。
 *
 * @param events 事件列表
 * @param checks 消防检查
 * @returns 看板
 */
export function buildSecurityEmergencyV5Report(events: SecurityEvent[], checks: FireCheck[]): SecurityEmergencyV5Report {
  let majorCount = 0;
  let responseSum = 0;
  for (const e of events) {
    const level = classifySecurityIncidentV5(e);
    if (level === "重大") majorCount += 1;
    responseSum += dispatchEmergencyV5(e).responseMinutes;
  }
  const avgResponseMinutes = events.length > 0 ? Math.round((responseSum / events.length) * 10) / 10 : 0;
  const fire = assessFireSafetyV5(checks);
  return {
    totalIncidents: events.length,
    majorCount,
    avgResponseMinutes,
    firePassRate: fire.passRate,
    suggestions: fire.failItems.length > 0
      ? [`${fire.failItems.length} 项消防检查不合格，需立即整改`]
      : ["应急体系运转正常，保持演练频次"],
  };
}
