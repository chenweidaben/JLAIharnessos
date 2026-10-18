/**
 * 健澜科技 jlmedaios - 住院医师规范化培训 V13 纯函数（M443-A，教学科研与继续教育管理组）
 *
 * computeResidencyTrainingCoverageRateV13 / computeResidencyTrainingGraduationPassRateV13 / computeResidencyTrainingFacultyQualifiedRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 住院医师规范化培训记录 */
export interface ResidencyTrainingMgmtRecordV13 {
  residencyTrained: number;
  shouldTrained: number;
  graduationPassed: number;
  graduationExam: number;
  facultyQualified: number;
  totalFaculty: number;
}

/**
 * 住培覆盖率（纯函数）：已参加住培医师数/应参加住培医师总数×100，保留 2 位小数。
 *
 * @param records 住院医师规范化培训记录列表
 * @returns 住培覆盖率百分比
 */
export function computeResidencyTrainingCoverageRateV13(records: ResidencyTrainingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldTrained, 0);
  if (total === 0) return 0;
  const trained = records.reduce((acc, r) => acc + r.residencyTrained, 0);
  return Math.round((trained / total) * 10000) / 100;
}

/**
 * 结业考核通过率（纯函数）：结业考核通过人数/结业考核参考人数×100，保留 2 位小数。
 *
 * @param records 住院医师规范化培训记录列表
 * @returns 结业考核通过率百分比
 */
export function computeResidencyTrainingGraduationPassRateV13(records: ResidencyTrainingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.graduationExam, 0);
  if (total === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.graduationPassed, 0);
  return Math.round((passed / total) * 10000) / 100;
}

/**
 * 师资带教合格率（纯函数）：带教合格师资数/带教师资总数×100，保留 2 位小数。
 *
 * @param records 住院医师规范化培训记录列表
 * @returns 师资带教合格率百分比
 */
export function computeResidencyTrainingFacultyQualifiedRateV13(records: ResidencyTrainingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalFaculty, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.facultyQualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}
