/**
 * 健澜科技 jlmedaios - 心血管疾病管理 V5 纯函数（M264-B）
 *
 * buildCardiologyV5Report / stratifyHypertensionV5 / assessHeartFailureV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 高血压分层 V5（纯函数）。
 *
 * @param bp 血压
 * @param risk 危险因素
 * @returns 分层
 */
export function stratifyHypertensionV5(bp: { systolic: number; diastolic: number }, risk: { age: number; smoking: boolean; diabetes: boolean; targetOrgan: boolean }): { grade: number; riskLevel: string; target: number } {
  let grade = 1;
  if (bp.systolic >= 180 || bp.diastolic >= 110) grade = 3;
  else if (bp.systolic >= 160 || bp.diastolic >= 100) grade = 2;
  let riskLevel = "低危";
  let target = 140;
  if (risk.targetOrgan || risk.diabetes) {
    riskLevel = "很高危";
    target = 130;
  } else if (grade >= 2 || risk.smoking || risk.age >= 65) {
    riskLevel = "中危";
    if (grade === 3) riskLevel = "高危";
  }
  return { grade, riskLevel, target };
}

/**
 * 评估心衰 V5（纯函数）。
 *
 * @param bnp BNP
 * @param symptoms 症状
 * @param echo 超声
 * @returns 心衰
 */
export function assessHeartFailureV5(bnp: { value: number }, symptoms: { dyspnea: boolean; edema: boolean }, echo: { ef: number }): { classification: string; severity: string; readmissionRisk: string } {
  let classification = "HFrEF";
  if (echo.ef >= 50) classification = "HFpEF";
  else if (echo.ef >= 40) classification = "HFmrEF";
  let severity = "轻度";
  let readmissionRisk = "低";
  if (bnp.value >= 1000 && symptoms.dyspnea) {
    severity = "重度";
    readmissionRisk = "高";
  } else if (bnp.value >= 400 || symptoms.edema) {
    severity = "中度";
    readmissionRisk = "中";
  }
  return { classification, severity, readmissionRisk };
}

/** 心血管疾病管理 V5 报告输出 */
export interface CardiologyV5Report {
  timeRange: string;
  coronary: { angina: number; mi: number; pci: number; cabg: number; dapt: number; secondaryPrevention: number; followup: number };
  arrhythmia: { af: number; pvc: number; svt: number; ablation: number; pacemaker: number; icd: number; holter: number };
  heartFailure: { acute: number; chronic: number; bnp: number; ntProBnp: number; diuretic: number; readmission: number; weightMonitor: number };
  hypertension: { grade: number; riskStratification: number; homeBP: number; medAdjustment: number; targetOrgan: number };
  lipid: { ldlc: number; statin: number; ezetimibe: number; pcsk9: number; lipidTarget: number };
  structural: { dcm: number; hcm: number; valve: number; echo: number; surgery: number; intervention: number };
  rehab: { phase1: number; phase2: number; phase3: number; exercise: number; psychology: number; nutrition: number; smoking: number };
  metrics: { readmission: number; mortality: number; controlRate: number; intervention: number; los: number };
  suggestions: string[];
}

/**
 * 构建心血管疾病管理 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 心血管疾病管理 V5 报告
 */
export function buildCardiologyV5Report(timeRange: string): CardiologyV5Report {
  return {
    timeRange,
    coronary: { angina: 5000, mi: 500, pci: 400, cabg: 100, dapt: 95, secondaryPrevention: 90, followup: 85 },
    arrhythmia: { af: 2000, pvc: 1000, svt: 300, ablation: 200, pacemaker: 100, icd: 50, holter: 3000 },
    heartFailure: { acute: 300, chronic: 2000, bnp: 95, ntProBnp: 90, diuretic: 85, readmission: 15, weightMonitor: 70 },
    hypertension: { grade: 2, riskStratification: 85, homeBP: 80, medAdjustment: 75, targetOrgan: 60 },
    lipid: { ldlc: 2000, statin: 90, ezetimibe: 30, pcsk9: 10, lipidTarget: 60 },
    structural: { dcm: 100, hcm: 50, valve: 300, echo: 5000, surgery: 50, intervention: 100 },
    rehab: { phase1: 80, phase2: 60, phase3: 40, exercise: 75, psychology: 65, nutrition: 70, smoking: 80 },
    metrics: { readmission: 15, mortality: 3, controlRate: 70, intervention: 500, los: 7 },
    suggestions: ["提升双抗依从性", "加强心衰随访"],
  };
}
