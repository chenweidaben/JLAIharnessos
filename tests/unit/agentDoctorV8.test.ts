/**
 * 健澜科技 jlmedaios - 医生 Personal Agent 工作台 V8 单测（M290-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDoctorDigestV8,
  buildDoctorTodoV8,
  prioritizeTodoV8,
  type AgentAlert,
  type AgentPatient,
  type AgentTask,
} from "../../src/bff/aggregators/agentDoctorV8Aggregator";
import { agentDoctorV8Routes } from "../../src/bff/routes/agentDoctorV8";

describe("buildDoctorTodoV8", () => {
  it("合并 2 患者 + 1 警报 + 1 任务 → 4 条待办", () => {
    const patients: AgentPatient[] = [
      { patientId: "p1", admissionCount: 1, avgScore: 70 },
      { patientId: "p2", admissionCount: 2, avgScore: 50 },
    ];
    const alerts: AgentAlert[] = [
      { alertId: "a1", title: "血压高", priority: "high", dueAt: 100 },
    ];
    const tasks: AgentTask[] = [
      { taskId: "t1", title: "签小结", priority: "high", dueAt: 200 },
    ];
    const todos = buildDoctorTodoV8(patients, alerts, tasks);
    expect(todos.length).toBe(4);
    // p2 avgScore=50<60 → high；p1 avgScore=70 → medium
    const p2 = todos.find((t) => t.id === "p2");
    expect(p2?.priority).toBe("high");
  });
});

describe("prioritizeTodoV8", () => {
  it("high 优先，同级按 dueAt 升序", () => {
    const todos = [
      { id: "m1", source: "task" as const, type: "t", title: "m", priority: "medium" as const, dueAt: 100 },
      { id: "h1", source: "alert" as const, type: "a", title: "h1", priority: "high" as const, dueAt: 200 },
      { id: "h2", source: "alert" as const, type: "a", title: "h2", priority: "high" as const, dueAt: 50 },
    ];
    const r = prioritizeTodoV8(todos);
    expect(r[0].id).toBe("h2"); // high + dueAt=50
    expect(r[1].id).toBe("h1"); // high + dueAt=200
    expect(r[2].id).toBe("m1");
  });
});

describe("buildDoctorDigestV8", () => {
  it("2患者均分=(72+45)/2=58.5，high=2，alert=1", () => {
    const patients: AgentPatient[] = [
      { patientId: "p1", admissionCount: 1, avgScore: 72 },
      { patientId: "p2", admissionCount: 1, avgScore: 45 },
    ];
    const todos = buildDoctorTodoV8(
      patients,
      [{ alertId: "a1", title: "t", priority: "high", dueAt: 1 }],
      [],
    );
    const d = buildDoctorDigestV8(todos, patients);
    expect(d.pendingCount).toBe(3); // 2患者+1警报
    expect(d.alertCount).toBe(1);
    expect(d.avgScore).toBe(58.5);
    expect(d.highPriorityCount).toBe(2); // p2 avgScore=45<60→high + a1 high
  });
  it("空态→全部为0", () => {
    const d = buildDoctorDigestV8([], []);
    expect(d.pendingCount).toBe(0);
    expect(d.avgScore).toBe(0);
  });
});

describe("agentDoctorV8Routes 写权限", () => {
  it("POST /api/v1/agent/doctor/todo/complete 路由存在且 auth:true", () => {
    const post = agentDoctorV8Routes.find((r) => r.method === "POST" && r.path === "/api/v1/agent/doctor/todo/complete");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
