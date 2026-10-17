/**
 * 健澜科技 jlmedaios - 护理文书统计 V13 纯函数（M376-B，stats 避让）
 *
 * computeNursingWritingPassRateV13 / computeNursingRecordCompletenessRateV13 / computeNursingDocumentTimelyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理文书统计记录 */
export interface NursingDocumentRecordV13 {
  writingCheckCount: number;
  writingPassCount: number;
  recordCount: number;
  recordCompleteCount: number;
  shouldWriteCount: number;
  timelyWriteCount: number;
}

/**
 * 护理书写合格率（纯函数）：合格数/检查数×100，保留 2 位小数。
 *
 * @param records 护理文书统计记录列表
 * @returns 护理书写合格率百分比
 */
export function computeNursingWritingPassRateV13(records: NursingDocumentRecordV13[]): number {
  const check = records.reduce((acc, r) => acc + r.writingCheckCount, 0);
  if (check === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.writingPassCount, 0);
  return Math.round((pass / check) * 10000) / 100;
}

/**
 * 护理记录完整率（纯函数）：完整数/记录数×100，保留 2 位小数。
 *
 * @param records 护理文书统计记录列表
 * @returns 护理记录完整率百分比
 */
export function computeNursingRecordCompletenessRateV13(records: NursingDocumentRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.recordCount, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.recordCompleteCount, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 护理文书及时率（纯函数）：及时数/应写数×100，保留 2 位小数。
 *
 * @param records 护理文书统计记录列表
 * @returns 护理文书及时率百分比
 */
export function computeNursingDocumentTimelyRateV13(records: NursingDocumentRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldWriteCount, 0);
  if (should === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyWriteCount, 0);
  return Math.round((timely / should) * 10000) / 100;
}
