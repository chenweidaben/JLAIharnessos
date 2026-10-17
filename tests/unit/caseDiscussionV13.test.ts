/**
 * 健澜科技 jlmedaios - 病例讨论 V13 单测（M404-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDeathCaseDiscussionRateV13,
  computeDifficultCaseDiscussionRateV13,
  computePreoperativeDiscussionCompletionRateV13,
  type CaseDiscussionRecordV13,
} from "../../src/bff/aggregators/caseDiscussionV13Aggregator";
import { caseDiscussionV13Routes } from "../../src/bff/routes/caseDiscussionV13";

const records: CaseDiscussionRecordV13[] = [
  { discussedDifficult: 95, totalDifficult: 100, discussedDeath: 100, totalDeath: 100, completedPreop: 980, totalPreop: 1000 },
  { discussedDifficult: 95, totalDifficult: 100, discussedDeath: 100, totalDeath: 100, completedPreop: 980, totalPreop: 1000 },
];

describe("computeDifficultCaseDiscussionRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("疑难病例讨论率 = 95.00%", () => {
    expect(computeDifficultCaseDiscussionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDifficultCaseDiscussionRateV13([])).toBe(0);
  });
});

describe("computeDeathCaseDiscussionRateV13", () => {
  // 算式：(100+100)/(100+100) = 200/200×100 = 100.00
  it("死亡病例讨论率 = 100.00%", () => {
    expect(computeDeathCaseDiscussionRateV13(records)).toBe(100.00);
  });
});

describe("computePreoperativeDiscussionCompletionRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("术前讨论完成率 = 98.00%", () => {
    expect(computePreoperativeDiscussionCompletionRateV13(records)).toBe(98.00);
  });
});

describe("caseDiscussionV13Routes 读路由", () => {
  it("GET /api/v1/case-discussion 路由存在且 auth:true", () => {
    const route = caseDiscussionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/case-discussion",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
