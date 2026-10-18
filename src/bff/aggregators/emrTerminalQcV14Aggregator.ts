/**
 * 健澜科技 jlmedaios - 终末质控 V14 聚合器（M480-D，M480 收官）
 *
 * 纯函数：终末质控记录构建 + 质控结果提交。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 终末质控记录 */
export interface TerminalQcV14 {
  medicalRecordId: string;
  dept: string;
}

/** 终末质控提交结果 */
export interface TerminalQcSubmissionV14 {
  medicalRecordId: string;
  dept: string;
  score: number;
  passed: boolean;
  submittedAt: string;
}

/**
 * 构建终末质控记录。
 *
 * @param medicalRecordId 病历号
 * @param dept 科室
 * @returns 终末质控记录
 */
export function buildTerminalQc(medicalRecordId: string, dept: string): TerminalQcV14 {
  return { medicalRecordId, dept };
}

/**
 * 提交终末质控结果。
 *
 * @param record 质控记录
 * @param result 质控结果（score/passed）
 * @returns 提交记录（含 submittedAt ISO 时间戳）
 */
export function submitTerminalQc(
  record: TerminalQcV14,
  result: { score: number; passed: boolean },
): TerminalQcSubmissionV14 {
  return {
    medicalRecordId: record.medicalRecordId,
    dept: record.dept,
    score: result.score,
    passed: result.passed,
    submittedAt: new Date().toISOString(),
  };
}
