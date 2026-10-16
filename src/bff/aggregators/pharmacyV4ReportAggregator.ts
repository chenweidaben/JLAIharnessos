/**
 * 健澜科技 jlmedaios - 药房药事 V4 纯函数（M251-C）
 *
 * buildPharmacyV4Report / reviewPrescriptionV4 / assessAntibioticUseV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 审核处方 V4（纯函数）。
 *
 * @param rx 处方
 * @param patient 患者
 * @returns 审核
 */
export function reviewPrescriptionV4(rx: { drug: string; dose: number; frequency: string }, patient: { age: number; renal: number }): { drug: string; approved: boolean; reason: string } {
  let approved = true;
  let reason = "通过";
  if (patient.age >= 65 && rx.dose > 10) {
    approved = false;
    reason = "老年剂量过高";
  }
  if (patient.renal < 50 && rx.frequency === "tid") {
    approved = false;
    reason = "肾功能不全需调整";
  }
  return { drug: rx.drug, approved, reason };
}

/**
 * 评估抗菌药物使用 V4（纯函数）。
 *
 * @param ddds DDDs
 * @param days 天数
 * @returns 评估
 */
export function assessAntibioticUseV4(ddds: number, days: number): { dddsPer100: number; useRate: number; target: boolean } {
  const dddsPer100 = Math.round((ddds / Math.max(days, 1)) * 100);
  const useRate = Math.round((ddds / Math.max(days, 1)) * 100);
  return { dddsPer100, useRate, target: dddsPer100 <= 40 };
}

/** 药房 V4 报告输出 */
export interface PharmacyV4Report {
  timeRange: string;
  outpatient: { dispensing: number; counseling: number; smartPharmacy: number };
  inpatient: { dose: number; check: number; delivery: number; discharge: number };
  pivas: { pn: number; chemo: number; sterile: number };
  review: { preReview: number; rational: number; antibiotic: number; steroid: number };
  supply: { procurement: number; expiry: number; narcotic: number; coldChain: number };
  clinical: { mdt: number; adr: number; reconciliation: number; pharmacyClinic: number };
  suggestions: string[];
}

/**
 * 构建药房 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 药房 V4 报告
 */
export function buildPharmacyV4Report(timeRange: string): PharmacyV4Report {
  return {
    timeRange,
    outpatient: { dispensing: 50000, counseling: 5000, smartPharmacy: 80 },
    inpatient: { dose: 20000, check: 19000, delivery: 20000, discharge: 3000 },
    pivas: { pn: 200, chemo: 50, sterile: 250 },
    review: { preReview: 50000, rational: 95, antibiotic: 30, steroid: 10 },
    supply: { procurement: 1000, expiry: 50, narcotic: 100, coldChain: 95 },
    clinical: { mdt: 100, adr: 30, reconciliation: 500, pharmacyClinic: 200 },
    suggestions: ["提升前置审核率", "降低抗菌药物使用强度"],
  };
}
