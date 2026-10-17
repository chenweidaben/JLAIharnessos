/**
 * 健澜科技 jlmedaios - 区域健康数据汇总 V13 纯函数（M324-A）
 *
 * compareOutpatientVolumeV13 / compareInpatientVolumeV13 / compareExamVolumeV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 区域医疗机构 */
export interface RegionalHospitalV13 {
  hospitalId: string;
  hospitalName: string;
  outpatientVolume: number;
  inpatientVolume: number;
  examVolume: number;
}

/** 排序结果项 */
export interface HospitalVolumeItemV13 {
  hospitalId: string;
  hospitalName: string;
  volume: number;
}

/**
 * 5 家医疗机构门诊量对比（纯函数）：按门诊量降序排序。
 *
 * @param hospitals 医疗机构列表
 * @returns 排序后的门诊量对比列表
 */
export function compareOutpatientVolumeV13(hospitals: RegionalHospitalV13[]): HospitalVolumeItemV13[] {
  return [...hospitals]
    .sort((a, b) => b.outpatientVolume - a.outpatientVolume)
    .map((h) => ({ hospitalId: h.hospitalId, hospitalName: h.hospitalName, volume: h.outpatientVolume }));
}

/**
 * 住院量对比（纯函数）：按住院量降序排序。
 *
 * @param hospitals 医疗机构列表
 * @returns 排序后的住院量对比列表
 */
export function compareInpatientVolumeV13(hospitals: RegionalHospitalV13[]): HospitalVolumeItemV13[] {
  return [...hospitals]
    .sort((a, b) => b.inpatientVolume - a.inpatientVolume)
    .map((h) => ({ hospitalId: h.hospitalId, hospitalName: h.hospitalName, volume: h.inpatientVolume }));
}

/**
 * 检查量对比（纯函数）：按检查量降序排序。
 *
 * @param hospitals 医疗机构列表
 * @returns 排序后的检查量对比列表
 */
export function compareExamVolumeV13(hospitals: RegionalHospitalV13[]): HospitalVolumeItemV13[] {
  return [...hospitals]
    .sort((a, b) => b.examVolume - a.examVolume)
    .map((h) => ({ hospitalId: h.hospitalId, hospitalName: h.hospitalName, volume: h.examVolume }));
}
