/**
 * 健澜科技 jlmedaios - 治安保卫质量管理 V13 单测（M431-D，M431 收官，-quality 后缀避让旧版 securityMgmtV13（M408））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSecurityIncidentCountV13,
  computeSecurityPatrolArrivalRateV13,
  computeSecuritySurveillanceCompletenessRateV13,
  type SecurityQualityMgmtRecordV13,
} from "../../src/bff/aggregators/securityQualityMgmtV13Aggregator";
import { securityQualityMgmtV13Routes } from "../../src/bff/routes/securityQualityMgmtV13";

const records: SecurityQualityMgmtRecordV13[] = [
  { incidentCount: 2, patrolArrived: 950, patrolTotal: 1000, surveillanceIntact: 980, surveillanceTotal: 1000 },
  { incidentCount: 2, patrolArrived: 950, patrolTotal: 1000, surveillanceIntact: 980, surveillanceTotal: 1000 },
];

describe("computeSecurityIncidentCountV13", () => {
  // 算式：2 + 2 = 4 次（整数求和类，反向指标，越低越好）
  it("治安事件数 = 4 次（整数求和类，反向指标）", () => {
    expect(computeSecurityIncidentCountV13(records)).toBe(4);
  });
  it("空态 → 0", () => {
    expect(computeSecurityIncidentCountV13([])).toBe(0);
  });
});

describe("computeSecurityPatrolArrivalRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("安保巡逻到位率 = 95.00%", () => {
    expect(computeSecurityPatrolArrivalRateV13(records)).toBe(95.00);
  });
});

describe("computeSecuritySurveillanceCompletenessRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("监控设备完好率 = 98.00%", () => {
    expect(computeSecuritySurveillanceCompletenessRateV13(records)).toBe(98.00);
  });
});

describe("securityQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/security-quality-mgmt 路由存在且 auth:true", () => {
    const route = securityQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/security-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
