/**
 * 健澜科技 jlmedaios - 病历缺陷统计分析 V14 聚合器（M461-B）
 *
 * 纯函数：按严重度分组计数 + 按科室分组计数。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 缺陷记录 */
export interface DefectRecordV14 {
  recordId: string;
  dept: string;
  severity: "block" | "major" | "minor";
  ruleId?: string;
  foundAt: string;
}

/** 严重度聚合结果 */
export interface DefectByTypeV14 {
  block: number;
  major: number;
  minor: number;
  total: number;
}

/** 科室聚合单项 */
export interface DefectByDeptItemV14 {
  dept: string;
  block: number;
  major: number;
  minor: number;
  total: number;
}

/**
 * 按缺陷严重度分组计数。
 *
 * @param records 缺陷记录数组
 * @returns block / major / minor / total
 */
export function aggregateDefectsByType(records: DefectRecordV14[]): DefectByTypeV14 {
  let block = 0;
  let major = 0;
  let minor = 0;
  for (const r of records) {
    if (r.severity === "block") block += 1;
    else if (r.severity === "major") major += 1;
    else minor += 1;
  }
  return { block, major, minor, total: block + major + minor };
}

/**
 * 按科室分组计数。
 *
 * @param records 缺陷记录数组
 * @returns 按科室分组的数组（含各严重度计数与 total）
 */
export function aggregateDefectsByDept(records: DefectRecordV14[]): DefectByDeptItemV14[] {
  const map = new Map<string, DefectByDeptItemV14>();
  for (const r of records) {
    let item = map.get(r.dept);
    if (!item) {
      item = { dept: r.dept, block: 0, major: 0, minor: 0, total: 0 };
      map.set(r.dept, item);
    }
    if (r.severity === "block") item.block += 1;
    else if (r.severity === "major") item.major += 1;
    else item.minor += 1;
    item.total += 1;
  }
  return Array.from(map.values());
}
