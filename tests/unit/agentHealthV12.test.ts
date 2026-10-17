/**
 * 健澜科技 jlmedaios - 智能体健康度评分 V12 单测（M294-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildHealthDashboardV12,
  classifyHealthV12,
  scoreAgentHealthV12,
  type AgentHealthInputV12,
} from "../../src/bff/aggregators/agentHealthV12Aggregator";
import { agentHealthV12Routes } from "../../src/bff/routes/agentHealthV12";

const inputs: AgentHealthInputV12[] = [
  { role: "doctor", adoptRate: 80, retrainDone: 5, retrainTotal: 5 },
  { role: "nurse", adoptRate: 70, retrainDone: 3, retrainTotal: 5 },
  { role: "pharma", adoptRate: 50, retrainDone: 1, retrainTotal: 4 },
  { role: "manager", adoptRate: 85, retrainDone: 4, retrainTotal: 4 },
  { role: "muse", adoptRate: 60, retrainDone: 2, retrainTotal: 4 },
];

describe("scoreAgentHealthV12", () => {
  it("doctor: 80*0.6 + 100*0.4 = 88 healthy", () => {
    const s = scoreAgentHealthV12("doctor", { adoptRate: 80 }, 5, 5);
    expect(s.score).toBe(88);
    expect(s.level).toBe("healthy");
  });
  it("pharma: 50*0.6 + 25*0.4 = 40 critical", () => {
    const s = scoreAgentHealthV12("pharma", { adoptRate: 50 }, 1, 4);
    expect(s.score).toBe(40);
    expect(s.level).toBe("critical");
  });
  it("retrainTotal=0 → 复训完成率按100%算", () => {
    const s = scoreAgentHealthV12("x", { adoptRate: 50 }, 0, 0);
    expect(s.score).toBe(Math.round(50 * 0.6 + 100 * 0.4));
    expect(s.score).toBe(70);
  });
});

describe("classifyHealthV12", () => {
  it("≥80 healthy / 60-79 watch / <60 critical", () => {
    expect(classifyHealthV12(80)).toBe("healthy");
    expect(classifyHealthV12(70)).toBe("watch");
    expect(classifyHealthV12(59)).toBe("critical");
  });
});

describe("buildHealthDashboardV12", () => {
  it("5角色 avg=68.2 lowestRole=pharma criticalCount=2", () => {
    const scores = inputs.map((i) =>
      scoreAgentHealthV12(i.role, { adoptRate: i.adoptRate }, i.retrainDone, i.retrainTotal),
    );
    const d = buildHealthDashboardV12(scores);
    expect(d.avgScore).toBe(68.2);
    expect(d.lowestRole).toBe("pharma");
    expect(d.criticalCount).toBe(2);
  });
  it("空态→全0", () => {
    const d = buildHealthDashboardV12([]);
    expect(d.avgScore).toBe(0);
    expect(d.lowestRole).toBe("");
    expect(d.criticalCount).toBe(0);
  });
});

describe("agentHealthV12Routes 读路由", () => {
  it("GET /api/v1/agent-health 路由存在且 auth:true", () => {
    const route = agentHealthV12Routes.find((r) => r.method === "GET" && r.path === "/api/v1/agent-health");
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
