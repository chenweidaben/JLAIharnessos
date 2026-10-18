/**
 * 健澜科技 jlmedaios - 日间手术管理 V13 单测（M458-A，日间手术与门诊操作管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDaySurgeryDischargeFollowupRateV13,
  computeDaySurgeryProportionRateV13,
  computeDaySurgeryUnplannedReadmissionRateV13,
  type DaySurgeryMgmtRecordV13,
} from "../../src/bff/aggregators/daySurgeryMgmtV13Aggregator";
import { daySurgeryMgmtV13Routes } from "../../src/bff/routes/daySurgeryMgmtV13";

const records: DaySurgeryMgmtRecordV13[] = [
  { day: 950, totalElective: 1000, followedUp: 900, totalDischarged: 1000, readmission: 98 },
  { day: 950, totalElective: 1000, followedUp: 900, totalDischarged: 1000, readmission: 98 },
];

describe("computeDaySurgeryProportionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("日间手术占择期手术比例 = 95.00%", () => {
    expect(computeDaySurgeryProportionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDaySurgeryProportionRateV13([])).toBe(0);
  });
});

describe("computeDaySurgeryDischargeFollowupRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("日间手术出院随访率 = 90.00%", () => {
    expect(computeDaySurgeryDischargeFollowupRateV13(records)).toBe(90.00);
  });
});

describe("computeDaySurgeryUnplannedReadmissionRateV13", () => {
  // 算式：(98+98)/(1000+1000)×100 = 196/2000×100 = 9.80（反向指标越低越好）
  it("日间手术非计划再入院率 = 9.80%（反向，越低越好）", () => {
    expect(computeDaySurgeryUnplannedReadmissionRateV13(records)).toBe(9.80);
  });
});

describe("daySurgeryMgmtV13Routes 读路由", () => {
  it("GET /api/v1/day-surgery-mgmt 路由存在且 auth:true", () => {
    const route = daySurgeryMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/day-surgery-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
