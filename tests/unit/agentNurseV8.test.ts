/**
 * 健澜科技 jlmedaios - 护士 Personal Agent（Nurse MUSE）工作台 V8 单测（M290-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildNurseDigestV8,
  buildNurseTodoV8,
  prioritizeNurseV8,
} from "../../src/bff/aggregators/agentNurseV8Aggregator";
import { agentNurseV8Routes } from "../../src/bff/routes/agentNurseV8";

describe("buildNurseTodoV8", () => {
  it("合并 2床位 + 1输液 + 2压疮 → 5 条待办", () => {
    const beds = [
      { bedId: "b1", patientId: "p1", ward: "w1" },
      { bedId: "b2", patientId: "p2", ward: "w1" },
    ];
    const ivs = [
      { taskId: "iv1", bedId: "b1", drug: "头孢" },
    ];
    const risks = [
      { riskId: "r1", bedId: "b2", level: "high" as const },
      { riskId: "r2", bedId: "b1", level: "medium" as const },
    ];
    const todos = buildNurseTodoV8(beds, ivs, risks);
    expect(todos.length).toBe(5);
  });
});

describe("prioritizeNurseV8", () => {
  it("pressureUlcer(high) > pressureUlcer(medium) > ivTask > bedRound", () => {
    const todos = [
      { id: "br", type: "bedRound" as const, title: "t", riskLevel: "low" as const },
      { id: "iv", type: "ivTask" as const, title: "t", riskLevel: "medium" as const },
      { id: "ph", type: "pressureUlcer" as const, title: "t", riskLevel: "high" as const },
      { id: "pm", type: "pressureUlcer" as const, title: "t", riskLevel: "medium" as const },
    ];
    const r = prioritizeNurseV8(todos);
    expect(r[0].id).toBe("ph");
    expect(r[1].id).toBe("pm");
    expect(r[2].id).toBe("iv");
    expect(r[3].id).toBe("br");
  });
});

describe("buildNurseDigestV8", () => {
  it("bedCount=2, riskCount=2, highRisk=1, iv=1", () => {
    const beds = [
      { bedId: "b1", patientId: "p1", ward: "w1" },
      { bedId: "b2", patientId: "p2", ward: "w1" },
    ];
    const risks = [
      { riskId: "r1", bedId: "b2", level: "high" as const },
      { riskId: "r2", bedId: "b1", level: "medium" as const },
    ];
    const ivs = [
      { taskId: "iv1", bedId: "b1", drug: "x" },
    ];
    const d = buildNurseDigestV8(beds, risks, ivs);
    expect(d.bedCount).toBe(2);
    expect(d.riskCount).toBe(2);
    expect(d.highRiskCount).toBe(1);
    expect(d.ivTaskCount).toBe(1);
  });
  it("空态→全部为0", () => {
    const d = buildNurseDigestV8([], [], []);
    expect(d.bedCount).toBe(0);
    expect(d.riskCount).toBe(0);
  });
});

describe("agentNurseV8Routes 写权限", () => {
  it("POST /api/v1/agent/nurse/todo/complete 路由存在且 auth:true", () => {
    const post = agentNurseV8Routes.find((r) => r.method === "POST" && r.path === "/api/v1/agent/nurse/todo/complete");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
