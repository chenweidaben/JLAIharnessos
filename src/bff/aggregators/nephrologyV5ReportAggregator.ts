/**
 * 健澜科技 jlmedaios - 肾病与血液净化管理 V5 纯函数（M265-B）
 *
 * buildNephrologyV5Report / stageCKDV5 / assessDialysisAdequacyV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * CKD 分期 V5（纯函数）。
 *
 * @param egfr eGFR
 * @param albuminuria 蛋白尿
 * @returns CKD
 */
export function stageCKDV5(egfr: { value: number }, albuminuria: { acr: number }): { stage: string; risk: string; progression: string } {
  let stage = "G1";
  if (egfr.value >= 90) stage = "G1";
  else if (egfr.value >= 60) stage = "G2";
  else if (egfr.value >= 45) stage = "G3a";
  else if (egfr.value >= 30) stage = "G3b";
  else if (egfr.value >= 15) stage = "G4";
  else stage = "G5";
  let risk = "低危";
  let progression = "每年复查";
  if (albuminuria.acr >= 300 || egfr.value < 30) {
    risk = "极高危";
    progression = "每3月复查+肾脏保护";
  } else if (albuminuria.acr >= 30 || egfr.value < 60) {
    risk = "中高危";
    progression = "每6月复查";
  }
  return { stage, risk, progression };
}

/**
 * 评估透析充分性 V5（纯函数）。
 *
 * @param kt_v Kt/V
 * @param ur UR
 * @returns 充分性
 */
export function assessDialysisAdequacyV5(kt_v: { value: number }, ur: { value: number }): { adequate: boolean; target: string; improvement: string[] } {
  const targetKtV = 1.2;
  const targetUr = 65;
  let adequate = true;
  const improvement: string[] = [];
  if (kt_v.value < targetKtV) {
    adequate = false;
    improvement.push("延长透析时间");
  }
  if (ur.value < targetUr) {
    adequate = false;
    improvement.push("增加透析频次");
  }
  return { adequate, target: `Kt/V ≥ ${targetKtV}, UR ≥ ${targetUr}%`, improvement };
}

/** 肾病与血液净化管理 V5 报告输出 */
export interface NephrologyV5Report {
  timeRange: string;
  aki: { grade: number; prerenal: number; intrarenal: number; postrenal: number; crrt: number; fluid: number; outcome: number };
  ckd: { stage1: number; stage2: number; stage3: number; stage4: number; stage5: number; egfr: number; proteinuria: number; complication: number; followup: number; slowProgression: number };
  dialysis: { hd: number; hdf: number; pd: number; access: number; dryWeight: number; adequacy: number };
  transplant: { matching: number; graft: number; postop: number; immunosuppression: number; infection: number; followup: number };
  electrolyte: { na: number; k: number; ca: number; p: number; mg: number; acidBase: number; diuretic: number; dialysisAdjustment: number };
  nephrotic: { proteinuria: number; hypoalbuminemia: number; edema: number; hyperlipidemia: number; steroid: number; immunosuppressant: number };
  gout: { nephroCollab: number; acuteFlare: number; urateLowering: number; diet: number; comorbidity: number };
  metrics: { akiIncidence: number; ckdProgression: number; dialysisAdequacy: number; readmission: number; mortality: number };
  suggestions: string[];
}

/**
 * 构建肾病与血液净化管理 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 肾病与血液净化管理 V5 报告
 */
export function buildNephrologyV5Report(timeRange: string): NephrologyV5Report {
  return {
    timeRange,
    aki: { grade: 2, prerenal: 50, intrarenal: 30, postrenal: 10, crrt: 20, fluid: 85, outcome: 70 },
    ckd: { stage1: 1000, stage2: 2000, stage3: 3000, stage4: 500, stage5: 200, egfr: 80, proteinuria: 70, complication: 60, followup: 85, slowProgression: 75 },
    dialysis: { hd: 300, hdf: 100, pd: 50, access: 95, dryWeight: 90, adequacy: 85 },
    transplant: { matching: 10, graft: 20, postop: 100, immunosuppression: 98, infection: 15, followup: 95 },
    electrolyte: { na: 95, k: 90, ca: 85, p: 80, mg: 85, acidBase: 90, diuretic: 75, dialysisAdjustment: 85 },
    nephrotic: { proteinuria: 100, hypoalbuminemia: 90, edema: 85, hyperlipidemia: 70, steroid: 90, immunosuppressant: 80 },
    gout: { nephroCollab: 70, acuteFlare: 200, urateLowering: 50, diet: 60, comorbidity: 70 },
    metrics: { akiIncidence: 5, ckdProgression: 10, dialysisAdequacy: 85, readmission: 15, mortality: 5 },
    suggestions: ["提升透析充分性", "加强 CKD 随访"],
  };
}
