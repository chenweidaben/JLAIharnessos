/**
 * 健澜科技 jlmedaios - 低采纳率规则自动复训提示 V12 单测（M294-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRetrainSummaryV12,
  buildRetrainTaskV12,
  prioritizeRetrainV12,
  type LowAdoptionRuleV12,
} from "../../src/bff/aggregators/retrainTaskV12Aggregator";
import { retrainTaskV12Routes } from "../../src/bff/routes/retrainTaskV12";

const rules: LowAdoptionRuleV12[] = [
  { ruleId: "r-dose", ruleName: "剂量", adoptionRate: 25 },
  { ruleId: "r-interaction", ruleName: "相互作用", adoptionRate: 45 },
  { ruleId: "r-duplicate", ruleName: "重复处方", adoptionRate: 15 },
];

describe("buildRetrainTaskV12", () => {
  it("3条规则→3个任务，rate<30 标 urgent（15/25）", () => {
    const tasks = buildRetrainTaskV12(rules);
    expect(tasks.length).toBe(3);
    expect(tasks.filter((t) => t.urgent).length).toBe(2);
    expect(tasks[0].currentRate).toBe(25);
  });
  it("空态→0任务", () => {
    expect(buildRetrainTaskV12([]).length).toBe(0);
  });
});

describe("prioritizeRetrainV12", () => {
  it("按采纳率升序：15→25→45", () => {
    const tasks = prioritizeRetrainV12(buildRetrainTaskV12(rules));
    expect(tasks[0].currentRate).toBe(15);
    expect(tasks[1].currentRate).toBe(25);
    expect(tasks[2].currentRate).toBe(45);
  });
});

describe("buildRetrainSummaryV12", () => {
  it("total=3 avgRate=28.3 urgentCount=2", () => {
    const tasks = buildRetrainTaskV12(rules);
    const s = buildRetrainSummaryV12(tasks);
    expect(s.totalTasks).toBe(3);
    expect(s.avgRate).toBe(28.3);
    expect(s.urgentCount).toBe(2);
  });
});

describe("retrainTaskV12Routes 写路由", () => {
  it("POST /api/v1/retrain-tasks/:id/complete 路由存在且 auth:true", () => {
    const route = retrainTaskV12Routes.find(
      (r) => r.method === "POST" && r.path === "/api/v1/retrain-tasks/:id/complete",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
