/**
 * 健澜科技 jlmedaios - 公共卫生管理纯函数（M192-C）
 *
 * buildPublicHealthReport / calculateChronicDiseaseControlRate / predictEpidemicTrend
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 慢病数据 */
export interface ChronicDiseaseData {
  hypertension: { registered: number; controlled: number };
  diabetes: { registered: number; controlled: number };
  coronary: { registered: number; controlled: number };
  stroke: { registered: number; controlled: number };
}

/**
 * 慢病控制率计算（纯函数）。
 *
 * @param data 慢病数据
 * @returns 总体控制率
 */
export function calculateChronicDiseaseControlRate(data: ChronicDiseaseData): number {
  const totalRegistered = data.hypertension.registered + data.diabetes.registered + data.coronary.registered + data.stroke.registered;
  const totalControlled = data.hypertension.controlled + data.diabetes.controlled + data.coronary.controlled + data.stroke.controlled;
  if (totalRegistered === 0) return 0;
  return Math.round((totalControlled / totalRegistered) * 1000) / 10;
}

/**
 * 疫情趋势预测（纯函数）。
 *
 * @param history 历史病例数
 * @returns 趋势预测
 */
export function predictEpidemicTrend(history: number[]): { trend: 'up' | 'down' | 'flat'; forecast: number } {
  if (history.length < 3) return { trend: 'flat', forecast: 0 };
  const recent = history.slice(-3);
  const avg = recent.reduce((a, b) => a + b, 0) / 3;
  const prevAvg = history.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (avg > prevAvg * 1.2) trend = 'up';
  else if (avg < prevAvg * 0.8) trend = 'down';
  return { trend, forecast: Math.round(avg) };
}

/** 公卫报告输出 */
export interface PublicHealthReport {
  dept: string;
  timeRange: string;
  infectiousDiseases: { classA: number; classB: number; classC: number; timeliness: number };
  chronicControlRate: number;
  immunization: { firstClassRate: number; secondClassRate: number; adverseReaction: number };
  maternalChild: { prenatalCheckRate: number; postnatalVisitRate: number };
  elderlyHealth: { managed: number; assessmentRate: number };
  healthEducation: { sessions: number; attendees: number };
  emergency: { events: number; responseTime: number };
  suggestions: string[];
}

/**
 * 构建公共卫生报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 公卫报告
 */
export function buildPublicHealthReport(dept: string, timeRange: string): PublicHealthReport {
  const chronicData: ChronicDiseaseData = {
    hypertension: { registered: 5000, controlled: 3500 },
    diabetes: { registered: 3000, controlled: 1800 },
    coronary: { registered: 1500, controlled: 900 },
    stroke: { registered: 1200, controlled: 720 },
  };

  const chronicControlRate = calculateChronicDiseaseControlRate(chronicData);

  const suggestions: string[] = [];
  if (chronicControlRate < 60) {
    suggestions.push('慢病控制率偏低，建议加强随访管理');
  }
  suggestions.push('建议加强传染病预警体系建设');

  return {
    dept,
    timeRange,
    infectiousDiseases: { classA: 0, classB: 45, classC: 120, timeliness: 0.98 },
    chronicControlRate,
    immunization: { firstClassRate: 0.99, secondClassRate: 0.85, adverseReaction: 2 },
    maternalChild: { prenatalCheckRate: 0.95, postnatalVisitRate: 0.92 },
    elderlyHealth: { managed: 8000, assessmentRate: 0.9 },
    healthEducation: { sessions: 60, attendees: 6000 },
    emergency: { events: 2, responseTime: 15 },
    suggestions,
  };
}
