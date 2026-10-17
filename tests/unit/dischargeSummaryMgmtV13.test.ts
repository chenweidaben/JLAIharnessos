/**
 * 健澜科技 jlmedaios - 出院小结管理 V13 单测（M411-D，M411 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDischargeGuidanceCompletenessRateV13,
  computeDischargeSummaryPassRateV13,
  computeDischargeSummaryTimelyRateV13,
  type DischargeSummaryMgmtRecordV13,
} from "../../src/bff/aggregators/dischargeSummaryMgmtV13Aggregator";
import { dischargeSummaryMgmtV13Routes } from "../../src/bff/routes/dischargeSummaryMgmtV13";

const records: DischargeSummaryMgmtRecordV13[] = [
  { timely: 98, dischargeTotal: 1000, qualified: 980, summaryTotal: 1000, complete: 950, shouldTotal: 1000 },
  { timely: 98, dischargeTotal: 1000, qualified: 980, summaryTotal: 1000, complete: 950, shouldTotal: 1000 },
];

describe("computeDischargeSummaryTimelyRateV13", () => {
  // 算式：(98+98)/(1000+1000)×100 = 196/2000×100 = 9.80
  it("出院小结及时率 = 9.80%", () => {
    expect(computeDischargeSummaryTimelyRateV13(records)).toBe(9.80);
  });
  it("空态 → 0", () => {
    expect(computeDischargeSummaryTimelyRateV13([])).toBe(0);
  });
});

describe("computeDischargeSummaryPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("出院小结合格率 = 98.00%", () => {
    expect(computeDischargeSummaryPassRateV13(records)).toBe(98.00);
  });
});

describe("computeDischargeGuidanceCompletenessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("出院指导完整率 = 95.00%", () => {
    expect(computeDischargeGuidanceCompletenessRateV13(records)).toBe(95.00);
  });
});

describe("dischargeSummaryMgmtV13Routes 读路由", () => {
  it("GET /api/v1/discharge-summary-mgmt 路由存在且 auth:true", () => {
    const route = dischargeSummaryMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/discharge-summary-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
