/**
 * 健澜科技 jlmedaios - 失败案例根因复盘与防再发机制 V10 纯函数（M292-A）
 *
 * analyzeFailureRootCauseV10 / buildPreventionPlanV10 / buildFailurePostmortemV10
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 根因类别 */
export type RootCause =
  | "diagnosis_error"
  | "medication_error"
  | "communication_delay"
  | "process_breakdown";

/** 失败事件 */
export interface FailureEventV10 {
  id: string;
  dept: string;
  patientCase: string;
  rootCause: RootCause;
  description: string;
  recurrenceCnt: number;
}

/**
 * 根因归类 V10（纯函数）：根据 description 关键词归类到四类根因之一。
 *
 * 关键词映射：
 * - 误诊/漏诊 → diagnosis_error
 * - 药/剂量/配伍 → medication_error
 * - 沟通/延迟/交接 → communication_delay
 * - 流程/breakdown → process_breakdown
 *
 * @param event 失败事件
 * @param history 历史（保留接口位）
 * @returns 归因素因
 */
export function analyzeFailureRootCauseV10(
  event: { description: string; declaredCause?: RootCause },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  history: FailureEventV10[],
): RootCause {
  if (event.declaredCause) return event.declaredCause;
  const d = event.description;
  if (/误诊|漏诊/.test(d)) return "diagnosis_error";
  if (/药|剂量|配伍/.test(d)) return "medication_error";
  if (/沟通|延迟|交接/.test(d)) return "communication_delay";
  return "process_breakdown";
}

/**
 * 防再发措施 V10（纯函数）：按根因返回对应措施文本。
 *
 * @param rootCause 根因
 * @returns 措施文本
 */
export function buildPreventionPlanV10(rootCause: RootCause): string {
  switch (rootCause) {
    case "diagnosis_error":
      return "建立鉴别诊断 checklist + 主任查房复核机制";
    case "medication_error":
      return "上线剂量/配伍前置审核 + 药师双人核对";
    case "communication_delay":
      return "床边交接标准化模板 + 危急值10分钟闭环";
    case "process_breakdown":
      return "流程 SOP 重新梳理 + 关键节点数字化留痕";
  }
}

/**
 * 复盘榜 V10（纯函数）：按根因聚类，组内按 recurrenceCnt 降序。
 *
 * @param cases 失败案例
 * @returns 复盘榜
 */
export function buildFailurePostmortemV10(cases: FailureEventV10[]): {
  rootCause: RootCause;
  count: number;
  totalRecurrence: number;
  items: FailureEventV10[];
}[] {
  const groups = new Map<RootCause, FailureEventV10[]>();
  for (const c of cases) {
    const arr = groups.get(c.rootCause) ?? [];
    arr.push(c);
    groups.set(c.rootCause, arr);
  }
  return Array.from(groups.entries())
    .map(([rootCause, items]) => ({
      rootCause,
      count: items.length,
      totalRecurrence: items.reduce((s, x) => s + x.recurrenceCnt, 0),
      items: [...items].sort((a, b) => b.recurrenceCnt - a.recurrenceCnt),
    }))
    .sort((a, b) => b.totalRecurrence - a.totalRecurrence);
}
