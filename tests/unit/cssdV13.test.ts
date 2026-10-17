/**
 * 健澜科技 jlmedaios - 消毒供应 V13 单测（M351-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBioMonitorPassRateV13,
  computeSterilizedPackageCountV13,
  computeWetPackageRateV13,
  type CssdRecordV13,
} from "../../src/bff/aggregators/cssdV13Aggregator";
import { cssdV13Routes } from "../../src/bff/routes/cssdV13";

const records: CssdRecordV13[] = [
  { sterilizedPackageCount: 500, wetPackageCount: 2, bioMonitorCount: 100, bioMonitorPassedCount: 98 },
  { sterilizedPackageCount: 500, wetPackageCount: 3, bioMonitorCount: 100, bioMonitorPassedCount: 99 },
];

describe("computeSterilizedPackageCountV13", () => {
  // 算式：500+500 = 1000
  it("灭菌包数 = 1000", () => {
    expect(computeSterilizedPackageCountV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeSterilizedPackageCountV13([])).toBe(0);
  });
});

describe("computeWetPackageRateV13", () => {
  // 算式：(2+3)/(500+500) = 5/1000×100 = 0.50
  it("湿包率 = 0.50%", () => {
    expect(computeWetPackageRateV13(records)).toBe(0.50);
  });
});

describe("computeBioMonitorPassRateV13", () => {
  // 算式：(98+99)/(100+100) = 197/200×100 = 98.50
  it("生物监测合格率 = 98.50%", () => {
    expect(computeBioMonitorPassRateV13(records)).toBe(98.50);
  });
});

describe("cssdV13Routes 读路由", () => {
  it("GET /api/v1/cssd 路由存在且 auth:true", () => {
    const route = cssdV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/cssd",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
