/**
 * 健澜科技 jlmedaios - 质控指标预警 V14 聚合器（M483-C）
 *
 * 纯函数：预警规则构建 + 指标预警检查。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 预警规则 */
export interface AlertRuleV14 {
  metricName: string;
  threshold: number;
  direction: "below" | "above";
}

/** 预警触发结果 */
export interface AlertTriggerV14 {
  triggered: boolean;
  message: string;
}

/**
 * 构建预警规则。
 *
 * @param metricName 指标名
 * @param threshold 阈值
 * @param direction 方向（below：低于阈值触发；above：高于阈值触发）
 * @returns 预警规则
 */
export function buildAlertRule(metricName: string, threshold: number, direction: "below" | "above"): AlertRuleV14 {
  return { metricName, threshold, direction };
}

/**
 * 检查指标是否触发预警。
 * below：currentValue < threshold 触发；above：currentValue > threshold 触发。
 *
 * @param rule 预警规则
 * @param currentValue 当前值
 * @returns 预警触发结果
 */
export function checkMetricAlert(rule: AlertRuleV14, currentValue: number): AlertTriggerV14 {
  if (rule.direction === "below" && currentValue < rule.threshold) {
    return { triggered: true, message: `${rule.metricName}=${currentValue} 低于阈值 ${rule.threshold}` };
  }
  if (rule.direction === "above" && currentValue > rule.threshold) {
    return { triggered: true, message: `${rule.metricName}=${currentValue} 高于阈值 ${rule.threshold}` };
  }
  return { triggered: false, message: `${rule.metricName}=${currentValue} 正常` };
}
