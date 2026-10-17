/**
 * 健澜科技 jlmedaios - 治安保卫 V13 单测（M408-D，M408 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEmergencyResponseTimeV13,
  computeSecurityPatrolArrivalRateV13,
  computeSurveillanceCoverageRateV13,
  type SecurityMgmtRecordV13,
} from "../../src/bff/aggregators/securityMgmtV13Aggregator";
import { securityMgmtV13Routes } from "../../src/bff/routes/securityMgmtV13";

const records: SecurityMgmtRecordV13[] = [
  { arrived: 980, should: 1000, covered: 990, shouldCover: 1000, responseMinutes: 3.5 },
  { arrived: 980, should: 1000, covered: 990, shouldCover: 1000, responseMinutes: 3.5 },
];

describe("computeSecurityPatrolArrivalRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("安保巡逻到位率 = 98.00%", () => {
    expect(computeSecurityPatrolArrivalRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeSecurityPatrolArrivalRateV13([])).toBe(0);
  });
});

describe("computeSurveillanceCoverageRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("监控覆盖率 = 99.00%", () => {
    expect(computeSurveillanceCoverageRateV13(records)).toBe(99.00);
  });
});

describe("computeEmergencyResponseTimeV13", () => {
  // 算式：(3.5+3.5)/2 = 3.5 → Math.ceil(3.5) = 4
  it("突发事件响应时长 = 4 分钟（Math.ceil 向上取整）", () => {
    expect(computeEmergencyResponseTimeV13(records)).toBe(4);
  });
});

describe("securityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/security-mgmt 路由存在且 auth:true", () => {
    const route = securityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/security-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
