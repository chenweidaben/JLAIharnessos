/**
 * 健澜科技 jlmedaios - 质控科室整改跟踪 V14 聚合器（M493-D，M493 收官）
 *
 * 纯函数：科室整改记录构建 + 整改进度跟踪。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室整改记录 */
export interface DeptRectifyV14 {
  dept: string;
  defect: string;
  status: string;
}

/** 整改进度跟踪结果 */
export interface DeptRectifyTrackV14 {
  total: number;
  completed: number;
  rate: number;
}

/**
 * 构建科室整改记录。
 *
 * @param dept 科室名称
 * @param defect 缺陷描述
 * @param status 整改状态
 * @returns 科室整改记录
 */
export function buildDeptRectify(dept: string, defect: string, status: string): DeptRectifyV14 {
  return { dept, defect, status };
}

/**
 * 跟踪整改进度（总数+已完成+完成率%）。
 *
 * @param records 整改记录列表
 * @returns 跟踪结果
 */
export function trackDeptRectify(records: DeptRectifyV14[]): DeptRectifyTrackV14 {
  const total = records.length;
  if (total === 0) {
    return { total: 0, completed: 0, rate: 0 };
  }
  // 手算：completed = status='已完成' 的数量；rate = Math.ceil(completed/total*100)
  const completed = records.filter((r) => r.status === "已完成").length;
  const rate = Math.ceil((completed / total) * 100);
  return { total, completed, rate };
}
