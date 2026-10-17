/**
 * 健澜科技 jlmedaios - 病房环境管理 V13 单测（M426-D，M426 收官，换名避让旧版 wardMgmtDetailV13（M417））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePatientCallResponseMinutesV13,
  computeWardEnvironmentPassRateV13,
  computeWardPatrolArriveRateV13,
  type WardEnvironmentMgmtRecordV13,
} from "../../src/bff/aggregators/wardEnvironmentMgmtV13Aggregator";
import { wardEnvironmentMgmtV13Routes } from "../../src/bff/routes/wardEnvironmentMgmtV13";

const records: WardEnvironmentMgmtRecordV13[] = [
  { patrolArrived: 980, shouldPatrol: 1000, envPass: 950, envTotal: 1000, respMinutes: 4.2 },
  { patrolArrived: 980, shouldPatrol: 1000, envPass: 950, envTotal: 1000, respMinutes: 5.5 },
];

describe("computeWardPatrolArriveRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("病房巡查到位率 = 98.00%", () => {
    expect(computeWardPatrolArriveRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeWardPatrolArriveRateV13([])).toBe(0);
  });
});

describe("computeWardEnvironmentPassRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("病房环境合格率 = 95.00%", () => {
    expect(computeWardEnvironmentPassRateV13(records)).toBe(95.00);
  });
});

describe("computePatientCallResponseMinutesV13", () => {
  // 算式：avg = (4.2+5.5)/2 = 4.85，Math.ceil(4.85) = 5 分钟
  it("患者呼叫响应时间 = 5 分钟（Math.ceil 整分钟）", () => {
    expect(computePatientCallResponseMinutesV13(records)).toBe(5);
  });
});

describe("wardEnvironmentMgmtV13Routes 读路由", () => {
  it("GET /api/v1/ward-environment-mgmt 路由存在且 auth:true", () => {
    const route = wardEnvironmentMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/ward-environment-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
