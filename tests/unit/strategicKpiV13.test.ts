/**
 * 健澜科技 jlmedaios - 战略KPI V13 单测（M407-D，M407 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAnnualKpiCompletionRateV13,
  computeKeyTaskCompletionRateV13,
  computeLeadershipTeamAssessScoreV13,
  type StrategicKpiRecordV13,
} from "../../src/bff/aggregators/strategicKpiV13Aggregator";
import { strategicKpiV13Routes } from "../../src/bff/routes/strategicKpiV13";

const records: StrategicKpiRecordV13[] = [
  { completed: 95, totalKpi: 100, taskDone: 90, taskTotal: 100, score: 85.5 },
  { completed: 95, totalKpi: 100, taskDone: 90, taskTotal: 100, score: 85.5 },
];

describe("computeAnnualKpiCompletionRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("年度KPI完成率 = 95.00%", () => {
    expect(computeAnnualKpiCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeAnnualKpiCompletionRateV13([])).toBe(0);
  });
});

describe("computeKeyTaskCompletionRateV13", () => {
  // 算式：(90+90)/(100+100)×100 = 180/200×100 = 90.00
  it("重点任务完成率 = 90.00%", () => {
    expect(computeKeyTaskCompletionRateV13(records)).toBe(90.00);
  });
});

describe("computeLeadershipTeamAssessScoreV13", () => {
  // 算式：(85.5+85.5)/2 = 85.50
  it("领导班子考核得分 = 85.50", () => {
    expect(computeLeadershipTeamAssessScoreV13(records)).toBe(85.50);
  });
});

describe("strategicKpiV13Routes 读路由", () => {
  it("GET /api/v1/strategic-kpi 路由存在且 auth:true", () => {
    const route = strategicKpiV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/strategic-kpi",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
