/**
 * 健澜科技 jlmedaios - 健教材料推送 V13 纯函数（M326-D）
 *
 * countEducationByDiseaseV13 / computeReadRateV13 / computeForwardRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 健教材料 */
export interface EducationMaterialV13 {
  disease: string;
  isRead: boolean;
  isForwarded: boolean;
}

/** 病种分组项 */
export interface DiseaseGroupV13 {
  disease: string;
  count: number;
}

/**
 * 按病种推送量（纯函数）：分组计数。
 *
 * @param materials 材料列表
 * @returns 病种分组列表
 */
export function countEducationByDiseaseV13(materials: EducationMaterialV13[]): DiseaseGroupV13[] {
  const map = new Map<string, number>();
  for (const m of materials) {
    map.set(m.disease, (map.get(m.disease) ?? 0) + 1);
  }
  return [...map.entries()].map(([disease, count]) => ({ disease, count }));
}

/**
 * 阅读率（纯函数）：已读/推送×100。
 *
 * @param materials 材料列表
 * @returns 阅读率百分比
 */
export function computeReadRateV13(materials: EducationMaterialV13[]): number {
  if (materials.length === 0) return 0;
  const read = materials.filter((m) => m.isRead).length;
  return Math.round((read / materials.length) * 100);
}

/**
 * 转发率（纯函数）：转发数/推送×100。
 *
 * @param materials 材料列表
 * @returns 转发率百分比
 */
export function computeForwardRateV13(materials: EducationMaterialV13[]): number {
  if (materials.length === 0) return 0;
  const forwarded = materials.filter((m) => m.isForwarded).length;
  return Math.round((forwarded / materials.length) * 100);
}
