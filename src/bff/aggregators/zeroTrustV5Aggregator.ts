/**
 * 健澜科技 jlmedaios - 零信任访问与权限最小化 V5 纯函数（M282-B）
 *
 * evaluatePolicyV5 / assessRiskV5 / enforceMFAV5 / buildZeroTrustV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 访问策略 */
export interface AccessPolicy {
  userId: string;
  role: string;
  resource: string;
  action: string;
  effect: "allow" | "deny";
}

/** 会话风险 */
export interface SessionContext {
  userId: string;
  ip: string;
  isNewDevice: boolean;
  isImpossibleTravel: boolean;
  mfaPassed: boolean;
}

/**
 * 策略判定 V5（纯函数）：白名单 allow 且无 deny 即允许。
 *
 * @param policies 策略列表
 * @param userId 用户
 * @param resource 资源
 * @param action 动作
 * @returns 是否允许
 */
export function evaluatePolicyV5(policies: AccessPolicy[], userId: string, resource: string, action: string): boolean {
  const matched = policies.filter((p) => p.userId === userId && p.resource === resource && p.action === action);
  if (matched.some((p) => p.effect === "deny")) return false;
  return matched.some((p) => p.effect === "allow");
}

/**
 * 会话风险评估 V5（纯函数）：新设备/不可能旅行/未过 MFA 加权。
 *
 * @param session 会话
 * @returns 风险等级
 */
export function assessRiskV5(session: SessionContext): { score: number; level: "low" | "medium" | "high" } {
  let score = 0;
  if (session.isNewDevice) score += 30;
  if (session.isImpossibleTravel) score += 50;
  if (!session.mfaPassed) score += 20;
  let level: "low" | "medium" | "high" = "low";
  if (score >= 70) level = "high";
  else if (score >= 30) level = "medium";
  return { score, level };
}

/**
 * MFA 强制 V5（纯函数）：中高风险要求 MFA。
 *
 * @param risk 风险
 * @returns 是否需要 MFA
 */
export function enforceMFAV5(risk: { score: number; level: "low" | "medium" | "high" }): boolean {
  return risk.level !== "low";
}

/** 零信任看板输出 */
export interface ZeroTrustV5Report {
  totalPolicies: number;
  highRiskSessions: number;
  mfaRequiredCount: number;
}

/**
 * 构建零信任看板（纯函数）。
 *
 * @param policies 策略列表
 * @param sessions 会话列表
 * @returns 看板
 */
export function buildZeroTrustV5Report(policies: AccessPolicy[], sessions: SessionContext[]): ZeroTrustV5Report {
  let highRiskSessions = 0;
  let mfaRequiredCount = 0;
  for (const s of sessions) {
    const risk = assessRiskV5(s);
    if (risk.level === "high") highRiskSessions += 1;
    if (enforceMFAV5(risk)) mfaRequiredCount += 1;
  }
  return {
    totalPolicies: policies.length,
    highRiskSessions,
    mfaRequiredCount,
  };
}
