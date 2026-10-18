/**
 * 健澜科技 jlmedaios - DRG/DIP 管理 V13 单测（M445-D，M445 收官，医保物价与费用管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDrgDipCoverageRateV13,
  computeDrgDipEnrollmentRateV13,
  computeDrgDipWeightBreakEvenRateV13,
  type DrgDipMgmtRecordV13,
} from "../../src/bff/aggregators/drgDipMgmtV13Aggregator";
import { drgDipMgmtV13Routes } from "../../src/bff/routes/drgDipMgmtV13";

const records: DrgDipMgmtRecordV13[] = [
  { enrolled: 950, totalDrg: 1000, coveredDisease: 900, totalDisease: 1000, breakEven: 980, totalGroup: 1000 },
  { enrolled: 950, totalDrg: 1000, coveredDisease: 900, totalDisease: 1000, breakEven: 980, totalGroup: 1000 },
];

describe("computeDrgDipEnrollmentRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("DRG 入组率 = 95.00%", () => {
    expect(computeDrgDipEnrollmentRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDrgDipEnrollmentRateV13([])).toBe(0);
  });
});

describe("computeDrgDipCoverageRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("DIP 病种覆盖率 = 90.00%", () => {
    expect(computeDrgDipCoverageRateV13(records)).toBe(90.00);
  });
});

describe("computeDrgDipWeightBreakEvenRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("权重盈亏平衡率 = 98.00%", () => {
    expect(computeDrgDipWeightBreakEvenRateV13(records)).toBe(98.00);
  });
});

describe("drgDipMgmtV13Routes 读路由", () => {
  it("GET /api/v1/drg-dip-mgmt 路由存在且 auth:true", () => {
    const route = drgDipMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drg-dip-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
