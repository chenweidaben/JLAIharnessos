/**
 * 健澜科技 jlmedaios - 出院小结管理（细节）V13 单测（M427-A，detail 避让旧版 dischargeSummaryMgmtV13（M411））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDischargeSummaryCompleteRateV13,
  computeDischargeSummaryPassRateV13,
  computeDischargeSummaryTimelyRateV13,
  type DischargeSummaryDetailRecordV13,
} from "../../src/bff/aggregators/dischargeSummaryDetailV13Aggregator";
import { dischargeSummaryDetailV13Routes } from "../../src/bff/routes/dischargeSummaryDetailV13";

const records: DischargeSummaryDetailRecordV13[] = [
  { completeDs: 980, timelyDs: 950, passDs: 990, dischargeTotal: 1000 },
  { completeDs: 980, timelyDs: 950, passDs: 990, dischargeTotal: 1000 },
];

describe("computeDischargeSummaryCompleteRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("出院小结完整率 = 98.00%", () => {
    expect(computeDischargeSummaryCompleteRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeDischargeSummaryCompleteRateV13([])).toBe(0);
  });
});

describe("computeDischargeSummaryTimelyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("出院小结及时率 = 95.00%", () => {
    expect(computeDischargeSummaryTimelyRateV13(records)).toBe(95.00);
  });
});

describe("computeDischargeSummaryPassRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("出院小结合格率 = 99.00%", () => {
    expect(computeDischargeSummaryPassRateV13(records)).toBe(99.00);
  });
});

describe("dischargeSummaryDetailV13Routes 读路由", () => {
  it("GET /api/v1/discharge-summary-detail 路由存在且 auth:true", () => {
    const route = dischargeSummaryDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/discharge-summary-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
