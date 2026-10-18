/**
 * 健澜科技 jlmedaios - 孕产妇护理管理 V13 纯函数（M428-B，换名避让旧版 maternalMgmtV13（M412，-care 后缀））
 *
 * computeMaternalMortalityRateV13 / computePostpartumHemorrhageRateV13 / computeCesareanSectionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 孕产妇护理管理记录 */
export interface MaternalCareMgmtRecordV13 {
  maternalDeath: number;
  liveBirth: number;
  postpartumHemorrhage: number;
  deliveryTotal: number;
  cesarean: number;
}

/**
 * 孕产妇死亡率（纯函数，1/10万，反向指标，值越低越好）：孕产妇死亡数/活产总数×100000/10万，保留 2 位小数。
 *
 * @param records 孕产妇护理管理记录列表
 * @returns 孕产妇死亡率（1/10万）
 */
export function computeMaternalMortalityRateV13(records: MaternalCareMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.liveBirth, 0);
  if (total === 0) return 0;
  const death = records.reduce((acc, r) => acc + r.maternalDeath, 0);
  return Math.round((death / total) * 10000000) / 100;
}

/**
 * 产后出血发生率（纯函数，百分率%，反向指标）：产后出血产妇数/分娩总数×100，保留 2 位小数。
 *
 * @param records 孕产妇护理管理记录列表
 * @returns 产后出血发生率百分比
 */
export function computePostpartumHemorrhageRateV13(records: MaternalCareMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.deliveryTotal, 0);
  if (total === 0) return 0;
  const hemorrhage = records.reduce((acc, r) => acc + r.postpartumHemorrhage, 0);
  return Math.round((hemorrhage / total) * 10000) / 100;
}

/**
 * 剖宫产率（纯函数，百分率%，控制指标）：剖宫产数/分娩总数×100，保留 2 位小数。
 *
 * @param records 孕产妇护理管理记录列表
 * @returns 剖宫产率百分比
 */
export function computeCesareanSectionRateV13(records: MaternalCareMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.deliveryTotal, 0);
  if (total === 0) return 0;
  const cesarean = records.reduce((acc, r) => acc + r.cesarean, 0);
  return Math.round((cesarean / total) * 10000) / 100;
}
