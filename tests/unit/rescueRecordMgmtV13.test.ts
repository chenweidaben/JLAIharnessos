/**
 * 健澜科技 jlmedaios - 抢救记录管理 V13 单测（M426-A，换名避让旧版 rescueMgmtV13（M415））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeRescueRecordCompleteRateV13,
  computeRescueRecordPassRateV13,
  computeRescueRecordTimelyRateV13,
  type RescueRecordMgmtRecordV13,
} from "../../src/bff/aggregators/rescueRecordMgmtV13Aggregator";
import { rescueRecordMgmtV13Routes } from "../../src/bff/routes/rescueRecordMgmtV13";

const records: RescueRecordMgmtRecordV13[] = [
  { recordComplete: 980, recordTimely: 950, recordPass: 990, rescueTotal: 1000 },
  { recordComplete: 980, recordTimely: 950, recordPass: 990, rescueTotal: 1000 },
];

describe("computeRescueRecordCompleteRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("抢救记录完整率 = 98.00%", () => {
    expect(computeRescueRecordCompleteRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeRescueRecordCompleteRateV13([])).toBe(0);
  });
});

describe("computeRescueRecordTimelyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("抢救记录及时率 = 95.00%", () => {
    expect(computeRescueRecordTimelyRateV13(records)).toBe(95.00);
  });
});

describe("computeRescueRecordPassRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("抢救记录合格率 = 99.00%", () => {
    expect(computeRescueRecordPassRateV13(records)).toBe(99.00);
  });
});

describe("rescueRecordMgmtV13Routes 读路由", () => {
  it("GET /api/v1/rescue-record-mgmt 路由存在且 auth:true", () => {
    const route = rescueRecordMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/rescue-record-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
