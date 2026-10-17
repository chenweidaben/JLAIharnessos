/**
 * 健澜科技 jlmedaios - 管理者 MUSE 工作台 V5 纯函数（M283-D）
 *
 * buildManagerDailyV5 / detectAnomalyKpiV5 / suggestDecisionV5 / buildMuseManagerV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** KPI 指标 */
export interface KpiMetric {
  name: string;
  value: number;
  target: number;
  baseline: number;
}

/**
 * KPI 异常检测 V5（纯函数）：偏离目标超20%或低于基线80%即异常。
 *
 * @param kpi KPI
 * @returns 是否异常与原因
 */
export function detectAnomalyKpiV5(kpi: KpiMetric): { anomaly: boolean; deviationPct: number; reason: string } {
  const deviationPct = kpi.target > 0
    ? Math.round(((kpi.value - kpi.target) / kpi.target) * 1000) / 10
    : 0;
  let anomaly = false;
  let reason = "正常";
  if (kpi.value < kpi.target * 0.8) {
    anomaly = true;
    reason = "低于目标80%";
  } else if (kpi.value > kpi.target * 1.2) {
    anomaly = true;
    reason = "超出目标20%";
  } else if (kpi.value < kpi.baseline * 0.7) {
    anomaly = true;
    reason = "低于历史基线70%";
  }
  return { anomaly, deviationPct, reason };
}

/**
 * 决策建议 V5（纯函数）：按异常类型给建议。
 *
 * @param kpi 异常 KPI
 * @returns 建议
 */
export function suggestDecisionV5(kpi: KpiMetric): { suggestion: string; priority: "low" | "medium" | "high" } {
  const detection = detectAnomalyKpiV5(kpi);
  if (!detection.anomaly) return { suggestion: "保持当前运营策略", priority: "low" };
  if (kpi.name.includes("周转率")) return { suggestion: "优化入院流程，缩短平均住院日", priority: "high" };
  if (kpi.name.includes("满意度")) return { suggestion: "启动患者体验改进专项", priority: "medium" };
  return { suggestion: "组织专题分析会", priority: "medium" };
}

/**
 * 管理者日工作台 V5（纯函数）。
 *
 * @param managerId 管理者ID
 * @param kpis KPI 列表
 * @returns 工作台摘要
 */
export function buildManagerDailyV5(managerId: string, kpis: KpiMetric[]): {
  managerId: string;
  totalKpis: number;
  anomalyCount: number;
  topAnomaly: KpiMetric | null;
} {
  const anomalies = kpis.filter((k) => detectAnomalyKpiV5(k).anomaly);
  const sorted = [...anomalies].sort((a, b) => {
    const da = Math.abs(detectAnomalyKpiV5(a).deviationPct);
    const db = Math.abs(detectAnomalyKpiV5(b).deviationPct);
    return db - da;
  });
  return {
    managerId,
    totalKpis: kpis.length,
    anomalyCount: anomalies.length,
    topAnomaly: sorted[0] ?? null,
  };
}

/** 管理者看板输出 */
export interface MuseManagerV5Report {
  totalManagers: number;
  avgAnomalyPerManager: number;
}

/**
 * 构建管理者看板（纯函数）。
 *
 * @param summaries 各管理者摘要
 * @returns 看板
 */
export function buildMuseManagerV5Report(summaries: { anomalyCount: number }[]): MuseManagerV5Report {
  const avgAnomalyPerManager = summaries.length > 0
    ? Math.round((summaries.reduce((s, x) => s + x.anomalyCount, 0) / summaries.length) * 10) / 10
    : 0;
  return { totalManagers: summaries.length, avgAnomalyPerManager };
}
