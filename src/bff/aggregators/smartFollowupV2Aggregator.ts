/**
 * 健澜科技 jlmedaios - 患者智能随访纯函数 V2（M184-B）
 *
 * 与 M152-D 的 smartFollowupAggregator 互补：
 *   - buildSmartFollowup：按慢病/术后/用药/满意度生成随访节点
 *   - predictFollowupRisk：基于年龄/合并症/再入院次数的风险评分
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 随访类型 */
export type FollowupConditionV2 =
  | 'hypertension'
  | 'diabetes'
  | 'chd'
  | 'post_op'
  | 'medication'
  | 'satisfaction';

/** 单个随访节点 */
export interface FollowupNodeV2 {
  dayOffset: number;
  label: string;
  purpose: string;
}

/** 随访计划 */
export interface FollowupPlanV2 {
  patientId: string;
  condition: FollowupConditionV2;
  nodes: FollowupNodeV2[];
}

/** 再入院风险等级 */
export type RiskLevelV2 = 'low' | 'medium' | 'high';

/** 风险预测结果 */
export interface FollowupRiskV2 {
  patientId: string;
  riskLevel: RiskLevelV2;
  score: number;
  factors: string[];
}

/**
 * 根据疾病类型构建随访计划。
 *
 * @param patientId 患者 ID
 * @param condition 疾病类型
 * @returns 随访计划
 */
export function buildSmartFollowup(
  patientId: string,
  condition: FollowupConditionV2,
): FollowupPlanV2 {
  let nodes: FollowupNodeV2[] = [];

  switch (condition) {
    case 'hypertension':
      nodes = [
        { dayOffset: 7, label: '首周血压监测', purpose: '确认降压方案效果' },
        { dayOffset: 30, label: '月度随访', purpose: '血压评估 + 用药调整' },
        { dayOffset: 90, label: '季度随访', purpose: '靶器官损害筛查' },
      ];
      break;
    case 'diabetes':
      nodes = [
        { dayOffset: 3, label: '用药3天随访', purpose: '降糖药依从性 + 低血糖风险' },
        { dayOffset: 14, label: '两周血糖评估', purpose: '空腹/餐后血糖记录' },
        { dayOffset: 90, label: '季度HbA1c', purpose: '糖化血红蛋白复查' },
      ];
      break;
    case 'chd':
      nodes = [
        { dayOffset: 30, label: '月度症状评估', purpose: '心绞痛/心衰症状监测' },
        { dayOffset: 90, label: '季度心脏复查', purpose: '心电图 + 用药依从性' },
        { dayOffset: 180, label: '半年复查', purpose: '运动耐量 + 二级预防' },
      ];
      break;
    case 'post_op':
      nodes = [
        { dayOffset: 1, label: '术后第1天', purpose: '生命体征 + 伤口观察' },
        { dayOffset: 7, label: '术后第7天', purpose: '拆线/换药评估' },
        { dayOffset: 30, label: '术后30天', purpose: '恢复情况 + 并发症排查' },
        { dayOffset: 90, label: '术后90天', purpose: '功能恢复评估' },
      ];
      break;
    case 'medication':
      nodes = [
        { dayOffset: 3, label: '用药3天', purpose: '用药依从性 + 不良反应' },
        { dayOffset: 7, label: '用药7天', purpose: '症状改善评估' },
        { dayOffset: 30, label: '用药30天', purpose: '疗程结束评估' },
      ];
      break;
    case 'satisfaction':
      nodes = [
        { dayOffset: 3, label: '出院满意度调查', purpose: '出院后3天满意度回访' },
      ];
      break;
  }

  return { patientId, condition, nodes };
}

/**
 * 再入院风险预测（纯函数评分模型）。
 *
 * 评分项：
 *   - 年龄 ≥ 75：+2
 *   - 合并症 ≥ 3 种：+2
 *   - 过去6个月再入院 ≥ 1 次：+3
 *   - 慢病 ≥ 2 种：+1
 *
 * @param patientId 患者 ID
 * @param age 年龄
 * @param comorbidityCount 合并症数量
 * @param recentReadmissions 近6个月再入院次数
 * @param chronicConditions 慢病类型数量
 * @returns 风险预测结果
 */
export function predictFollowupRisk(
  patientId: string,
  age: number,
  comorbidityCount: number,
  recentReadmissions: number,
  chronicConditions: number,
): FollowupRiskV2 {
  let score = 0;
  const factors: string[] = [];

  if (age >= 75) {
    score += 2;
    factors.push('高龄（≥75岁）');
  }
  if (comorbidityCount >= 3) {
    score += 2;
    factors.push(`合并症${comorbidityCount}种`);
  }
  if (recentReadmissions >= 1) {
    score += 3;
    factors.push(`近6个月再入院${recentReadmissions}次`);
  }
  if (chronicConditions >= 2) {
    score += 1;
    factors.push(`慢病${chronicConditions}种`);
  }

  const riskLevel: RiskLevelV2 = score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low';

  return { patientId, riskLevel, score, factors };
}
