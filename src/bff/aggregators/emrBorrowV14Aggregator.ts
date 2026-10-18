/**
 * 健澜科技 jlmedaios - 病历借阅复印管理 V14 聚合器（M462-C）
 *
 * 纯函数：借阅状态机判断 + 应还日期计算。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 借阅状态 */
export type BorrowStatusV14 = "available" | "borrowed" | "returned";

/** 借阅记录 */
export interface BorrowRecordV14 {
  id: string;
  patientName: string;
  medicalRecordNumber: string;
  status: BorrowStatusV14;
  appliedAt?: string;
  dueDate?: string;
}

/** 可借阅判断结果 */
export interface CanBorrowResultV14 {
  borrowable: boolean;
  reason?: string;
}

/**
 * 判断是否可借阅。
 *
 * @param record 借阅记录
 * @returns borrowable + 不可借阅时的 reason
 */
export function canBorrow(record: BorrowRecordV14): CanBorrowResultV14 {
  if (record.status === "borrowed") {
    return { borrowable: false, reason: "已借出，不可重复借阅" };
  }
  return { borrowable: true };
}

/**
 * 计算应还日期（appliedAt + borrowDays 天）。
 *
 * @param appliedAt 申请时间（ISO）
 * @param borrowDays 借阅天数（默认 7）
 * @returns 应还日期 ISO 串
 */
export function computeReturnDueDate(appliedAt: string, borrowDays = 7): string {
  const appliedMs = new Date(appliedAt).getTime();
  if (Number.isNaN(appliedMs)) return appliedAt;
  const dueMs = appliedMs + borrowDays * 24 * 60 * 60 * 1000;
  return new Date(dueMs).toISOString();
}
