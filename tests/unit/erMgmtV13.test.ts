/**
 * 健澜科技 jlmedaios - 急诊管理 V13 单测（M416-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeErRescueRoomAvgStayHoursV13,
  computeErStayOver48hRateV13,
  computeErTriageAccuracyRateV13,
  type ErMgmtRecordV13,
} from "../../src/bff/aggregators/erMgmtV13Aggregator";
import { erMgmtV13Routes } from "../../src/bff/routes/erMgmtV13";

const records: ErMgmtRecordV13[] = [
  { accurate: 950, triageTotal: 1000, over48h: 20, erPatientTotal: 1000, stayHours: 3.2 },
  { accurate: 950, triageTotal: 1000, over48h: 20, erPatientTotal: 1000, stayHours: 4.5 },
];

describe("computeErTriageAccuracyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("急诊分诊准确率 = 95.00%", () => {
    expect(computeErTriageAccuracyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeErTriageAccuracyRateV13([])).toBe(0);
  });
});

describe("computeErStayOver48hRateV13", () => {
  // 算式：(20+20)/(1000+1000)×100 = 40/2000×100 = 2.00（反向指标，越低越好）
  it("急诊滞留时间超48h患者比例 = 2.00%（反向指标）", () => {
    expect(computeErStayOver48hRateV13(records)).toBe(2.00);
  });
});

describe("computeErRescueRoomAvgStayHoursV13", () => {
  // 算式：(3.2+4.5)/2 = 7.7/2 = 3.85 → Math.ceil(3.85) = 4 小时
  it("急诊抢救室平均停留小时 = 4 小时（Math.ceil）", () => {
    expect(computeErRescueRoomAvgStayHoursV13(records)).toBe(4);
  });
});

describe("erMgmtV13Routes 读路由", () => {
  it("GET /api/v1/er-mgmt 路由存在且 auth:true", () => {
    const route = erMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/er-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
