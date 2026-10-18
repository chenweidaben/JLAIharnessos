/**
 * 健澜科技 jlmedaios - 病历借阅登记 V14 聚合器（M482-B）
 *
 * 纯函数：借阅登记构建 + 超期归还检查。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 借阅登记记录 */
export interface BorrowRecordV14 {
  medicalRecordId: string;
  borrower: string;
  borrowDays: number;
}

/** 超期归还检查结果 */
export interface OverdueReturnV14 {
  overdue: boolean;
  overdueDays: number;
}

/**
 * 构建借阅登记。
 *
 * @param medicalRecordId 病历号
 * @param borrower 借阅人
 * @param borrowDays 借阅天数
 * @returns 借阅登记
 */
export function buildBorrowRecord(medicalRecordId: string, borrower: string, borrowDays: number): BorrowRecordV14 {
  return { medicalRecordId, borrower, borrowDays };
}

/**
 * 检查超期归还：borrowDays > maxDays 视为超期。
 *
 * @param borrowDays 实际借阅天数
 * @param maxDays 最大允许天数
 * @returns 超期检查结果
 */
export function checkOverdueReturn(borrowDays: number, maxDays: number): OverdueReturnV14 {
  const overdue = borrowDays > maxDays;
  const overdueDays = overdue ? borrowDays - maxDays : 0;
  return { overdue, overdueDays };
}
