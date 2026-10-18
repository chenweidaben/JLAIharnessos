/**
 * 健澜科技 jlmedaios - 消防安全管理 V13 单测（M447-D，M447 收官，应急管理与安全生产管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFireSafetyFacilityIntegrityRateV13,
  computeFireSafetyFireCountV13,
  computeFireSafetyPassageClearRateV13,
  type FireSafetyMgmtRecordV13,
} from "../../src/bff/aggregators/fireSafetyMgmtV13Aggregator";
import { fireSafetyMgmtV13Routes } from "../../src/bff/routes/fireSafetyMgmtV13";

const records: FireSafetyMgmtRecordV13[] = [
  { intact: 950, totalFacility: 1000, clear: 900, totalPassage: 1000, fire: true },
  { intact: 950, totalFacility: 1000, clear: 900, totalPassage: 1000, fire: true },
];

describe("computeFireSafetyFacilityIntegrityRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("消防设施完好率 = 95.00%", () => {
    expect(computeFireSafetyFacilityIntegrityRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeFireSafetyFacilityIntegrityRateV13([])).toBe(0);
  });
});

describe("computeFireSafetyPassageClearRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("消防通道畅通率 = 90.00%", () => {
    expect(computeFireSafetyPassageClearRateV13(records)).toBe(90.00);
  });
});

describe("computeFireSafetyFireCountV13", () => {
  // 算式：records.filter(r => r.fire).length = 2 次（两条都 fire=true，反向，越低越好）
  it("火灾事故数 = 2 次（反向，越低越好）", () => {
    expect(computeFireSafetyFireCountV13(records)).toBe(2);
  });
});

describe("fireSafetyMgmtV13Routes 读路由", () => {
  it("GET /api/v1/fire-safety-mgmt 路由存在且 auth:true", () => {
    const route = fireSafetyMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/fire-safety-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
