/**
 * 健澜科技 jlmedaios - 灾备与高可用 V5 纯函数（M286-D）
 *
 * checkBackupV5 / simulateFailoverV5 / assessRPO_RTOV5 / buildOpsDRV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 灾备计划 */
export interface DRPlan {
  system: string;
  rpoMinutes: number;
  rtoMinutes: number;
  backupFreqMinutes: number;
  lastBackupAt: number;
  status: "healthy" | "stale" | "failed";
}

/** 故障切换事件 */
export interface FailoverEvent {
  system: string;
  triggeredAt: number;
  switchTo: string;
  recoveredAt?: number;
}

/**
 * 备份新鲜度 V5（纯函数）：按 backupFreq 判定健康/过期/失败。
 *
 * @param plan 灾备计划
 * @param now 当前时间戳
 * @returns 备份状态
 */
export function checkBackupV5(plan: DRPlan, now: number): { fresh: boolean; ageMinutes: number } {
  const ageMs = now - plan.lastBackupAt;
  const ageMinutes = Math.round(ageMs / 60000);
  const fresh = ageMinutes <= plan.backupFreqMinutes * 2;
  return { fresh, ageMinutes };
}

/**
 * 切换演练 V5（纯函数）：模拟切换时间。
 *
 * @param plan 灾备计划
 * @returns 演练结果
 */
export function simulateFailoverV5(plan: DRPlan): { feasible: boolean; estimatedSwitchMinutes: number } {
  // 演练可达性：RTO >= 15 分钟才具备演练切换能力
  const feasible = plan.rtoMinutes >= 15;
  return {
    feasible,
    estimatedSwitchMinutes: Math.round(plan.rtoMinutes * 0.8 * 10) / 10,
  };
}

/**
 * RPO/RTO 达标 V5（纯函数）：按 lastBackupAge 评估。
 *
 * @param plan 灾备计划
 * @param lastBackupAgeMinutes 上次备份距今天数（分钟）
 * @returns 达标
 */
export function assessRPO_RTOV5(plan: DRPlan, lastBackupAgeMinutes: number): {
  rpoMet: boolean;
  rtoMet: boolean;
  grade: "A" | "B" | "C";
} {
  const rpoMet = lastBackupAgeMinutes <= plan.rpoMinutes;
  // RTO 为设计值，>=30 即达标
  const rtoMet = plan.rtoMinutes >= 30;
  let grade: "A" | "B" | "C" = "C";
  if (rpoMet && rtoMet) grade = "A";
  else if (rpoMet || rtoMet) grade = "B";
  return { rpoMet, rtoMet, grade };
}

/** 灾备看板输出 */
export interface OpsDRV5Report {
  totalSystems: number;
  healthyCount: number;
  gradeA: number;
}

/**
 * 构建灾备看板（纯函数）。
 *
 * @param plans 计划列表
 * @param now 当前时间戳
 * @returns 看板
 */
export function buildOpsDRV5Report(plans: DRPlan[], now: number): OpsDRV5Report {
  let healthyCount = 0;
  let gradeA = 0;
  for (const p of plans) {
    const check = checkBackupV5(p, now);
    if (check.fresh) healthyCount += 1;
    const age = Math.max(0, Math.round((now - p.lastBackupAt) / 60000));
    const assess = assessRPO_RTOV5(p, age);
    if (assess.grade === "A") gradeA += 1;
  }
  return {
    totalSystems: plans.length,
    healthyCount,
    gradeA,
  };
}
