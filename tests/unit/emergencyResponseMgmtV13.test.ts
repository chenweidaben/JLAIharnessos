/**
 * 健澜科技 jlmedaios - 突发事件处置管理 V13 单测（M447-B，应急管理与安全生产管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEmergencyResponseClosedLoopRateV13,
  computeEmergencyResponsePostEvaluationRateV13,
  computeEmergencyResponseTimelinessRateV13,
  type EmergencyResponseMgmtRecordV13,
} from "../../src/bff/aggregators/emergencyResponseMgmtV13Aggregator";
import { emergencyResponseMgmtV13Routes } from "../../src/bff/routes/emergencyResponseMgmtV13";

const records: EmergencyResponseMgmtRecordV13[] = [
  { timelyResponse: 950, totalEvent: 1000, closedLoop: 900, evaluated: 980, shouldEvaluate: 1000 },
  { timelyResponse: 950, totalEvent: 1000, closedLoop: 900, evaluated: 980, shouldEvaluate: 1000 },
];

describe("computeEmergencyResponseTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("应急响应及时率 = 95.00%", () => {
    expect(computeEmergencyResponseTimelinessRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeEmergencyResponseTimelinessRateV13([])).toBe(0);
  });
});

describe("computeEmergencyResponseClosedLoopRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("事件处置闭环率 = 90.00%", () => {
    expect(computeEmergencyResponseClosedLoopRateV13(records)).toBe(90.00);
  });
});

describe("computeEmergencyResponsePostEvaluationRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("事后评估完成率 = 98.00%", () => {
    expect(computeEmergencyResponsePostEvaluationRateV13(records)).toBe(98.00);
  });
});

describe("emergencyResponseMgmtV13Routes 读路由", () => {
  it("GET /api/v1/emergency-response-mgmt 路由存在且 auth:true", () => {
    const route = emergencyResponseMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/emergency-response-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
