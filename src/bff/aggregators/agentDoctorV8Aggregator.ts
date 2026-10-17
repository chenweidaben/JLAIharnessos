/**
 * 健澜科技 jlmedaios - 医生 Personal Agent 工作台 V8 纯函数（M290-A）
 *
 * buildDoctorTodoV8 / prioritizeTodoV8 / buildDoctorDigestV8
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 统一待办 */
export interface DoctorTodo {
  id: string;
  source: "patient" | "alert" | "task";
  type: string;
  title: string;
  priority: "high" | "medium" | "low";
  dueAt: number;
}

/** 患者项 */
export interface AgentPatient {
  patientId: string;
  admissionCount: number;
  avgScore: number;
}

/** 警报项 */
export interface AgentAlert {
  alertId: string;
  title: string;
  priority: "high" | "medium" | "low";
  dueAt: number;
}

/** 系统任务 */
export interface AgentTask {
  taskId: string;
  title: string;
  priority: "high" | "medium" | "low";
  dueAt: number;
}

/**
 * 医生待办汇总 V8（纯函数）：合并患者/警报/任务三类来源为统一 todo。
 *
 * @param patients 患者列表
 * @param alerts 警报列表
 * @param tasks 任务列表
 * @returns 合并后的待办
 */
export function buildDoctorTodoV8(
  patients: AgentPatient[],
  alerts: AgentAlert[],
  tasks: AgentTask[],
): DoctorTodo[] {
  const fromPatients: DoctorTodo[] = patients.map((p) => ({
    id: p.patientId,
    source: "patient",
    type: "随访",
    title: `患者 ${p.patientId}（在院${p.admissionCount}次）`,
    priority: p.avgScore < 60 ? "high" : "medium",
    dueAt: Date.now(),
  }));
  const fromAlerts: DoctorTodo[] = alerts.map((a) => ({
    id: a.alertId,
    source: "alert",
    type: "警报",
    title: a.title,
    priority: a.priority,
    dueAt: a.dueAt,
  }));
  const fromTasks: DoctorTodo[] = tasks.map((t) => ({
    id: t.taskId,
    source: "task",
    type: "任务",
    title: t.title,
    priority: t.priority,
    dueAt: t.dueAt,
  }));
  return [...fromPatients, ...fromAlerts, ...fromTasks];
}

/**
 * 优先级排序 V8（纯函数）：priority high>medium>low，同级按 dueAt 升序。
 *
 * @param todos 待办列表
 * @returns 排序后列表
 */
export function prioritizeTodoV8(todos: DoctorTodo[]): DoctorTodo[] {
  const score = (p: "high" | "medium" | "low") => (p === "high" ? 0 : p === "medium" ? 1 : 2);
  return [...todos].sort((a, b) => {
    const ds = score(a.priority) - score(b.priority);
    if (ds !== 0) return ds;
    return a.dueAt - b.dueAt;
  });
}

/**
 * 医生工作台摘要 V8（纯函数）：pendingCount/alertCount/avgScore。
 *
 * @param todos 待办列表
 * @param patients 患者列表
 * @returns 摘要
 */
export function buildDoctorDigestV8(todos: DoctorTodo[], patients: AgentPatient[]): {
  pendingCount: number;
  alertCount: number;
  avgScore: number;
  highPriorityCount: number;
} {
  const alertCount = todos.filter((t) => t.source === "alert").length;
  const highPriorityCount = todos.filter((t) => t.priority === "high").length;
  const avgScore = patients.length === 0
    ? 0
    : Math.round((patients.reduce((s, p) => s + p.avgScore, 0) / patients.length) * 10) / 10;
  return {
    pendingCount: todos.length,
    alertCount,
    avgScore,
    highPriorityCount,
  };
}
