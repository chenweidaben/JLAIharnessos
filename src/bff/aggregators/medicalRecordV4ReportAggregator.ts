/**
 * 健澜科技 jlmedaios - 病案 V4 纯函数（M252-B）
 *
 * buildMedicalRecordV4Report / assessCodingAccuracyV4 / calculateRecordGradeV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估编码准确率 V4（纯函数）。
 *
 * @param coded 已编码
 * @param reviewed 已审核
 * @returns 准确率
 */
export function assessCodingAccuracyV4(coded: number, reviewed: number): { accuracy: number; adequate: boolean } {
  const accuracy = Math.round((reviewed / Math.max(coded, 1)) * 1000) / 10;
  return { accuracy, adequate: accuracy >= 95 };
}

/**
 * 计算病案等级 V4（纯函数）。
 *
 * @param records 病案数
 * @param defects 缺陷数
 * @returns 等级
 */
export function calculateRecordGradeV4(records: number, defects: number): { grade: string; gradeA: number; gradeC: number } {
  const defectRate = defects / Math.max(records, 1);
  let grade = "甲级";
  if (defectRate > 0.05) grade = "丙级";
  else if (defectRate > 0.02) grade = "乙级";
  const gradeA = Math.round(records * (1 - defectRate));
  const gradeC = Math.round(records * defectRate);
  return { grade, gradeA, gradeC };
}

/** 病案 V4 报告输出 */
export interface MedicalRecordV4Report {
  timeRange: string;
  retrieval: { discharge: number; returnRate: number; missing: number };
  archive: { numbering: number; binding: number; digitize: number; borrow: number };
  coding: { icd10: number; icd9: number; accuracy: number; ai: number };
  quality: { active: number; final: number; gradeA: number; gradeC: number; aiQc: number };
  copy: { application: number; audit: number; mail: number; eOnline: number };
  stat: { drg: number; dip: number; cmi: number };
  suggestions: string[];
}

/**
 * 构建病案 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 病案 V4 报告
 */
export function buildMedicalRecordV4Report(timeRange: string): MedicalRecordV4Report {
  return {
    timeRange,
    retrieval: { discharge: 5000, returnRate: 98, missing: 100 },
    archive: { numbering: 5000, binding: 4900, digitize: 80, borrow: 200 },
    coding: { icd10: 5000, icd9: 2000, accuracy: 96, ai: 90 },
    quality: { active: 3000, final: 5000, gradeA: 4800, gradeC: 50, aiQc: 95 },
    copy: { application: 500, audit: 480, mail: 200, eOnline: 1000 },
    stat: { drg: 4000, dip: 4500, cmi: 1.2 },
    suggestions: ["提升编码准确率", "降低丙级病案率"],
  };
}
