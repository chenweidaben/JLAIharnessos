/**
 * 健澜科技 jlmedaios - 病历库房盘点 V14 聚合器（M541-D，M541 收官）
 *
 * 纯函数：构建库房盘点基础数据 + 库房盘点 + 构建盘点报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 库房盘点基础数据 */
export interface WarehouseCheckV14 {
  warehouseName: string;
  checkDate: string;
}

/** 库房盘点输入 */
export interface WarehouseCheckInputV14 {
  expectedCount: number;
  actualCount: number;
}

/** 库房盘点结果 */
export interface WarehouseCheckResultV14 {
  diff: number;
  status: string;
}

/** 盘点报告 */
export interface WarehouseCheckReportV14 {
  diff: number;
  status: string;
}

/**
 * 构建库房盘点基础数据。
 *
 * @param warehouseName 库房名
 * @param checkDate 盘点日期
 * @returns 库房盘点基础数据
 */
export function buildWarehouseCheck(warehouseName: string, checkDate: string): WarehouseCheckV14 {
  return { warehouseName, checkDate };
}

/**
 * 库房盘点。
 * diff = actualCount - expectedCount
 * status = diff===0 ? '账实相符' : Math.abs(diff)<=5 ? '轻微差异' : '重大差异'
 *
 * @param input 盘点输入（应有数 + 实有数）
 * @returns 盘点结果（diff + status）
 */
export function stocktakeWarehouse(input: WarehouseCheckInputV14): WarehouseCheckResultV14 {
  // 手算：diff = actualCount - expectedCount
  // 测试2：expectedCount=1000, actualCount=1000 → diff=1000-1000=0
  // 测试3：expectedCount=1000, actualCount=997 → diff=997-1000=-3
  const diff = input.actualCount - input.expectedCount;
  // 手算：status = diff===0 ? '账实相符' : Math.abs(diff)<=5 ? '轻微差异' : '重大差异'
  // 测试2：diff=0 → status='账实相符'
  // 测试3：diff=-3, |−3|=3<=5 → status='轻微差异'
  const status = diff === 0 ? "账实相符" : Math.abs(diff) <= 5 ? "轻微差异" : "重大差异";
  return { diff, status };
}

/**
 * 构建盘点报告。
 *
 * @param result 盘点结果
 * @returns 盘点报告（diff + status 透传）
 */
export function buildWarehouseCheckReport(result: WarehouseCheckResultV14): WarehouseCheckReportV14 {
  // 手算：透传 diff + status
  // 测试4：{diff=0, status='账实相符'} → diff=0, status='账实相符'
  return { diff: result.diff, status: result.status };
}
