/**
 * 健澜科技 jlmedaios - 器械管理 V13 纯函数（M391-D，M391 收官）
 *
 * computeSurgeryInstrumentPackQualificationRateV13 / computeSterilizationQualificationRateV13 / computeInstrumentTraceabilityRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 器械管理记录 */
export interface InstrumentMgmtRecordV13 {
  qualifiedPackCount: number;
  totalPackCount: number;
  qualifiedSterilizeCount: number;
  totalSterilizeCount: number;
  traceableCount: number;
  totalInstrumentCount: number;
}

/**
 * 手术器械包合格率（纯函数）：合格包数/检查包总数×100，保留 2 位小数。
 *
 * @param records 器械管理记录列表
 * @returns 手术器械包合格率百分比
 */
export function computeSurgeryInstrumentPackQualificationRateV13(records: InstrumentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalPackCount, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedPackCount, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 灭菌合格率（纯函数）：合格灭菌数/灭菌总数×100，保留 2 位小数。
 *
 * @param records 器械管理记录列表
 * @returns 灭菌合格率百分比
 */
export function computeSterilizationQualificationRateV13(records: InstrumentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSterilizeCount, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedSterilizeCount, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 器械追溯率（纯函数）：可追溯器械数/器械总数×100，保留 2 位小数。
 *
 * @param records 器械管理记录列表
 * @returns 器械追溯率百分比
 */
export function computeInstrumentTraceabilityRateV13(records: InstrumentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalInstrumentCount, 0);
  if (total === 0) return 0;
  const traceable = records.reduce((acc, r) => acc + r.traceableCount, 0);
  return Math.round((traceable / total) * 10000) / 100;
}
