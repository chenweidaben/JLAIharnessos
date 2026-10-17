/**
 * 健澜科技 jlmedaios - 出院用药重整 V13 纯函数（M314-C）
 *
 * compareMedicationListV13 / detectMissingMedsV13 / detectDuplicateMedsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药物 */
export interface MedicationV13 {
  genericName: string;
  dosage: string;
}

/** 用药差异结果 */
export interface MedicationDiffV13 {
  added: MedicationV13[];
  stopped: MedicationV13[];
  continued: MedicationV13[];
}

/**
 * 差异对比（纯函数）：新增/停用/继续。
 *
 * @param admissionMeds 入院用药
 * @param dischargeMeds 出院用药
 * @returns 差异
 */
export function compareMedicationListV13(
  admissionMeds: MedicationV13[],
  dischargeMeds: MedicationV13[],
): MedicationDiffV13 {
  const admissionNames = new Set(admissionMeds.map((m) => m.genericName));
  const dischargeNames = new Set(dischargeMeds.map((m) => m.genericName));
  return {
    added: dischargeMeds.filter((m) => !admissionNames.has(m.genericName)),
    stopped: admissionMeds.filter((m) => !dischargeNames.has(m.genericName)),
    continued: admissionMeds.filter((m) => dischargeNames.has(m.genericName)),
  };
}

/**
 * 遗漏识别（纯函数）：入院有出院无 → 遗漏。
 *
 * @param admissionMeds 入院用药
 * @param dischargeMeds 出院用药
 * @returns 遗漏药物
 */
export function detectMissingMedsV13(
  admissionMeds: MedicationV13[],
  dischargeMeds: MedicationV13[],
): MedicationV13[] {
  return compareMedicationListV13(admissionMeds, dischargeMeds).stopped;
}

/**
 * 重复识别（纯函数）：同通用名≥2 → 重复。
 *
 * @param meds 用药列表
 * @returns 重复通用名列表
 */
export function detectDuplicateMedsV13(meds: MedicationV13[]): string[] {
  const counts = new Map<string, number>();
  for (const m of meds) {
    counts.set(m.genericName, (counts.get(m.genericName) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, c]) => c >= 2)
    .map(([name]) => name);
}
