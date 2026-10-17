/**
 * 健澜科技 jlmedaios - 灰度发布与回滚 V5 纯函数（M286-B）
 *
 * planCanaryV5 / routeCohortV5 / rollbackPlanV5 / buildOpsReleaseV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 发布部署 */
export interface ReleaseDeploy {
  id: string;
  version: string;
  strategy: "canary" | "blue-green" | "rolling";
  canaryPct: number;
  status: "pending" | "routing" | "full" | "rolled-back";
}

/** 分流记录 */
export interface ReleaseRoute {
  deployId: string;
  userId: string;
  cohort: "stable" | "canary";
}

/**
 * 灰度计划 V5（纯函数）：按目标灰度比例生成阶段。
 *
 * @param version 版本号
 * @param pct 目标灰度百分比
 * @returns 灰度计划
 */
export function planCanaryV5(version: string, pct: number): { version: string; steps: number[]; finalPct: number } {
  const steps: number[] = [];
  let current = 5;
  while (current <= pct) {
    steps.push(current);
    current = Math.min(current * 2, pct);
    if (steps[steps.length - 1] !== pct && current === pct) break;
  }
  if (steps[steps.length - 1] !== pct) steps.push(pct);
  return { version, steps, finalPct: pct };
}

/**
 * 分流 V5（纯函数）：按 userId 哈希决定是否进 canary cohort。
 *
 * @param users 用户ID列表
 * @param pct 灰度比例
 * @returns 分流结果
 */
export function routeCohortV5(users: string[], pct: number): { canary: string[]; stable: string[] } {
  const canary: string[] = [];
  const stable: string[] = [];
  for (const u of users) {
    let hash = 0;
    for (let i = 0; i < u.length; i++) {
      hash = (hash * 31 + u.charCodeAt(i)) >>> 0;
    }
    if ((hash % 100) < pct) {
      canary.push(u);
    } else {
      stable.push(u);
    }
  }
  return { canary, stable };
}

/**
 * 回滚预案 V5（纯函数）：根据事故严重度生成回滚动作。
 *
 * @param incident 事故描述
 * @returns 回滚预案
 */
export function rollbackPlanV5(incident: { severity: "low" | "medium" | "high"; affectedUsers: number }): {
  targetVersion: string;
  action: string;
  estimatedMinutes: number;
} {
  if (incident.severity === "high") {
    return { targetVersion: "previous-stable", action: "立即全量回滚", estimatedMinutes: 10 };
  }
  if (incident.severity === "medium") {
    return { targetVersion: "previous-stable", action: "缩容灰度至0%", estimatedMinutes: 30 };
  }
  return { targetVersion: "current", action: "观察+热修复", estimatedMinutes: 60 };
}

/** 发布看板输出 */
export interface OpsReleaseV5Report {
  totalDeploys: number;
  rolledBackCount: number;
  canaryActive: number;
}

/**
 * 构建发布看板（纯函数）。
 *
 * @param deploys 部署列表
 * @returns 看板
 */
export function buildOpsReleaseV5Report(deploys: ReleaseDeploy[]): OpsReleaseV5Report {
  return {
    totalDeploys: deploys.length,
    rolledBackCount: deploys.filter((d) => d.status === "rolled-back").length,
    canaryActive: deploys.filter((d) => d.status === "routing").length,
  };
}
