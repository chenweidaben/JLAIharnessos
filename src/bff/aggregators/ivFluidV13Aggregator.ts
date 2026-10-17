/**
 * 健澜科技 jlmedaios - 静脉输液率 V13 纯函数（M336-D）
 *
 * computeOutpatientIVRateV13 / computeInpatientIVRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 静脉输液率记录 */
export interface IVFluidRecordV13 {
  outpatientTotalVisits: number;
  outpatientIVVisits: number;
  inpatientTotalPatients: number;
  inpatientIVPatients: number;
}

/**
 * 门诊输液率（纯函数）：输液人次/门诊总人次×100。
 *
 * @param records 静脉输液率记录列表
 * @returns 门诊输液率百分比
 */
export function computeOutpatientIVRateV13(records: IVFluidRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.outpatientTotalVisits, 0);
  const iv = records.reduce((acc, r) => acc + r.outpatientIVVisits, 0);
  if (total === 0) return 0;
  return Math.round((iv / total) * 100);
}

/**
 * 住院输液率（纯函数）：输液患者数/住院患者数×100。
 *
 * @param records 静脉输液率记录列表
 * @returns 住院输液率百分比
 */
export function computeInpatientIVRateV13(records: IVFluidRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inpatientTotalPatients, 0);
  const iv = records.reduce((acc, r) => acc + r.inpatientIVPatients, 0);
  if (total === 0) return 0;
  return Math.round((iv / total) * 100);
}
