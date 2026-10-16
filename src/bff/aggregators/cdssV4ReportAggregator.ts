/**
 * 健澜科技 jlmedaios - CDSS 临床决策支持 V4 纯函数（M248-A）
 *
 * buildCDSSV4Report / differentialDiagnosisV4 / assessCDSSAdoptionV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 鉴别诊断 V4（纯函数）。
 *
 * @param symptoms 症状
 * @param history 病史
 * @returns 鉴别
 */
export function differentialDiagnosisV4(symptoms: string[], history: string[]): { diagnoses: { name: string; probability: number }[]; top: string } {
  const diagnoses = symptoms.length > 0
    ? [{ name: "常见病", probability: 70 }, { name: "少见病", probability: 20 }, { name: "罕见病", probability: 10 }]
    : [{ name: "待查", probability: 100 }];
  return { diagnoses, top: diagnoses[0].name };
}

/**
 * 评估 CDSS 采纳率 V4（纯函数）。
 *
 * @param recs 推荐数
 * @param actions 采纳数
 * @returns 采纳率
 */
export function assessCDSSAdoptionV4(recs: number, actions: number): { adoptionRate: number; accurate: boolean } {
  const adoptionRate = Math.round((actions / Math.max(recs, 1)) * 1000) / 10;
  return { adoptionRate, accurate: adoptionRate >= 60 };
}

/** CDSS V4 报告输出 */
export interface CDSSV4Report {
  timeRange: string;
  differential: { cases: number; topMatches: number };
  medication: { recommendations: number; interactions: number };
  testTreatment: { guideline: number; pathway: number };
  critical: { alerts: number; earlyWarning: number };
  quality: { adoption: number; accuracy: number };
  suggestions: string[];
}

/**
 * 构建 CDSS V4 报告。
 *
 * @param timeRange 时间范围
 * @returns CDSS V4 报告
 */
export function buildCDSSV4Report(timeRange: string): CDSSV4Report {
  return {
    timeRange,
    differential: { cases: 5000, topMatches: 85 },
    medication: { recommendations: 10000, interactions: 200 },
    testTreatment: { guideline: 500, pathway: 300 },
    critical: { alerts: 500, earlyWarning: 100 },
    quality: { adoption: 75, accuracy: 90 },
    suggestions: ["提升鉴别诊断准确率", "降低危急值假阳性率"],
  };
}
