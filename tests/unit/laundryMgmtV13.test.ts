/**
 * 健澜科技 jlmedaios - 被服洗涤管理 V13 单测（M437-B，后勤保障与环境管理深化组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeLaundryCostControlRateV13,
  computeLaundryQualifiedRateV13,
  computeLaundryTurnoverTimelinessRateV13,
  type LaundryMgmtRecordV13,
} from "../../src/bff/aggregators/laundryMgmtV13Aggregator";
import { laundryMgmtV13Routes } from "../../src/bff/routes/laundryMgmtV13";

const records: LaundryMgmtRecordV13[] = [
  { qualifiedLaundry: 960, totalLaundry: 1000, timelyTurnover: 950, shouldTurnover: 1000, actualCost: 900, budgetCost: 1000 },
  { qualifiedLaundry: 960, totalLaundry: 1000, timelyTurnover: 950, shouldTurnover: 1000, actualCost: 900, budgetCost: 1000 },
];

describe("computeLaundryQualifiedRateV13", () => {
  // 算式：(960+960)/(1000+1000)×100 = 1920/2000×100 = 96.00
  it("被服洗涤合格率 = 96.00%", () => {
    expect(computeLaundryQualifiedRateV13(records)).toBe(96.00);
  });
  it("空态 → 0", () => {
    expect(computeLaundryQualifiedRateV13([])).toBe(0);
  });
});

describe("computeLaundryTurnoverTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("被服周转及时率 = 95.00%", () => {
    expect(computeLaundryTurnoverTimelinessRateV13(records)).toBe(95.00);
  });
});

describe("computeLaundryCostControlRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00（反向，越低越好）
  it("被服成本控制率 = 90.00%（反向，越低越好）", () => {
    expect(computeLaundryCostControlRateV13(records)).toBe(90.00);
  });
});

describe("laundryMgmtV13Routes 读路由", () => {
  it("GET /api/v1/laundry-mgmt 路由存在且 auth:true", () => {
    const route = laundryMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/laundry-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
