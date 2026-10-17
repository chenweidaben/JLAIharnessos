/**
 * 健澜科技 jlmedaios - 排班管理 V13 单测（M402-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNurseSchedulingComplianceRateV13,
  computePhysicianOnDutyCoverageRateV13,
  computeSchedulingAccuracyRateV13,
  type SchedulingMgmtRecordV13,
} from "../../src/bff/aggregators/schedulingMgmtV13Aggregator";
import { schedulingMgmtV13Routes } from "../../src/bff/routes/schedulingMgmtV13";

const records: SchedulingMgmtRecordV13[] = [
  { accurateScheduling: 980, totalScheduling: 1000, compliantNurse: 950, totalNurse: 1000, actualOnDuty: 90, requiredOnDuty: 100 },
  { accurateScheduling: 980, totalScheduling: 1000, compliantNurse: 950, totalNurse: 1000, actualOnDuty: 90, requiredOnDuty: 100 },
];

describe("computeSchedulingAccuracyRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("排班准确率 = 98.00%", () => {
    expect(computeSchedulingAccuracyRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeSchedulingAccuracyRateV13([])).toBe(0);
  });
});

describe("computeNurseSchedulingComplianceRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("护士排班合规率 = 95.00%", () => {
    expect(computeNurseSchedulingComplianceRateV13(records)).toBe(95.00);
  });
});

describe("computePhysicianOnDutyCoverageRateV13", () => {
  // 算式：(90+90)/(100+100) = 180/200×100 = 90.00
  it("医师值班覆盖率 = 90.00%", () => {
    expect(computePhysicianOnDutyCoverageRateV13(records)).toBe(90.00);
  });
});

describe("schedulingMgmtV13Routes 读路由", () => {
  it("GET /api/v1/scheduling-mgmt 路由存在且 auth:true", () => {
    const route = schedulingMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/scheduling-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
