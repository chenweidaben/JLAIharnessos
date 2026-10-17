/**
 * 健澜科技 jlmedaios - 便民服务 V13 纯函数（M378-D，M378 收官）
 *
 * computeSelfServiceMachineUsageCountV13 / computeReportPrintCountV13 / computeConvenienceCabinetUsageCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 便民服务记录 */
export interface ConvenienceServiceRecordV13 {
  selfServiceMachineCount: number;
  reportPrintCount: number;
  convenienceCabinetCount: number;
}

/**
 * 自助机使用人次（纯函数）：求和。
 *
 * @param records 便民服务记录列表
 * @returns 自助机使用人次
 */
export function computeSelfServiceMachineUsageCountV13(records: ConvenienceServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.selfServiceMachineCount, 0);
}

/**
 * 报告打印人次（纯函数）：求和。
 *
 * @param records 便民服务记录列表
 * @returns 报告打印人次
 */
export function computeReportPrintCountV13(records: ConvenienceServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.reportPrintCount, 0);
}

/**
 * 便民柜使用人次（纯函数）：求和。
 *
 * @param records 便民服务记录列表
 * @returns 便民柜使用人次
 */
export function computeConvenienceCabinetUsageCountV13(records: ConvenienceServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.convenienceCabinetCount, 0);
}
