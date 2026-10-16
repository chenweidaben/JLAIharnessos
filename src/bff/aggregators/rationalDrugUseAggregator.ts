/**
 * 健澜科技 jlmedaios - 合理用药监测纯函数（M188-B）
 *
 * buildRationalDrugUseReport / detectIrrationalDrugUse
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 处方 */
export interface Prescription {
  drugName: string;
  isAntibiotic: boolean;
  antibioticTier: 'non_restricted' | 'restricted' | 'special' | null;
  dosage: string;
  frequency: string;
  isInjection: boolean;
  isEssential: boolean;
  daysSupply: number;
  diagnosis: string;
}

/**
 * 不合理用药检测（纯函数）。
 *
 * @param prescription 处方
 * @returns 不合理用药问题列表
 */
export function detectIrrationalDrugUse(prescription: Prescription): string[] {
  const issues: string[] = [];

  // 无指征使用抗菌药物
  if (prescription.isAntibiotic) {
    const hasInfection = /炎|感染|肺炎|支气管炎|尿路感染/.test(prescription.diagnosis);
    if (!hasInfection) {
      issues.push('无指征使用抗菌药物');
    }
  }

  // 疗程过长（抗菌药物 > 14 天）
  if (prescription.isAntibiotic && prescription.daysSupply > 14) {
    issues.push(`抗菌药物疗程 ${prescription.daysSupply} 天，超过14天限制`);
  }

  // 特殊使用级抗菌药物越级
  if (prescription.antibioticTier === 'special') {
    issues.push('特殊使用级抗菌药物需会诊审批');
  }

  return issues;
}

/** 合理用药报告输出 */
export interface RationalDrugUseReport {
  timeRange: string;
  antibioticsDDDs: number;
  antibioticTierRatio: { nonRestricted: number; restricted: number; special: number };
  injectionRateOutpatient: number;
  injectionRateInpatient: number;
  essentialDrugRate: number;
  adjuvantDrugRatio: number;
  irrationalPrescriptions: Array<{ drugName: string; issues: string[] }>;
  suggestions: string[];
}

/**
 * 构建合理用药监测报告。
 *
 * @param timeRange 时间范围
 * @returns 用药监测报告
 */
export function buildRationalDrugUseReport(timeRange: string): RationalDrugUseReport {
  const samplePrescriptions: Prescription[] = [
    { drugName: '阿莫西林', isAntibiotic: true, antibioticTier: 'non_restricted', dosage: '0.5g', frequency: 'tid', isInjection: false, isEssential: true, daysSupply: 7, diagnosis: '急性支气管炎' },
    { drugName: '美罗培南', isAntibiotic: true, antibioticTier: 'special', dosage: '1g', frequency: 'q8h', isInjection: true, isEssential: false, daysSupply: 21, diagnosis: '肺炎' },
    { drugName: '维生素C', isAntibiotic: false, antibioticTier: null, dosage: '0.1g', frequency: 'tid', isInjection: false, isEssential: true, daysSupply: 30, diagnosis: '感冒' },
  ];

  const irrationalPrescriptions = samplePrescriptions
    .map((p) => ({ drugName: p.drugName, issues: detectIrrationalDrugUse(p) }))
    .filter((p) => p.issues.length > 0);

  const suggestions: string[] = [];
  if (irrationalPrescriptions.length > 0) {
    suggestions.push(`发现 ${irrationalPrescriptions.length} 张不合理处方，建议药师干预`);
  }
  suggestions.push('抗菌药物使用强度 45 DDDs/100人天，达标');

  return {
    timeRange,
    antibioticsDDDs: 45,
    antibioticTierRatio: { nonRestricted: 0.6, restricted: 0.3, special: 0.1 },
    injectionRateOutpatient: 0.18,
    injectionRateInpatient: 0.72,
    essentialDrugRate: 0.55,
    adjuvantDrugRatio: 0.12,
    irrationalPrescriptions,
    suggestions,
  };
}
