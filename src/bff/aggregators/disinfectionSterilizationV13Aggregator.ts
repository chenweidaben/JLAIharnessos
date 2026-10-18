/**
 * 健澜科技 jlmedaios - 消毒灭菌管理 V13 纯函数（M441-C，医院感染管理组）
 *
 * computeDisinfectionQualifiedRateV13 / computeSterilizationQualifiedRateV13 / computeEndoscopeDisinfectionQualifiedRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 消毒灭菌管理记录 */
export interface DisinfectionSterilizationRecordV13 {
  disinfectionQualified: number;
  disinfectionTotal: number;
  sterilizationQualified: number;
  sterilizationTotal: number;
  endoscopeQualified: number;
  endoscopeTotal: number;
}

/**
 * 消毒合格率（纯函数）：消毒合格次数/消毒总次数×100，保留 2 位小数。
 *
 * @param records 消毒灭菌管理记录列表
 * @returns 消毒合格率百分比
 */
export function computeDisinfectionQualifiedRateV13(records: DisinfectionSterilizationRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.disinfectionTotal, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.disinfectionQualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 灭菌合格率（纯函数）：灭菌合格批次/灭菌总批次×100，保留 2 位小数。
 *
 * @param records 消毒灭菌管理记录列表
 * @returns 灭菌合格率百分比
 */
export function computeSterilizationQualifiedRateV13(records: DisinfectionSterilizationRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.sterilizationTotal, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.sterilizationQualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 内镜清洗消毒合格率（纯函数）：内镜清洗消毒合格次数/内镜清洗消毒总次数×100，保留 2 位小数。
 *
 * @param records 消毒灭菌管理记录列表
 * @returns 内镜清洗消毒合格率百分比
 */
export function computeEndoscopeDisinfectionQualifiedRateV13(records: DisinfectionSterilizationRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.endoscopeTotal, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.endoscopeQualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}
