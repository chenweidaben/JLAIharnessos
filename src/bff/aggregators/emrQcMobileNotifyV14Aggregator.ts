/**
 * 健澜科技 jlmedaios - 质控移动端通知 V14 聚合器（M526-C）
 *
 * 纯函数：构建移动端通知基础数据 + 移动端通知 + 构建通知报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 移动端通知基础数据 */
export interface MobileNotifyV14 {
  notifier: string;
  notifyType: string;
}

/** 通知输入 */
export interface MobileNotifyInputV14 {
  recipients: string[];
  message: string;
}

/** 通知结果 */
export interface MobileNotifyResultV14 {
  sentCount: number;
  status: string;
}

/** 通知报告 */
export interface MobileNotifyReportV14 {
  sentCount: number;
  status: string;
}

/**
 * 构建移动端通知基础数据。
 *
 * @param notifier 通知人
 * @param notifyType 通知类型
 * @returns 移动端通知基础数据
 */
export function buildMobileNotify(notifier: string, notifyType: string): MobileNotifyV14 {
  return { notifier, notifyType };
}

/**
 * 移动端通知。
 * sentCount = recipients.length；status = sentCount > 0 ? '已发送' : '未发送'。
 *
 * @param input 通知输入（接收人列表 + 通知内容）
 * @returns 通知结果（sentCount + status）
 */
export function notifyOnMobile(input: MobileNotifyInputV14): MobileNotifyResultV14 {
  // 手算：sentCount = recipients.length
  // 测试2：recipients=['张医生','李医生','王医生'] → sentCount=3
  // 测试3：recipients=[] → sentCount=0
  const sentCount = input.recipients.length;
  // 手算：status = sentCount > 0 ? '已发送' : '未发送'
  // 测试2：sentCount=3 > 0 → status='已发送'
  // 测试3：sentCount=0 → status='未发送'
  const status = sentCount > 0 ? "已发送" : "未发送";
  return { sentCount, status };
}

/**
 * 构建通知报告。
 *
 * @param result 通知结果
 * @returns 通知报告（sentCount + status 透传）
 */
export function buildMobileNotifyReport(result: MobileNotifyResultV14): MobileNotifyReportV14 {
  // 手算：透传 sentCount + status
  // 测试4：{sentCount:3, status:'已发送'} → sentCount=3, status='已发送'
  return { sentCount: result.sentCount, status: result.status };
}
