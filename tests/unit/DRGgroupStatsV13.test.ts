/**
 * 健澜科技 jlmedaios - DRG分组统计 V13 单测（M382-C，stats 避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDRGAvgWeightV13,
  computeDRGCaseCountV13,
  computeDRGCostDeviationRateV13,
  type DRGgroupRecordV13,
} from "../../src/bff/aggregators/DRGgroupStatsV13Aggregator";
import { DRGgroupStatsV13Routes } from "../../src/bff/routes/DRGgroupStatsV13";

const records: DRGgroupRecordV13[] = [
  { caseCount: 200, totalWeight: 300, actualCost: 1100, standardCost: 1000 },
  { caseCount: 200, totalWeight: 300, actualCost: 1100, standardCost: 1000 },
];

describe("computeDRGCaseCountV13", () => {
  // 算式：200+200 = 400
  it("DRG入组病例数 = 400 例", () => {
    expect(computeDRGCaseCountV13(records)).toBe(400);
  });
  it("空态 → 0", () => {
    expect(computeDRGCaseCountV13([])).toBe(0);
  });
});

describe("computeDRGAvgWeightV13", () => {
  // 算式：(300+300)/(200+200) = 600/400 = 1.50
  it("DRG平均权重 = 1.50", () => {
    expect(computeDRGAvgWeightV13(records)).toBe(1.50);
  });
});

describe("computeDRGCostDeviationRateV13", () => {
  // 算式：(1100+1100 - 1000+1000)/(1000+1000) = (2200-2000)/2000×100 = 10.00
  it("DRG费用偏差率 = 10.00%", () => {
    expect(computeDRGCostDeviationRateV13(records)).toBe(10.00);
  });
});

describe("DRGgroupStatsV13Routes 读路由", () => {
  it("GET /api/v1/drg-group-stats 路由存在且 auth:true", () => {
    const route = DRGgroupStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drg-group-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
