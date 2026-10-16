/**
 * 健澜科技 jlmedaios - 呼吸系统疾病管理 V5 纯函数（M264-C）
 *
 * buildPulmonologyV5Report / classifyCOPDV5 / assessAsthmaControlV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * COPD 分级 V5（纯函数）。
 *
 * @param feve1 FEV1%
 * @param symptoms 症状
 * @returns COPD
 */
export function classifyCOPDV5(feve1: { percent: number }, symptoms: { mMRC: number; exacerbation: number }): { grade: string; group: string; therapy: string } {
  let grade = "G1";
  if (feve1.percent >= 80) grade = "G1";
  else if (feve1.percent >= 50) grade = "G2";
  else if (feve1.percent >= 30) grade = "G3";
  else grade = "G4";
  let group = "A组";
  let therapy = "支气管扩张剂";
  if (symptoms.mMRC >= 2 || symptoms.exacerbation >= 2) {
    group = "E组";
    therapy = "ICS+LABA";
  } else if (symptoms.mMRC >= 2) {
    group = "B组";
    therapy = "LABA+LAMA";
  }
  return { grade, group, therapy };
}

/**
 * 哮喘控制评估 V5（纯函数）。
 *
 * @param act ACT 评分
 * @param symptoms 症状
 * @returns 控制
 */
export function assessAsthmaControlV5(act: { score: number }, symptoms: { nocturnal: number; exacerbation: number }): { control: string; level: string; action: string } {
  let control = "完全控制";
  let level = "良好";
  let action = "维持用药";
  if (act.score < 20 || symptoms.exacerbation >= 2) {
    control = "未控制";
    level = "差";
    action = "升级治疗";
  } else if (act.score < 25 || symptoms.nocturnal >= 1) {
    control = "部分控制";
    level = "一般";
    action = "调整用药";
  }
  return { control, level, action };
}

/** 呼吸系统疾病管理 V5 报告输出 */
export interface PulmonologyV5Report {
  timeRange: string;
  copd: { pft: number; mmrc: number; cat: number; bronchodilator: number; inhalerTechnique: number; exacerbation: number };
  asthma: { gina: number; controlTest: number; ics: number; reliever: number; peakFlow: number; attack: number };
  pneumonia: { curb65: number; antibiotic: number; course: number; efficacy: number; followup: number };
  ild: { hrct: number; classification: number; steroid: number; immunosuppressant: number; followup: number };
  osa: { psg: number; ahi: number; cpap: number; weight: number; comorbidity: number };
  intervention: { bronchoscopy: number; ebus: number; cryobiopsy: number; tumor: number };
  rehab: { exercise: number; breathing: number; nutrition: number; psychology: number; ltOT: number };
  metrics: { exacerbationRate: number; readmission: number; pft: number; mortality: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建呼吸系统疾病管理 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 呼吸系统疾病管理 V5 报告
 */
export function buildPulmonologyV5Report(timeRange: string): PulmonologyV5Report {
  return {
    timeRange,
    copd: { pft: 90, mmrc: 85, cat: 80, bronchodilator: 95, inhalerTechnique: 75, exacerbation: 20 },
    asthma: { gina: 90, controlTest: 85, ics: 80, reliever: 95, peakFlow: 70, attack: 10 },
    pneumonia: { curb65: 90, antibiotic: 95, course: 90, efficacy: 85, followup: 80 },
    ild: { hrct: 85, classification: 80, steroid: 70, immunosuppressant: 60, followup: 75 },
    osa: { psg: 200, ahi: 15, cpap: 60, weight: 50, comorbidity: 70 },
    intervention: { bronchoscopy: 500, ebus: 100, cryobiopsy: 50, tumor: 80 },
    rehab: { exercise: 75, breathing: 80, nutrition: 70, psychology: 65, ltOT: 40 },
    metrics: { exacerbationRate: 20, readmission: 15, pft: 90, mortality: 5, satisfaction: 85 },
    suggestions: ["提升吸入技术正确率", "加强肺康复"],
  };
}
