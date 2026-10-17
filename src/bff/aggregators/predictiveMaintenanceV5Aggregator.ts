/**
 * 健澜科技 jlmedaios - 设备预测性维护 V5 纯函数（M279-C）
 *
 * predictFailureV5 / scheduleMaintenanceV5 / calculateMTBFV5 / buildPredictiveMaintenanceV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 设备 */
export interface Equipment {
  equipmentId: string;
  name: string;
  installDate: string;
  warrantyExpiry: string;
  runtimeHours: number;
  lastFailureHours: number;
  nextServiceDue: number;
}

/** 故障预测结果 */
export interface FailurePrediction {
  equipmentId: string;
  risk: "low" | "medium" | "high";
  recommendedServiceHours: number;
}

/**
 * 故障预测 V5（纯函数）：基于运行时长与距上次故障小时数。
 *
 * @param equipment 设备
 * @param avgFailureInterval 平均故障间隔小时
 * @returns 预测
 */
export function predictFailureV5(equipment: Equipment, avgFailureInterval: number): FailurePrediction {
  const sinceLast = equipment.runtimeHours - equipment.lastFailureHours;
  let risk: "low" | "medium" | "high" = "low";
  if (sinceLast >= avgFailureInterval * 0.9) risk = "high";
  else if (sinceLast >= avgFailureInterval * 0.6) risk = "medium";
  const recommendedServiceHours = Math.max(0, avgFailureInterval - sinceLast);
  return { equipmentId: equipment.equipmentId, risk, recommendedServiceHours };
}

/**
 * 保养排程 V5（纯函数）：高风险设备优先。
 *
 * @param equipment 设备
 * @param avgFailureInterval 平均间隔
 * @returns 保养建议
 */
export function scheduleMaintenanceV5(equipment: Equipment, avgFailureInterval: number): { equipmentId: string; priority: number; dueHours: number } {
  const pred = predictFailureV5(equipment, avgFailureInterval);
  let priority = 3;
  if (pred.risk === "high") priority = 1;
  else if (pred.risk === "medium") priority = 2;
  const dueHours = Math.max(0, equipment.nextServiceDue - equipment.runtimeHours);
  return { equipmentId: equipment.equipmentId, priority, dueHours };
}

/**
 * MTBF 计算 V5（纯函数）：总运行小时/故障次数。
 *
 * @param totalRuntimeHours 总运行小时
 * @param failureCount 故障次数
 * @returns MTBF（小时）
 */
export function calculateMTBFV5(totalRuntimeHours: number, failureCount: number): number {
  if (failureCount === 0) return totalRuntimeHours;
  return Math.round((totalRuntimeHours / failureCount) * 10) / 10;
}

/** 预测性维护报告输出 */
export interface PredictiveMaintenanceV5Report {
  totalEquipment: number;
  highRiskCount: number;
  avgMTBF: number;
  overdueCount: number;
  suggestions: string[];
}

/**
 * 构建预测性维护报告（纯函数）。
 *
 * @param equipment 设备列表
 * @param avgFailureInterval 平均故障间隔
 * @returns 报告
 */
export function buildPredictiveMaintenanceV5Report(
  equipment: Equipment[],
  avgFailureInterval: number,
): PredictiveMaintenanceV5Report {
  let highRiskCount = 0;
  let overdueCount = 0;
  let mtbfSum = 0;
  for (const e of equipment) {
    const pred = predictFailureV5(e, avgFailureInterval);
    if (pred.risk === "high") highRiskCount += 1;
    if (e.runtimeHours >= e.nextServiceDue) overdueCount += 1;
    mtbfSum += calculateMTBFV5(e.runtimeHours, Math.max(1, Math.round(e.runtimeHours / avgFailureInterval)));
  }
  const avgMTBF = equipment.length > 0 ? Math.round((mtbfSum / equipment.length) * 10) / 10 : 0;
  return {
    totalEquipment: equipment.length,
    highRiskCount,
    avgMTBF,
    overdueCount,
    suggestions: highRiskCount > 0
      ? [`${highRiskCount} 台设备高故障风险，建议立即安排预防性保养`]
      : ["设备健康状态良好，按周期保养"],
  };
}
