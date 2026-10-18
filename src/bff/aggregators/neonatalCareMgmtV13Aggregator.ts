/**
 * 健澜科技 jlmedaios - 新生儿护理管理 V13 纯函数（M428-A，换名避让旧版 neonatalMgmtV13（M412，-care 后缀））
 *
 * computeNeonatalMortalityRateV13 / computeNeonatalAsphyxiaOccurrenceRateV13 / computeNeonatalJaundiceMonitoringRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 新生儿护理管理记录 */
export interface NeonatalCareMgmtRecordV13 {
  neonatalDeath: number;
  liveBirth: number;
  asphyxia: number;
  jaundiceMonitored: number;
  neonatalTotal: number;
}

/**
 * 新生儿死亡率（纯函数，千分率‰，反向指标，值越低越好）：新生儿死亡数/活产总数×1000‰，保留 2 位小数。
 *
 * @param records 新生儿护理管理记录列表
 * @returns 新生儿死亡率（‰）
 */
export function computeNeonatalMortalityRateV13(records: NeonatalCareMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.liveBirth, 0);
  if (total === 0) return 0;
  const death = records.reduce((acc, r) => acc + r.neonatalDeath, 0);
  return Math.round((death / total) * 100000) / 100;
}

/**
 * 新生儿窒息发生率（纯函数，千分率‰，反向指标，值越低越好）：窒息新生儿数/活产总数×1000‰，保留 2 位小数。
 *
 * @param records 新生儿护理管理记录列表
 * @returns 新生儿窒息发生率（‰）
 */
export function computeNeonatalAsphyxiaOccurrenceRateV13(records: NeonatalCareMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.liveBirth, 0);
  if (total === 0) return 0;
  const asphyxia = records.reduce((acc, r) => acc + r.asphyxia, 0);
  return Math.round((asphyxia / total) * 100000) / 100;
}

/**
 * 新生儿黄疸监测率（纯函数，百分率%）：监测黄疸新生儿数/新生儿总数×100，保留 2 位小数。
 *
 * @param records 新生儿护理管理记录列表
 * @returns 新生儿黄疸监测率百分比
 */
export function computeNeonatalJaundiceMonitoringRateV13(records: NeonatalCareMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.neonatalTotal, 0);
  if (total === 0) return 0;
  const monitored = records.reduce((acc, r) => acc + r.jaundiceMonitored, 0);
  return Math.round((monitored / total) * 10000) / 100;
}
