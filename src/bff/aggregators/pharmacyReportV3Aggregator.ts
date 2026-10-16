/**
 * 健澜科技 jlmedaios - 药房药事深化 V3 纯函数（M204-C）
 *
 * buildPharmacyReportV3 / checkPrescriptionSafety / assessAntibioticUse
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 处方数据 */
export interface PrescriptionData {
  drugName: string;
  doseMg: number;
  frequency: string;
  patientAge: number;
  liverDysfunction: boolean;
}

/**
 * 处方安全检查（纯函数）。
 *
 * @param rx 处方数据
 * @returns 安全检查结果
 */
export function checkPrescriptionSafety(rx: PrescriptionData): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (rx.patientAge >= 65 && rx.doseMg > 500) warnings.push('老年患者剂量偏大');
  if (rx.liverDysfunction && rx.drugName.includes('对乙酰氨基酚')) warnings.push('肝功能不全慎用对乙酰氨基酚');
  if (rx.frequency === 'qd' && rx.doseMg > 1000) warnings.push('单次剂量超过 1000mg');
  return { safe: warnings.length === 0, warnings };
}

/**
 * 评估抗菌药物使用（纯函数）。
 *
 * @param ddd DDD 值
 * @returns 评估结果
 */
export function assessAntibioticUse(ddd: number): { level: string; target: boolean } {
  let level = '合理';
  if (ddd > 40) level = '超标';
  else if (ddd > 30) level = '偏高';
  return { level, target: ddd <= 40 };
}

/** 药房 V3 报告输出 */
export interface PharmacyReportV3 {
  timeRange: string;
  outpatient: { prescriptions: number; reviewed: number; intervention: number };
  inpatient: { medications: number; wardPharmacy: number };
  pivas: { admixtures: number; errors: number };
  antibiotics: { ddd: number; usageRate: number; specialLevelConsult: number; cultureRate: number };
  narcotic: { fiveSpecialtyCompliant: boolean };
  clinical: { wardRound: number; consultation: number; monitoring: number };
  adr: { reported: number; analyzed: number };
  suggestions: string[];
}

/**
 * 构建药房 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 药房 V3 报告
 */
export function buildPharmacyReportV3(timeRange: string): PharmacyReportV3 {
  return {
    timeRange,
    outpatient: { prescriptions: 50000, reviewed: 50000, intervention: 800 },
    inpatient: { medications: 200000, wardPharmacy: 30 },
    pivas: { admixtures: 50000, errors: 5 },
    antibiotics: { ddd: 35, usageRate: 0.5, specialLevelConsult: 100, cultureRate: 0.8 },
    narcotic: { fiveSpecialtyCompliant: true },
    clinical: { wardRound: 200, consultation: 50, monitoring: 1000 },
    adr: { reported: 150, analyzed: 140 },
    suggestions: ['降低抗菌药物 DDD', '提高 ADR 上报率'],
  };
}
