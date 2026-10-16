/**
 * 健澜科技 jlmedaios - 安宁疗护与缓和医疗 V5 纯函数（M272-A）
 *
 * assessPalliativeNeedV5 / managePainV5 / buildHospicePalliativeV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 安宁准入评估 V5（纯函数）。
 *
 * @param prognosis 预期生存期（月）
 * @param symptoms 症状数
 * @returns 准入结果
 */
export function assessPalliativeNeedV5(prognosis: number, symptoms: number): { eligible: boolean; level: string; reason: string } {
  let eligible = false;
  let level = "非准入";
  let reason = "预后>6月";
  if (prognosis <= 3 && symptoms >= 3) {
    eligible = true;
    level = "安宁";
    reason = "预后≤3月且症状≥3";
  } else if (prognosis <= 6 && symptoms >= 2) {
    eligible = true;
    level = "缓和";
    reason = "预后≤6月且症状≥2";
  }
  return { eligible, level, reason };
}

/**
 * 疼痛管理 V5（纯函数）。
 *
 * @param pain 疼痛评分 0-10
 * @param meds 已用药物数
 * @returns 疼痛管理
 */
export function managePainV5(pain: number, meds: number): { score: number; plan: string; controlled: boolean } {
  let plan = "观察";
  let controlled = false;
  if (pain >= 7) {
    plan = "阿片类+辅助药";
  } else if (pain >= 4) {
    plan = "弱阿片/NSAIDs";
  } else if (pain >= 1) {
    plan = "NSAIDs/非药物";
    controlled = true;
  } else {
    controlled = true;
  }
  if (meds >= 2 && pain < 4) {
    controlled = true;
  }
  return { score: pain, plan, controlled };
}

/** 安宁疗护与缓和医疗 V5 报告输出 */
export interface HospicePalliativeV5Report {
  timeRange: string;
  admission: { prognosis: number; expectedSurvival: number; multidisciplinary: number; familyCommunication: number; voluntary: number };
  symptom: { pain: number; dyspnea: number; nausea: number; delirium: number; pressureUlcer: number; nutrition: number; sleep: number; comfort: number };
  psychSpiritual: { psychSupport: number; spiritualCare: number; lifeMeaning: number; dignity: number; familyBereavement: number };
  decision: { acp: number; dnr: number; dni: number; noCpr: number; familyDecision: number };
  ward: { bed: number; visitation: number; familyStyle: number; accompaniment: number; farewell: number; familyLounge: number };
  homeHospice: { homeVisit: number; phone: number; remote: number; hotline24h: number; palliativeHomeTeam: number };
  bereavement: { mourningPeriod: number; complexBereavement: number; followup: number; counseling: number; memorial: number };
  metrics: { symptomControlRate: number; familySatisfaction: number; los: number; bedOccupancy: number; referralRate: number };
  suggestions: string[];
}

/**
 * 构建安宁疗护与缓和医疗 V5 报告（纯函数）。
 *
 * @param timeRange 时间范围
 * @returns 报告
 */
export function buildHospicePalliativeV5Report(timeRange: string): HospicePalliativeV5Report {
  return {
    timeRange,
    admission: { prognosis: 150, expectedSurvival: 150, multidisciplinary: 150, familyCommunication: 140, voluntary: 130 },
    symptom: { pain: 150, dyspnea: 80, nausea: 40, delirium: 20, pressureUlcer: 15, nutrition: 100, sleep: 90, comfort: 140 },
    psychSpiritual: { psychSupport: 120, spiritualCare: 80, lifeMeaning: 60, dignity: 130, familyBereavement: 100 },
    decision: { acp: 80, dnr: 60, dni: 40, noCpr: 55, familyDecision: 120 },
    ward: { bed: 30, visitation: 1, familyStyle: 30, accompaniment: 120, farewell: 10, familyLounge: 1 },
    homeHospice: { homeVisit: 60, phone: 100, remote: 30, hotline24h: 1, palliativeHomeTeam: 1 },
    bereavement: { mourningPeriod: 100, complexBereavement: 10, followup: 90, counseling: 50, memorial: 5 },
    metrics: { symptomControlRate: 85, familySatisfaction: 92, los: 14, bedOccupancy: 80, referralRate: 15 },
    suggestions: [
      "加强疼痛规范化管理，提升症状控制率",
      "扩大家属哀伤辅导覆盖",
      "推进居家安宁服务，减少住院日",
    ],
  };
}
