/**
 * 健澜科技 jlmedaios - 围手术期 V13 单测（M391-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePostopFollowupCompletionRateV13,
  computePostopInfectionRateV13,
  computePreopEvaluationCompletionRateV13,
  type PerioperativeMgmtRecordV13,
} from "../../src/bff/aggregators/perioperativeMgmtV13Aggregator";
import { perioperativeMgmtV13Routes } from "../../src/bff/routes/perioperativeMgmtV13";

const records: PerioperativeMgmtRecordV13[] = [
  { completedCount: 980, shouldCount: 1000, followedUpCount: 950, shouldFollowUpCount: 1000, infectionCount: 5, surgeryTotalCount: 1000 },
  { completedCount: 980, shouldCount: 1000, followedUpCount: 950, shouldFollowUpCount: 1000, infectionCount: 5, surgeryTotalCount: 1000 },
];

describe("computePreopEvaluationCompletionRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("术前评估完成率 = 98.00%", () => {
    expect(computePreopEvaluationCompletionRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computePreopEvaluationCompletionRateV13([])).toBe(0);
  });
});

describe("computePostopFollowupCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("术后随访完成率 = 95.00%", () => {
    expect(computePostopFollowupCompletionRateV13(records)).toBe(95.00);
  });
});

describe("computePostopInfectionRateV13", () => {
  // 算式：(5+5)/(1000+1000)×100 = 10/2000×100 = 0.50
  it("术后感染率 = 0.50%", () => {
    expect(computePostopInfectionRateV13(records)).toBe(0.50);
  });
});

describe("perioperativeMgmtV13Routes 读路由", () => {
  it("GET /api/v1/perioperative-mgmt 路由存在且 auth:true", () => {
    const route = perioperativeMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/perioperative-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
