/**
 * 健澜科技 jlmedaios - 安全生产管理 V13 单测（M447-C，应急管理与安全生产管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSafetyProductionAccidentCountV13,
  computeSafetyProductionHazardRectificationRateV13,
  computeSafetyProductionTrainingCoverageRateV13,
  type SafetyProductionMgmtRecordV13,
} from "../../src/bff/aggregators/safetyProductionMgmtV13Aggregator";
import { safetyProductionMgmtV13Routes } from "../../src/bff/routes/safetyProductionMgmtV13";

const records: SafetyProductionMgmtRecordV13[] = [
  { rectified: 950, totalHazard: 1000, trained: 900, shouldTrain: 1000, accident: true },
  { rectified: 950, totalHazard: 1000, trained: 900, shouldTrain: 1000, accident: true },
];

describe("computeSafetyProductionHazardRectificationRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("安全隐患排查整改率 = 95.00%", () => {
    expect(computeSafetyProductionHazardRectificationRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeSafetyProductionHazardRectificationRateV13([])).toBe(0);
  });
});

describe("computeSafetyProductionTrainingCoverageRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("安全培训覆盖率 = 90.00%", () => {
    expect(computeSafetyProductionTrainingCoverageRateV13(records)).toBe(90.00);
  });
});

describe("computeSafetyProductionAccidentCountV13", () => {
  // 算式：records.filter(r => r.accident).length = 2 次（两条都 accident=true，反向，越低越好）
  it("安全生产事故数 = 2 次（反向，越低越好）", () => {
    expect(computeSafetyProductionAccidentCountV13(records)).toBe(2);
  });
});

describe("safetyProductionMgmtV13Routes 读路由", () => {
  it("GET /api/v1/safety-production-mgmt 路由存在且 auth:true", () => {
    const route = safetyProductionMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/safety-production-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
