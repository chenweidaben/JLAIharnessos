/**
 * 健澜科技 jlmedaios - 危急值管理 V13 单测（M411-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCriticalValueClosedLoopRateV13,
  computeCriticalValueRegistrationPassRateV13,
  computeCriticalValueReportTimelyRateV13,
  type CriticalValueMgmtRecordV13,
} from "../../src/bff/aggregators/criticalValueMgmtV13Aggregator";
import { criticalValueMgmtV13Routes } from "../../src/bff/routes/criticalValueMgmtV13";

const records: CriticalValueMgmtRecordV13[] = [
  { timely: 98, total: 100, closedLoop: 95, registered: 99, registrationTotal: 100 },
  { timely: 98, total: 100, closedLoop: 95, registered: 99, registrationTotal: 100 },
];

describe("computeCriticalValueReportTimelyRateV13", () => {
  // 算式：(98+98)/(100+100)×100 = 196/200×100 = 98.00
  it("危急值报告及时率 = 98.00%", () => {
    expect(computeCriticalValueReportTimelyRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeCriticalValueReportTimelyRateV13([])).toBe(0);
  });
});

describe("computeCriticalValueClosedLoopRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("危急值处理闭环率 = 95.00%", () => {
    expect(computeCriticalValueClosedLoopRateV13(records)).toBe(95.00);
  });
});

describe("computeCriticalValueRegistrationPassRateV13", () => {
  // 算式：(99+99)/(100+100)×100 = 198/200×100 = 99.00
  it("危急值登记合格率 = 99.00%", () => {
    expect(computeCriticalValueRegistrationPassRateV13(records)).toBe(99.00);
  });
});

describe("criticalValueMgmtV13Routes 读路由", () => {
  it("GET /api/v1/critical-value-mgmt 路由存在且 auth:true", () => {
    const route = criticalValueMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/critical-value-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
