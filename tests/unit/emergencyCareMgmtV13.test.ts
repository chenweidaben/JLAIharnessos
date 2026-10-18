/**
 * 健澜科技 jlmedaios - 急诊护理管理 V13 单测（M428-C，换名避让旧版 emergencyMgmtV13（M416，-care 后缀））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEmergencyRescueSuccessRateV13,
  computeEmergencyStayHoursV13,
  computeEmergencyTriageAccuracyRateV13,
  type EmergencyCareMgmtRecordV13,
} from "../../src/bff/aggregators/emergencyCareMgmtV13Aggregator";
import { emergencyCareMgmtV13Routes } from "../../src/bff/routes/emergencyCareMgmtV13";

const records: EmergencyCareMgmtRecordV13[] = [
  { stayHours: 3.5, rescueSuccess: 95, rescueTotal: 100, triageAccurate: 98, triageTotal: 100 },
  { stayHours: 4.3, rescueSuccess: 95, rescueTotal: 100, triageAccurate: 98, triageTotal: 100 },
];

describe("computeEmergencyStayHoursV13", () => {
  // 算式：avg = (3.5+4.3)/2 = 3.9，Math.ceil(3.9) = 4 小时（Math.ceil 整小时）
  it("急诊滞留时间 = 4 小时（Math.ceil 整小时）", () => {
    expect(computeEmergencyStayHoursV13(records)).toBe(4);
  });
  it("空态 → 0", () => {
    expect(computeEmergencyStayHoursV13([])).toBe(0);
  });
});

describe("computeEmergencyRescueSuccessRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("急诊抢救成功率 = 95.00%", () => {
    expect(computeEmergencyRescueSuccessRateV13(records)).toBe(95.00);
  });
});

describe("computeEmergencyTriageAccuracyRateV13", () => {
  // 算式：(98+98)/(100+100)×100 = 196/200×100 = 98.00
  it("急诊分诊准确率 = 98.00%", () => {
    expect(computeEmergencyTriageAccuracyRateV13(records)).toBe(98.00);
  });
});

describe("emergencyCareMgmtV13Routes 读路由", () => {
  it("GET /api/v1/emergency-care-mgmt 路由存在且 auth:true", () => {
    const route = emergencyCareMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/emergency-care-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
