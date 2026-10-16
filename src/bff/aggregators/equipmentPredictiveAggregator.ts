/**
 * 健澜科技 jlmedaios - 设备预测性维护纯函数（M184-C）
 *
 * predictEquipmentFailure：基于运行时长/故障历史/维护记录预测故障概率
 * schedulePreventiveMaintenance：根据风险等级排期预防性维护
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 设备历史记录 */
export interface EquipmentHistory {
  /** 累计运行小时 */
  totalRunHours: number;
  /** 近90天故障次数 */
  recentFailures: number;
  /** 上次维护距今天数 */
  daysSinceLastMaintenance: number;
  /** 设备年龄（年） */
  ageYears: number;
}

/** 风险等级 */
export type EquipmentRiskLevel = 'low' | 'medium' | 'high';

/** 故障预测结果 */
export interface EquipmentFailurePrediction {
  equipmentId: string;
  riskLevel: EquipmentRiskLevel;
  failureProbability: number;
  score: number;
  recommendation: string;
}

/** 预防性维护排期 */
export interface MaintenanceSchedule {
  equipmentId: string;
  riskLevel: EquipmentRiskLevel;
  recommendedWithinDays: number;
  action: string;
}

/**
 * 预测设备故障概率。
 *
 * 评分模型：
 *   - 运行时长 > 50000h：+3
 *   - 近90天故障 ≥ 2 次：+3
 *   - 距上次维护 > 180 天：+2
 *   - 设备年龄 > 10 年：+2
 *
 * 总分 ≥ 6 → high，≥ 3 → medium，否则 low。
 *
 * @param equipmentId 设备 ID
 * @param history 设备历史
 * @returns 故障预测结果
 */
export function predictEquipmentFailure(
  equipmentId: string,
  history: EquipmentHistory,
): EquipmentFailurePrediction {
  let score = 0;
  const factors: string[] = [];

  if (history.totalRunHours > 50000) {
    score += 3;
    factors.push('高运行时长');
  }
  if (history.recentFailures >= 2) {
    score += 3;
    factors.push(`近90天故障${history.recentFailures}次`);
  }
  if (history.daysSinceLastMaintenance > 180) {
    score += 2;
    factors.push(`距上次维护${history.daysSinceLastMaintenance}天`);
  }
  if (history.ageYears > 10) {
    score += 2;
    factors.push(`设备已使用${history.ageYears}年`);
  }

  const riskLevel: EquipmentRiskLevel = score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low';
  const failureProbability = Math.min(score / 10, 0.95);

  const recommendation =
    riskLevel === 'high'
      ? '建议7天内安排预防性维护，准备备用设备'
      : riskLevel === 'medium'
        ? '建议30天内安排巡检维护'
        : '按常规周期维护即可';

  return {
    equipmentId,
    riskLevel,
    failureProbability: Math.round(failureProbability * 100) / 100,
    score,
    recommendation,
  };
}

/**
 * 根据风险等级排期预防性维护。
 *
 * @param equipmentId 设备 ID
 * @param risk 预测风险结果
 * @returns 维护排期
 */
export function schedulePreventiveMaintenance(
  equipmentId: string,
  risk: EquipmentFailurePrediction,
): MaintenanceSchedule {
  if (risk.riskLevel === 'high') {
    return {
      equipmentId,
      riskLevel: 'high',
      recommendedWithinDays: 7,
      action: '立即安排专业工程师上门维护，必要时停机检查',
    };
  }
  if (risk.riskLevel === 'medium') {
    return {
      equipmentId,
      riskLevel: 'medium',
      recommendedWithinDays: 30,
      action: '月度巡检时重点检查，更换易损件',
    };
  }
  return {
    equipmentId,
    riskLevel: 'low',
    recommendedWithinDays: 90,
    action: '按季度常规维护即可',
  };
}
