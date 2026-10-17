/**
 * 健澜科技 jlmedaios - 员工流失率 V13 单测（M346-A，stats 避让已有 staffTurnoverV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgActiveStaffV13,
  computeMonthlyResignCountV13,
  computeTurnoverRateV13,
  type StaffTurnoverRecordV13,
} from "../../src/bff/aggregators/staffTurnoverStatsV13Aggregator";
import { staffTurnoverStatsV13Routes } from "../../src/bff/routes/staffTurnoverStatsV13";

const records: StaffTurnoverRecordV13[] = [
  { resignCount: 1, avgActiveStaff: 200 },
  { resignCount: 1, avgActiveStaff: 200 },
];

describe("computeMonthlyResignCountV13", () => {
  // 算式：1+1 = 2
  it("月度离职人数 = 2 人", () => {
    expect(computeMonthlyResignCountV13(records)).toBe(2);
  });
  it("空态 → 0", () => {
    expect(computeMonthlyResignCountV13([])).toBe(0);
  });
});

describe("computeAvgActiveStaffV13", () => {
  // 算式：(200+200)/2 = 200
  it("平均在职人数 = 200 人", () => {
    expect(computeAvgActiveStaffV13(records)).toBe(200);
  });
});

describe("computeTurnoverRateV13", () => {
  // 算式：2/200×100 = 1.00
  it("流失率 = 1.00%", () => {
    expect(computeTurnoverRateV13(records)).toBe(1.00);
  });
});

describe("staffTurnoverStatsV13Routes 读路由", () => {
  it("GET /api/v1/staff-turnover-stats 路由存在且 auth:true", () => {
    const route = staffTurnoverStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/staff-turnover-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
