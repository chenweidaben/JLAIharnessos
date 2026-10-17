/**
 * 健澜科技 jlmedaios - 危急值管理（细节）V13 单测（M425-A，detail 避让旧版 criticalValueMgmtV13（M411））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCriticalValueClosedLoopRateV13,
  computeCriticalValueNotificationTimelyRateV13,
  computeCriticalValueRecordCompleteRateV13,
  type CriticalValueDetailRecordV13,
} from "../../src/bff/aggregators/criticalValueDetailV13Aggregator";
import { criticalValueDetailV13Routes } from "../../src/bff/routes/criticalValueDetailV13";

const records: CriticalValueDetailRecordV13[] = [
  { timelyNotified: 980, closedLoop: 950, recordComplete: 990, criticalTotal: 1000 },
  { timelyNotified: 980, closedLoop: 950, recordComplete: 990, criticalTotal: 1000 },
];

describe("computeCriticalValueNotificationTimelyRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("危急值通报及时率 = 98.00%", () => {
    expect(computeCriticalValueNotificationTimelyRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeCriticalValueNotificationTimelyRateV13([])).toBe(0);
  });
});

describe("computeCriticalValueClosedLoopRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("危急值处置闭环率 = 95.00%", () => {
    expect(computeCriticalValueClosedLoopRateV13(records)).toBe(95.00);
  });
});

describe("computeCriticalValueRecordCompleteRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("危急值记录完整率 = 99.00%", () => {
    expect(computeCriticalValueRecordCompleteRateV13(records)).toBe(99.00);
  });
});

describe("criticalValueDetailV13Routes 读路由", () => {
  it("GET /api/v1/critical-value-detail 路由存在且 auth:true", () => {
    const route = criticalValueDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/critical-value-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
