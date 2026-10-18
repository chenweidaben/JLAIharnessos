/**
 * 健澜科技 jlmedaios - 病历归档预约 V14 聚合器（M541-A）
 *
 * 纯函数：构建归档预约基础数据 + 创建归档预约 + 构建预约报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 归档预约基础数据 */
export interface ArchiveAppointV14 {
  recordId: string;
  dept: string;
}

/** 创建归档预约输入 */
export interface ArchiveAppointInputV14 {
  recordId: string;
  appointDate: string;
  operator: string;
}

/** 创建归档预约结果 */
export interface ArchiveAppointResultV14 {
  appointmentNo: string;
  status: string;
}

/** 预约报告 */
export interface ArchiveAppointReportV14 {
  appointmentNo: string;
  status: string;
}

/**
 * 构建归档预约基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 归档预约基础数据
 */
export function buildArchiveAppoint(recordId: string, dept: string): ArchiveAppointV14 {
  return { recordId, dept };
}

/**
 * 创建归档预约。
 * appointmentNo = 'ARC' + Date.now().toString().slice(-6)
 * status = '已预约'
 *
 * @param input 创建输入（病历ID + 预约日期 + 操作员）
 * @returns 创建结果（appointmentNo + status）
 */
export function createArchiveAppoint(input: ArchiveAppointInputV14): ArchiveAppointResultV14 {
  // 手算：appointmentNo = 'ARC' + Date.now().toString().slice(-6)
  // 测试2：recordId='REC800', appointDate='2026-10-25' → appointmentNo 以 'ARC' 开头
  // 测试3：recordId='REC801', appointDate='2026-10-26' → appointmentNo 以 'ARC' 开头
  const appointmentNo = "ARC" + Date.now().toString().slice(-6);
  // 手算：status = '已预约'
  // 测试2：operator='张护士' → status='已预约'
  // 测试3：operator='李护士' → status='已预约'
  const status = "已预约";
  return { appointmentNo, status };
}

/**
 * 构建预约报告。
 *
 * @param result 创建结果
 * @returns 预约报告（appointmentNo + status 透传）
 */
export function buildArchiveAppointReport(result: ArchiveAppointResultV14): ArchiveAppointReportV14 {
  // 手算：透传 appointmentNo + status
  // 测试4：{appointmentNo='ARC123456', status='已预约'} → appointmentNo='ARC123456', status='已预约'
  return { appointmentNo: result.appointmentNo, status: result.status };
}
