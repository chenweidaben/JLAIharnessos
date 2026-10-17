/**
 * 健澜科技 jlmedaios - DRG 费用超支预警 V13 单测（M313-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateDrgByDeptV13,
  classifyDrgCaseV13,
  computeDrgVarianceV13,
  type DrgCaseV13,
} from "../../src/bff/aggregators/drgCostOverrunV13Aggregator";
import { drgCostOverrunV13Routes } from "../../src/bff/routes/drgCostOverrunV13";

const cases: DrgCaseV13[] = [
  { caseId: "p1", dept: "cardio", actualCost: 12000, drgStandard: 10000 },
  { caseId: "p2", dept: "cardio", actualCost: 9000, drgStandard: 10000 },
  { caseId: "p3", dept: "surgery", actualCost: 15000, drgStandard: 12000 },
  { caseId: "p4", dept: "surgery", actualCost: 11000, drgStandard: 12000 },
];

describe("computeDrgVarianceV13", () => {
  // 算式：p1 actual=12000 - drg=10000 = +2000
  it("p1 偏差 = +2000", () => {
    expect(computeDrgVarianceV13(cases[0])).toBe(2000);
  });
  // 算式：p2 actual=9000 - drg=10000 = -1000
  it("p2 偏差 = -1000", () => {
    expect(computeDrgVarianceV13(cases[1])).toBe(-1000);
  });
});

describe("classifyDrgCaseV13", () => {
  // 算式：+2000 > 0 → 超支
  it("+2000 → 超支", () => {
    expect(classifyDrgCaseV13(2000)).toBe("超支");
  });
  // 算式：-1000 < 0 → 节省
  it("-1000 → 节省", () => {
    expect(classifyDrgCaseV13(-1000)).toBe("节省");
  });
  it("0 → 持平", () => {
    expect(classifyDrgCaseV13(0)).toBe("持平");
  });
});

describe("aggregateDrgByDeptV13", () => {
  // 算式：cardio 偏差 = +2000 + (-1000) = +1000；cases=2；avg = 1000/2 = 500
  // overrunCount=1（p1），saveCount=1（p2）
  it("cardio 汇总：avg=500, overrun=1, save=1", () => {
    const sum = aggregateDrgByDeptV13(cases).find((s) => s.dept === "cardio");
    expect(sum?.avgVariance).toBe(500);
    expect(sum?.overrunCount).toBe(1);
    expect(sum?.saveCount).toBe(1);
  });
  it("空态 → []", () => {
    expect(aggregateDrgByDeptV13([]).length).toBe(0);
  });
});

describe("drgCostOverrunV13Routes 读路由", () => {
  it("GET /api/v1/drg-cost-overrun 路由存在且 auth:true", () => {
    const route = drgCostOverrunV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drg-cost-overrun",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
