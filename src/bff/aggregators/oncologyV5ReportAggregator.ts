/**
 * 健澜科技 jlmedaios - 肿瘤全程管理 V5 纯函数（M264-A）
 *
 * buildOncologyV5Report / stageTumorV5 / recommendTumorRegimenV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 肿瘤分期 V5（纯函数）。
 *
 * @param primary 原发灶
 * @param nodes 淋巴结
 * @param mets 转移
 * @returns 分期
 */
export function stageTumorV5(primary: { t: number }, nodes: { n: number }, mets: { m: number }): { stage: string; group: string; treatment: string } {
  let stage = "I期";
  let group = "早期";
  let treatment = "手术为主";
  if (mets.m === 1) {
    stage = "IV期";
    group = "晚期";
    treatment = "全身治疗为主";
  } else if (nodes.n >= 2 || primary.t >= 3) {
    stage = "III期";
    group = "局部晚期";
    treatment = "放化疗+手术";
  } else if (nodes.n === 1) {
    stage = "II期";
    group = "中期";
    treatment = "手术+辅助治疗";
  }
  return { stage, group, treatment };
}

/**
 * 推荐肿瘤方案 V5（纯函数）。
 *
 * @param tumor 肿瘤
 * @param profile 分子分型
 * @returns 方案
 */
export function recommendTumorRegimenV5(tumor: { type: string }, profile: { egfr: boolean; pdL1: number }): { regimen: string; reason: string } {
  let regimen = "化疗+免疫";
  let reason = "常规方案";
  if (tumor.type === "肺癌" && profile.egfr) {
    regimen = "EGFR-TKI 靶向";
    reason = "EGFR 突变";
  } else if (tumor.type === "肺癌" && profile.pdL1 >= 50) {
    regimen = "单药免疫";
    reason = "PD-L1 高表达";
  } else if (tumor.type === "乳腺癌") {
    regimen = "内分泌+CDK4/6";
    reason = "HR+/HER2-";
  }
  return { regimen, reason };
}

/** 肿瘤全程管理 V5 报告输出 */
export interface OncologyV5Report {
  timeRange: string;
  screening: { lungLDCT: number; giColonoscopy: number; mammogram: number; cervicalHPV: number; highRisk: number };
  diagnosis: { pathology: number; imaging: number; tnm: number; molecular: number; mdt: number; radiomics: number };
  treatment: { surgery: number; chemo: number; radiation: number; targeted: number; immuno: number; endocrine: number; mdtRegimen: number };
  delivery: { pivas: number; chemoPlan: number; orSchedule: number; targeted: number; infusion: number };
  efficacy: { recist: number; imaging: number; marker: number; pfs: number; os: number; adverse: number };
  followup: { postop: number; chemoCycle: number; review: number; recurrenceAlert: number; qol: number };
  supportive: { pain: number; symptom: number; nutrition: number; psychology: number; hospice: number; familySupport: number };
  registry: { cancerRegistry: number; followupRate: number; survival: number; incidence: number; qc: number; report: number };
  metrics: { followupRate: number; survival: number; incidence: number; mdt: number };
  suggestions: string[];
}

/**
 * 构建肿瘤全程管理 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 肿瘤全程管理 V5 报告
 */
export function buildOncologyV5Report(timeRange: string): OncologyV5Report {
  return {
    timeRange,
    screening: { lungLDCT: 500, giColonoscopy: 1000, mammogram: 800, cervicalHPV: 600, highRisk: 200 },
    diagnosis: { pathology: 95, imaging: 98, tnm: 90, molecular: 70, mdt: 85, radiomics: 60 },
    treatment: { surgery: 800, chemo: 1500, radiation: 500, targeted: 300, immuno: 200, endocrine: 400, mdtRegimen: 85 },
    delivery: { pivas: 100, chemoPlan: 90, orSchedule: 95, targeted: 95, infusion: 98 },
    efficacy: { recist: 85, imaging: 90, marker: 80, pfs: 12, os: 30, adverse: 10 },
    followup: { postop: 90, chemoCycle: 85, review: 80, recurrenceAlert: 70, qol: 75 },
    supportive: { pain: 80, symptom: 75, nutrition: 70, psychology: 65, hospice: 80, familySupport: 75 },
    registry: { cancerRegistry: 100, followupRate: 90, survival: 60, incidence: 500, qc: 90, report: 100 },
    metrics: { followupRate: 90, survival: 60, incidence: 500, mdt: 85 },
    suggestions: ["提升 MDT 参与率", "加强安宁疗护"],
  };
}
