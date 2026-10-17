/**
 * 健澜科技 jlmedaios - 身体约束管理 V13 单测（M422-D，M422 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePhysicalRestraintUsageRateV13,
  computeRestraintComplicationRateV13,
  computeRestraintInformedConsentRateV13,
  type RestraintMgmtRecordV13,
} from "../../src/bff/aggregators/restraintMgmtV13Aggregator";
import { restraintMgmtV13Routes } from "../../src/bff/routes/restraintMgmtV13";

const records: RestraintMgmtRecordV13[] = [
  { restraintUsed: 80, inpatientTotal: 10000, complicationOccurred: 4, informedConsentSigned: 78 },
  { restraintUsed: 80, inpatientTotal: 10000, complicationOccurred: 4, informedConsentSigned: 78 },
];

describe("computePhysicalRestraintUsageRateV13", () => {
  // 算式：(80+80)/(10000+10000)×100 = 160/20000×100 = 0.80（反向指标，越低越好）
  it("身体约束使用率 = 0.80%（反向指标）", () => {
    expect(computePhysicalRestraintUsageRateV13(records)).toBe(0.80);
  });
  it("空态 → 0", () => {
    expect(computePhysicalRestraintUsageRateV13([])).toBe(0);
  });
});

describe("computeRestraintComplicationRateV13", () => {
  // 算式：(4+4)/(80+80)×100 = 8/160×100 = 5.00（反向指标，越低越好）
  it("约束并发症率 = 5.00%（反向指标）", () => {
    expect(computeRestraintComplicationRateV13(records)).toBe(5.00);
  });
});

describe("computeRestraintInformedConsentRateV13", () => {
  // 算式：(78+78)/(80+80)×100 = 156/160×100 = 97.50
  it("约束知情同意率 = 97.50%", () => {
    expect(computeRestraintInformedConsentRateV13(records)).toBe(97.50);
  });
});

describe("restraintMgmtV13Routes 读路由", () => {
  it("GET /api/v1/restraint-mgmt 路由存在且 auth:true", () => {
    const route = restraintMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/restraint-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
