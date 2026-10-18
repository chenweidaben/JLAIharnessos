/**
 * 健澜科技 jlmedaios - 病历借阅归还管理 V14 聚合器（M534-D，M534 收官）
 *
 * 纯函数：构建借阅归还基础数据 + 借阅归还记录 + 构建归还报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 借阅归还基础数据 */
export interface LoanReturnV14 {
  recordId: string;
  borrower: string;
}

/** 借阅归还记录输入 */
export interface LoanReturnInputV14 {
  recordId: string;
  borrowedDate: string;
  returnedDate: string | null;
}

/** 借阅归还记录结果 */
export interface LoanReturnResultV14 {
  returned: boolean;
  overdueDays: number;
}

/** 归还报告 */
export interface LoanReturnReportV14 {
  returned: boolean;
  overdueDays: number;
  hint: string;
}

/**
 * 构建借阅归还基础数据。
 *
 * @param recordId 病历ID
 * @param borrower 借阅人
 * @returns 借阅归还基础数据
 */
export function buildLoanReturn(recordId: string, borrower: string): LoanReturnV14 {
  return { recordId, borrower };
}

/**
 * 借阅归还记录。
 * returned = returnedDate !== null；overdueDays = returned ? 0 : 7。
 *
 * @param input 记录输入（病历ID + 借出日期 + 归还日期）
 * @returns 记录结果（returned + overdueDays）
 */
export function recordLoanReturn(input: LoanReturnInputV14): LoanReturnResultV14 {
  // 手算：returned = returnedDate !== null
  // 测试2：returnedDate='2026-10-12'（非 null）→ returned=true
  // 测试3：returnedDate=null → returned=false
  const returned = input.returnedDate !== null;
  // 手算：overdueDays = returned ? 0 : 7
  // 测试2：returned=true → overdueDays=0
  // 测试3：returned=false → overdueDays=7
  const overdueDays = returned ? 0 : 7;
  return { returned, overdueDays };
}

/**
 * 构建归还报告。
 * returned → hint='已归还'；否则 → hint='逾期未还'。
 *
 * @param result 记录结果
 * @returns 归还报告（returned + overdueDays + hint）
 */
export function buildLoanReturnReport(result: LoanReturnResultV14): LoanReturnReportV14 {
  // 手算：hint = returned ? '已归还' : '逾期未还'
  // 测试4：{returned=false, overdueDays=7} → hint='逾期未还'
  const hint = result.returned ? "已归还" : "逾期未还";
  return { returned: result.returned, overdueDays: result.overdueDays, hint };
}
