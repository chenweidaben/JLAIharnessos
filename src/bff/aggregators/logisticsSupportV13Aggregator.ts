/**
 * 健澜科技 jlmedaios - 后勤保障 V13 纯函数（M385-A）
 *
 * computeBeddingWashCountV13 / computeCateringSupplyCountV13 / computePropertyInspectionCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 后勤保障记录 */
export interface LogisticsSupportRecordV13 {
  beddingWashCount: number;
  cateringSupplyCount: number;
  propertyInspectionCount: number;
}

/**
 * 被服洗涤量（纯函数）：求和。
 *
 * @param records 后勤保障记录列表
 * @returns 被服洗涤量
 */
export function computeBeddingWashCountV13(records: LogisticsSupportRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.beddingWashCount, 0);
}

/**
 * 餐饮供应人次（纯函数）：求和。
 *
 * @param records 后勤保障记录列表
 * @returns 餐饮供应人次
 */
export function computeCateringSupplyCountV13(records: LogisticsSupportRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.cateringSupplyCount, 0);
}

/**
 * 物业巡检次数（纯函数）：求和。
 *
 * @param records 后勤保障记录列表
 * @returns 物业巡检次数
 */
export function computePropertyInspectionCountV13(records: LogisticsSupportRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.propertyInspectionCount, 0);
}
