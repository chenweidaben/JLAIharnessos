/**
 * 健澜科技 jlmedaios - 病历缺陷闭环跟踪 V14 聚合器（M527-D，M527 收官）
 *
 * 纯函数：构建闭环跟踪基础数据 + 闭环跟踪 + 构建跟踪报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 闭环跟踪基础数据 */
export interface DefectClosedLoopV14 {
  defectId: string;
  dept: string;
}

/** 闭环跟踪输入 */
export interface DefectClosedLoopInputV14 {
  defectId: string;
  raisedDate: string;
  resolvedDate: string | null;
  status: "待整改" | "整改中" | "已闭环";
}

/** 闭环跟踪结果 */
export interface DefectClosedLoopResultV14 {
  closedDays: number;
  isClosed: boolean;
}

/** 闭环跟踪报告 */
export interface DefectClosedLoopReportV14 {
  closedDays: number;
  isClosed: boolean;
  hint: string;
}

/**
 * 构建闭环跟踪基础数据。
 *
 * @param defectId 缺陷ID
 * @param dept 科室
 * @returns 闭环跟踪基础数据
 */
export function buildDefectClosedLoop(defectId: string, dept: string): DefectClosedLoopV14 {
  return { defectId, dept };
}

/**
 * 闭环跟踪。
 * isClosed = status === '已闭环'；
 * closedDays = resolvedDate !== null ? Math.ceil((resolvedDate - raisedDate) / 天毫秒) : 0。
 *
 * @param input 闭环跟踪输入（缺陷ID + 提出日期 + 解决日期 + 状态）
 * @returns 跟踪结果（closedDays + isClosed）
 */
export function trackDefectResolution(input: DefectClosedLoopInputV14): DefectClosedLoopResultV14 {
  // 手算：isClosed = status === '已闭环'
  // 测试2：status='已闭环' → isClosed=true
  // 测试3：status='整改中' → isClosed=false
  const isClosed = input.status === "已闭环";
  // 手算：closedDays = resolvedDate !== null ? Math.ceil((resolvedDate - raisedDate) / 天毫秒) : 0
  // 测试2：resolvedDate='2026-10-13', raisedDate='2026-10-10'
  //        差值 = 3 天 = 3×24×60×60×1000 毫秒
  //        closedDays = Math.ceil(3) = 3
  // 测试3：resolvedDate=null → closedDays=0
  const closedDays =
    input.resolvedDate !== null
      ? Math.ceil(
          (new Date(input.resolvedDate).getTime() - new Date(input.raisedDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;
  return { closedDays, isClosed };
}

/**
 * 构建跟踪报告。
 * isClosed → hint='已闭环'，否则 → hint='未闭环，需跟进'。
 *
 * @param result 跟踪结果
 * @returns 跟踪报告（closedDays + isClosed + hint）
 */
export function buildDefectClosedLoopReport(result: DefectClosedLoopResultV14): DefectClosedLoopReportV14 {
  // 手算：isClosed → hint='已闭环'，否则 → hint='未闭环，需跟进'
  // 测试4：isClosed=true → hint='已闭环'
  const hint = result.isClosed ? "已闭环" : "未闭环，需跟进";
  return { closedDays: result.closedDays, isClosed: result.isClosed, hint };
}
