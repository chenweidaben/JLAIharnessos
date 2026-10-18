/**
 * 健澜科技 jlmedaios - 病历借阅登记管理 V14 聚合器（M540-B）
 *
 * 纯函数：构建借阅登记基础数据 + 借阅登记 + 构建登记报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 借阅登记基础数据 */
export interface BorrowRecordV14 {
  recordId: string;
  borrower: string;
}

/** 借阅登记输入 */
export interface BorrowRecordInputV14 {
  recordId: string;
  borrower: string;
  dept: string;
  borrowDate: string;
}

/** 借阅登记结果 */
export interface BorrowRecordResultV14 {
  recordId: string;
  status: string;
}

/** 登记报告 */
export interface BorrowRecordReportV14 {
  recordId: string;
  status: string;
}

/**
 * 构建借阅登记基础数据。
 *
 * @param recordId 病历ID
 * @param borrower 借阅人
 * @returns 借阅登记基础数据
 */
export function buildBorrowRecord(recordId: string, borrower: string): BorrowRecordV14 {
  return { recordId, borrower };
}

/**
 * 借阅登记。
 * recordId = input.recordId（透传）
 * status = '已登记'
 *
 * @param input 登记输入（病历ID + 借阅人 + 科室 + 借阅日期）
 * @returns 登记结果（recordId + status）
 */
export function registerBorrow(input: BorrowRecordInputV14): BorrowRecordResultV14 {
  // 手算：recordId = input.recordId（透传）
  // 测试2：recordId='REC701' → recordId='REC701'
  // 测试3：recordId='REC702' → recordId='REC702'
  const recordId = input.recordId;
  // 手算：status = '已登记'
  // 测试2：borrower='王医生', dept='心内科' → status='已登记'
  // 测试3：borrower='李医生', dept='呼吸科' → status='已登记'
  const status = "已登记";
  return { recordId, status };
}

/**
 * 构建登记报告。
 *
 * @param result 登记结果
 * @returns 登记报告（recordId + status 透传）
 */
export function buildBorrowRecordReport(result: BorrowRecordResultV14): BorrowRecordReportV14 {
  // 手算：透传 recordId + status
  // 测试4：{recordId='REC701', status='已登记'} → recordId='REC701', status='已登记'
  return { recordId: result.recordId, status: result.status };
}
