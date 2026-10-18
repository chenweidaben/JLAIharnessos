/**
 * 健澜科技 jlmedaios - 急诊绿色通道管理 V13 单测（M454-B，门急诊与手术麻醉管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEmergencyGreenChannelAcceptanceTimelinessRateV13,
  computeEmergencyGreenChannelObservationHoursV13,
  computeEmergencyGreenChannelRescueSuccessRateV13,
  type EmergencyGreenChannelMgmtRecordV13,
} from "../../src/bff/aggregators/emergencyGreenChannelMgmtV13Aggregator";
import { emergencyGreenChannelMgmtV13Routes } from "../../src/bff/routes/emergencyGreenChannelMgmtV13";

const records: EmergencyGreenChannelMgmtRecordV13[] = [
  { timely: 950, total: 1000, success: 900, totalRescue: 1000, observationHours: 2.3 },
  { timely: 950, total: 1000, success: 900, totalRescue: 1000, observationHours: 3.2 },
];

describe("computeEmergencyGreenChannelAcceptanceTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("绿色通道接诊及时率 = 95.00%", () => {
    expect(computeEmergencyGreenChannelAcceptanceTimelinessRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeEmergencyGreenChannelAcceptanceTimelinessRateV13([])).toBe(0);
  });
});

describe("computeEmergencyGreenChannelRescueSuccessRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("急危重症抢救成功率 = 90.00%", () => {
    expect(computeEmergencyGreenChannelRescueSuccessRateV13(records)).toBe(90.00);
  });
});

describe("computeEmergencyGreenChannelObservationHoursV13", () => {
  // 算式：avg = (2.3+3.2)/2 = 5.5/2 = 2.75 → Math.ceil(2.75) = 3 小时
  it("急诊留观时长 = 3 小时（Math.ceil 整小时）", () => {
    expect(computeEmergencyGreenChannelObservationHoursV13(records)).toBe(3);
  });
});

describe("emergencyGreenChannelMgmtV13Routes 读路由", () => {
  it("GET /api/v1/emergency-green-channel-mgmt 路由存在且 auth:true", () => {
    const route = emergencyGreenChannelMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/emergency-green-channel-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
