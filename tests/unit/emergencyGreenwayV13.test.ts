/**
 * 健澜科技 jlmedaios - 急诊绿色通道 V13 单测（M348-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgStayMinutesV13,
  computeGreenwayPatientCountV13,
  computeRescueSuccessRateV13,
  type EmergencyGreenwayRecordV13,
} from "../../src/bff/aggregators/emergencyGreenwayV13Aggregator";
import { emergencyGreenwayV13Routes } from "../../src/bff/routes/emergencyGreenwayV13";

const records: EmergencyGreenwayRecordV13[] = [
  { greenwayCount: 50, stayMinutes: 30, rescueSuccessCount: 48, rescueTotalCount: 50 },
  { greenwayCount: 50, stayMinutes: 40, rescueSuccessCount: 47, rescueTotalCount: 50 },
];

describe("computeGreenwayPatientCountV13", () => {
  // 算式：50+50 = 100
  it("绿色通道人数 = 100", () => {
    expect(computeGreenwayPatientCountV13(records)).toBe(100);
  });
  it("空态 → 0", () => {
    expect(computeGreenwayPatientCountV13([])).toBe(0);
  });
});

describe("computeAvgStayMinutesV13", () => {
  // 算式：(30+40)/2 = 35.0
  it("平均滞留时间 = 35.0 分钟", () => {
    expect(computeAvgStayMinutesV13(records)).toBe(35.0);
  });
});

describe("computeRescueSuccessRateV13", () => {
  // 算式：(48+47)/(50+50) = 95/100×100 = 95.00
  it("抢救成功率 = 95.00%", () => {
    expect(computeRescueSuccessRateV13(records)).toBe(95.00);
  });
});

describe("emergencyGreenwayV13Routes 读路由", () => {
  it("GET /api/v1/emergency-greenway 路由存在且 auth:true", () => {
    const route = emergencyGreenwayV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/emergency-greenway",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
