/**
 * 健澜科技 jlmedaios - DOCTOR_MUSE 主动式晨间简报 V11 单测（M293-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMorningBriefV11,
  formatBriefV11,
  prioritizeBriefV11,
  type ApprovalV11,
  type CriticalAlertV11,
  type MorningScheduleV11,
  type PendingCaseV11,
  type WeightDeltaV11,
} from "../../src/bff/aggregators/morningBriefV11Aggregator";
import { morningBriefV11Routes } from "../../src/bff/routes/morningBriefV11";

const schedule: MorningScheduleV11[] = [
  { surgeryId: "s-1", title: "搭桥" },
  { surgeryId: "s-2", title: "切胆" },
];

const alerts: CriticalAlertV11[] = [
  { alertId: "a-1", title: "血压骤降" },
];

const pendingCases: PendingCaseV11[] = [
  { caseId: "c-1", title: "失败复盘" },
];

const approvals: ApprovalV11[] = [
  { approvalId: "ap-1", title: "采购" },
];

const weightDeltas: WeightDeltaV11[] = [
  { ruleId: "r-1", delta: 0.05 },
  { ruleId: "r-2", delta: -0.03 },
];

describe("buildMorningBriefV11", () => {
  it("聚合 1+2+1+1+2=7 条，五类计数正确", () => {
    const b = buildMorningBriefV11("d-001", schedule, alerts, pendingCases, approvals, weightDeltas);
    expect(b.items.length).toBe(7);
    expect(b.surgeryCount).toBe(2);
    expect(b.criticalCount).toBe(1);
    expect(b.reviewCount).toBe(1);
    expect(b.approvalCount).toBe(1);
    expect(b.weightDeltaCount).toBe(2);
  });
});

describe("prioritizeBriefV11", () => {
  it("critical > surgery > review > approval > weightDelta", () => {
    const b = buildMorningBriefV11("d-001", schedule, alerts, pendingCases, approvals, weightDeltas);
    const r = prioritizeBriefV11(b.items);
    expect(r[0].category).toBe("critical");
    expect(r[1].category).toBe("surgery");
    expect(r[2].category).toBe("surgery");
    expect(r[3].category).toBe("review");
    expect(r[4].category).toBe("approval");
    expect(r[5].category).toBe("weightDelta");
  });
});

describe("formatBriefV11", () => {
  it("文本含关键数字：2台手术/1条危重/1待复盘/1待审批/2权重变化", () => {
    const b = buildMorningBriefV11("d-001", schedule, alerts, pendingCases, approvals, weightDeltas);
    const text = formatBriefV11(b);
    expect(text).toContain("2台手术");
    expect(text).toContain("1条危重");
    expect(text).toContain("1个待复盘");
    expect(text).toContain("1项待审批");
    expect(text).toContain("2条规则权重");
  });
});

describe("morningBriefV11Routes 读路由", () => {
  it("GET /api/v1/morning-brief 路由存在且 auth:true", () => {
    const route = morningBriefV11Routes.find((r) => r.method === "GET" && r.path === "/api/v1/morning-brief");
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
