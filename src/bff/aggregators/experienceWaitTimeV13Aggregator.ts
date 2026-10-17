/**
 * 健澜科技 jlmedaios - 就医体验（等候时间）V13 纯函数（M365-D，M365 收官）
 *
 * computeRegistrationWaitTimeV13 / computeConsultationWaitTimeV13 / computeExaminationWaitTimeV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 就医体验（等候时间）记录 */
export interface ExperienceWaitTimeRecordV13 {
  registrationWaitTime: number;
  consultationWaitTime: number;
  examinationWaitTime: number;
}

/**
 * 挂号等候时间（纯函数）：均值，单位分钟，保留 2 位小数。
 *
 * @param records 就医体验记录列表
 * @returns 挂号等候时间均值（分钟）
 */
export function computeRegistrationWaitTimeV13(records: ExperienceWaitTimeRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.registrationWaitTime, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 就诊等候时间（纯函数）：均值，单位分钟，保留 2 位小数。
 *
 * @param records 就医体验记录列表
 * @returns 就诊等候时间均值（分钟）
 */
export function computeConsultationWaitTimeV13(records: ExperienceWaitTimeRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.consultationWaitTime, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 检查等候时间（纯函数）：均值，单位分钟，保留 2 位小数。
 *
 * @param records 就医体验记录列表
 * @returns 检查等候时间均值（分钟）
 */
export function computeExaminationWaitTimeV13(records: ExperienceWaitTimeRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.examinationWaitTime, 0);
  return Math.round((sum / records.length) * 100) / 100;
}
