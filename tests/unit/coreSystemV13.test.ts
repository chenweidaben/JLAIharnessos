/**
 * 健澜科技 jlmedaios - 医疗质量核心制度 V13 单测（M357-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDeathCaseDiscussionRateV13,
  computeDifficultCaseDiscussionRateV13,
  computeThreeRoundRateV13,
  type CoreSystemRecordV13,
} from "../../src/bff/aggregators/coreSystemV13Aggregator";
import { coreSystemV13Routes } from "../../src/bff/routes/coreSystemV13";

const records: CoreSystemRecordV13[] = [
  { threeRoundImplemented: 95, threeRoundRequired: 100, difficultCaseDiscussed: 48, difficultCaseCount: 50, deathCaseDiscussed: 30, deathCaseCount: 30 },
  { threeRoundImplemented: 95, threeRoundRequired: 100, difficultCaseDiscussed: 47, difficultCaseCount: 50, deathCaseDiscussed: 25, deathCaseCount: 25 },
];

describe("computeThreeRoundRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("三级查房落实率 = 95.00%", () => {
    expect(computeThreeRoundRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeThreeRoundRateV13([])).toBe(0);
  });
});

describe("computeDifficultCaseDiscussionRateV13", () => {
  // 算式：(48+47)/(50+50) = 95/100×100 = 95.00
  it("疑难病例讨论率 = 95.00%", () => {
    expect(computeDifficultCaseDiscussionRateV13(records)).toBe(95.00);
  });
});

describe("computeDeathCaseDiscussionRateV13", () => {
  // 算式：(30+25)/(30+25) = 55/55×100 = 100.00
  it("死亡病例讨论率 = 100.00%", () => {
    expect(computeDeathCaseDiscussionRateV13(records)).toBe(100.00);
  });
});

describe("coreSystemV13Routes 读路由", () => {
  it("GET /api/v1/core-system 路由存在且 auth:true", () => {
    const route = coreSystemV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/core-system",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
