/**
 * 健澜科技 jlmedaios - 病历归还提醒 V14 聚合器（M540-C）
 *
 * 纯函数：构建归还提醒基础数据 + 逾期检测 + 构建提醒报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 归还提醒基础数据 */
export interface ReturnRemindV14 {
  recordId: string;
  borrower: string;
}

/** 逾期检测输入 */
export interface ReturnRemindInputV14 {
  borrowDays: number;
  overdueThreshold: number;
}

/** 逾期检测结果 */
export interface ReturnRemindResultV14 {
  overdue: boolean;
  remindLevel: string;
}

/** 提醒报告 */
export interface ReturnRemindReportV14 {
  overdue: boolean;
  remindLevel: string;
}

/**
 * 构建归还提醒基础数据。
 *
 * @param recordId 病历ID
 * @param borrower 借阅人
 * @returns 归还提醒基础数据
 */
export function buildReturnRemind(recordId: string, borrower: string): ReturnRemindV14 {
  return { recordId, borrower };
}

/**
 * 逾期检测。
 * overdue = borrowDays > overdueThreshold
 * remindLevel = overdue ? (borrowDays > overdueThreshold + 7 ? '紧急提醒' : '普通提醒') : '无需提醒'
 *
 * @param input 检测输入（借阅天数 + 逾期阈值）
 * @returns 检测结果（overdue + remindLevel）
 */
export function detectOverdue(input: ReturnRemindInputV14): ReturnRemindResultV14 {
  // 手算：overdue = borrowDays > overdueThreshold
  // 测试2：borrowDays=5, overdueThreshold=7 → 5 > 7 = false → overdue=false
  // 测试3：borrowDays=10, overdueThreshold=7 → 10 > 7 = true → overdue=true
  const overdue = input.borrowDays > input.overdueThreshold;
  // 手算：remindLevel = overdue ? (borrowDays > overdueThreshold + 7 ? '紧急提醒' : '普通提醒') : '无需提醒'
  // 测试2：overdue=false → remindLevel='无需提醒'
  // 测试3：overdue=true，borrowDays=10, overdueThreshold+7=14，10 > 14 = false → remindLevel='普通提醒'
  const remindLevel = overdue
    ? input.borrowDays > input.overdueThreshold + 7
      ? "紧急提醒"
      : "普通提醒"
    : "无需提醒";
  return { overdue, remindLevel };
}

/**
 * 构建提醒报告。
 *
 * @param result 检测结果
 * @returns 提醒报告（overdue + remindLevel 透传）
 */
export function buildReturnRemindReport(result: ReturnRemindResultV14): ReturnRemindReportV14 {
  // 手算：透传 overdue + remindLevel
  // 测试4：{overdue=true, remindLevel='普通提醒'} → overdue=true, remindLevel='普通提醒'
  return { overdue: result.overdue, remindLevel: result.remindLevel };
}
