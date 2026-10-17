/**
 * 健澜科技 jlmedaios - 急诊分诊 V13 单测（M335-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeIIPlusWaitTimeV13,
  computeTriageDistributionV13,
  type TriageRecordV13,
} from "../../src/bff/aggregators/emergencyTriageV13Aggregator";
import { emergencyTriageV13Routes } from "../../src/bff/routes/emergencyTriageV13";

const records: TriageRecordV13[] = [
  { triageLevel: "I", waitMinutes: 5 },
  { triageLevel: "II", waitMinutes: 3 },
  { triageLevel: "II", waitMinutes: 7 },
  { triageLevel: "III", waitMinutes: 15 },
  { triageLevel: "IV", waitMinutes: 30 },
];

describe("computeTriageDistributionV13", () => {
  // 算式：I 级 1 例 / II 级 2 例 / III 级 1 例 / IV 级 1 例
  it("I 级 = 1 例", () => {
    const dist = computeTriageDistributionV13(records);
    expect(dist.length).toBe(4);
    expect(dist[0].level).toBe("I");
    expect(dist[0].count).toBe(1);
  });
  it("空态 → 4 级均 0", () => {
    const dist = computeTriageDistributionV13([]);
    expect(dist.length).toBe(4);
    expect(dist[0].count).toBe(0);
  });
});

describe("computeIIPlusWaitTimeV13", () => {
  // 算式：(5+3+7)/3 = 15/3 = 5.0
  it("II 级以上等候 = 5.0 分钟", () => {
    expect(computeIIPlusWaitTimeV13(records)).toBe(5.0);
  });
  it("空态 → 0", () => {
    expect(computeIIPlusWaitTimeV13([])).toBe(0);
  });
});

describe("emergencyTriageV13Routes 读路由", () => {
  it("GET /api/v1/emergency-triage-stats 路由存在且 auth:true", () => {
    const route = emergencyTriageV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/emergency-triage-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
