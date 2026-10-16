/**
 * 健澜科技 jlmedaios - 智慧药房纯函数（M214-D）
 *
 * buildSmartPharmacyReport / assessDispensingAccuracy / generateMedicationReminder
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估调配准确率（纯函数）。
 *
 * @param dispensed 调配总数
 * @param errors 错误数
 * @returns 准确率
 */
export function assessDispensingAccuracy(dispensed: number, errors: number): { rate: number; level: string } {
  const rate = dispensed > 0 ? (dispensed - errors) / dispensed : 0;
  let level = '达标';
  if (rate >= 0.999) level = '优秀';
  else if (rate < 0.99) level = '不达标';
  return { rate, level };
}

/** 用药提醒 */
export interface MedicationReminder {
  drug: string;
  frequency: string;
}

/**
 * 生成用药提醒（纯函数）。
 *
 * @param prescription 处方
 * @returns 提醒文本
 */
export function generateMedicationReminder(prescription: MedicationReminder): string {
  return `请按医嘱服用 ${prescription.drug}，${prescription.frequency}`;
}

/** 智慧药房报告输出 */
export interface SmartPharmacyReport {
  timeRange: string;
  automated: { pharmacy: boolean; smartCabinet: number };
  pivas: { prepared: number };
  tcm: { decoctionPieces: number; granules: number; decoction: number; paste: number };
  consultation: { counseling: number };
  chronic: { adherence: number };
  specialPopulation: { elderly: number; pediatric: number; pregnant: number };
  tdm: { tests: number; genetic: number };
  suggestions: string[];
}

/**
 * 构建智慧药房报告。
 *
 * @param timeRange 时间范围
 * @returns 智慧药房报告
 */
export function buildSmartPharmacyReport(timeRange: string): SmartPharmacyReport {
  return {
    timeRange,
    automated: { pharmacy: true, smartCabinet: 50 },
    pivas: { prepared: 20000 },
    tcm: { decoctionPieces: 1000, granules: 2000, decoction: 5000, paste: 200 },
    consultation: { counseling: 1000 },
    chronic: { adherence: 0.85 },
    specialPopulation: { elderly: 500, pediatric: 200, pregnant: 50 },
    tdm: { tests: 300, genetic: 50 },
    suggestions: ['提高调配准确率', '加强慢病用药依从性管理'],
  };
}
