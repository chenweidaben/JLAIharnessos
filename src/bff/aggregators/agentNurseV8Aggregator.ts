/**
 * 健澜科技 jlmedaios - 护士 Personal Agent（Nurse MUSE）工作台 V8 纯函数（M290-B）
 *
 * buildNurseTodoV8 / prioritizeNurseV8 / buildNurseDigestV8
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护士待办 */
export interface NurseTodo {
  id: string;
  type: "pressureUlcer" | "ivTask" | "bedRound";
  title: string;
  riskLevel: "high" | "medium" | "low";
}

/** 床位 */
export interface NurseBed {
  bedId: string;
  patientId: string;
  ward: string;
}

/** 输液任务 */
export interface NurseIvTask {
  taskId: string;
  bedId: string;
  drug: string;
}

/** 压疮风险 */
export interface NursePressureRisk {
  riskId: string;
  bedId: string;
  level: "high" | "medium" | "low";
}

/**
 * 护士待办合并 V8（纯函数）：床位巡视/输液/压疮风险三类合并。
 *
 * @param beds 床位
 * @param ivTasks 输液任务
 * @param risks 压疮风险
 * @returns 待办列表
 */
export function buildNurseTodoV8(
  beds: NurseBed[],
  ivTasks: NurseIvTask[],
  risks: NursePressureRisk[],
): NurseTodo[] {
  const fromBeds: NurseTodo[] = beds.map((b) => ({
    id: b.bedId,
    type: "bedRound",
    title: `床位巡视 ${b.bedId}（${b.ward}）`,
    riskLevel: "low",
  }));
  const fromIv: NurseTodo[] = ivTasks.map((t) => ({
    id: t.taskId,
    type: "ivTask",
    title: `输液 ${t.drug}（${t.bedId}）`,
    riskLevel: "medium",
  }));
  const fromRisks: NurseTodo[] = risks.map((r) => ({
    id: r.riskId,
    type: "pressureUlcer",
    title: `压疮风险（${r.bedId}）`,
    riskLevel: r.level,
  }));
  return [...fromBeds, ...fromIv, ...fromRisks];
}

/**
 * 护士待办排序 V8（纯函数）：pressureUlcer 排最前（按 riskLevel 高→低），其次 ivTask，最后 bedRound。
 *
 * @param todos 待办列表
 * @returns 排序后列表
 */
export function prioritizeNurseV8(todos: NurseTodo[]): NurseTodo[] {
  const typeScore = (t: NurseTodo["type"]) => (t === "pressureUlcer" ? 0 : t === "ivTask" ? 1 : 2);
  const riskScore = (r: NurseTodo["riskLevel"]) => (r === "high" ? 0 : r === "medium" ? 1 : 2);
  return [...todos].sort((a, b) => {
    const ts = typeScore(a.type) - typeScore(b.type);
    if (ts !== 0) return ts;
    return riskScore(a.riskLevel) - riskScore(b.riskLevel);
  });
}

/**
 * 护士摘要 V8（纯函数）：bedCount/riskCount/ivTaskCount。
 *
 * @param beds 床位
 * @param risks 压疮风险
 * @param ivTasks 输液任务
 * @returns 摘要
 */
export function buildNurseDigestV8(
  beds: NurseBed[],
  risks: NursePressureRisk[],
  ivTasks: NurseIvTask[],
): { bedCount: number; riskCount: number; highRiskCount: number; ivTaskCount: number } {
  return {
    bedCount: beds.length,
    riskCount: risks.length,
    highRiskCount: risks.filter((r) => r.level === "high").length,
    ivTaskCount: ivTasks.length,
  };
}
