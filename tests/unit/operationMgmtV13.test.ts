/**
 * 健澜科技 jlmedaios - 运营管理 V13 单测（M364-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgLOSV13,
  computeBedTurnoverRateV13,
  computeSurgeryIntervalDaysV13,
  type OperationMgmtRecordV13,
} from "../../src/bff/aggregators/operationMgmtV13Aggregator";
import { operationMgmtV13Routes } from "../../src/bff/routes/operationMgmtV13";

const records: OperationMgmtRecordV13[] = [
  { avgLOS: 8, bedTurnoverDischarged: 950, avgOpenBeds: 200, surgeryIntervalDays: 3 },
  { avgLOS: 10, bedTurnoverDischarged: 950, avgOpenBeds: 200, surgeryIntervalDays: 3 },
];

describe("computeAvgLOSV13", () => {
  // 算式：(8+10)/2 = 9.00
  it("平均住院日 = 9.00", () => {
    expect(computeAvgLOSV13(records)).toBe(9.00);
  });
  it("空态 → 0", () => {
    expect(computeAvgLOSV13([])).toBe(0);
  });
});

describe("computeBedTurnoverRateV13", () => {
  // 算式：(950+950)/(200+200) = 1900/400 = 4.75
  it("床位周转率 = 4.75", () => {
    expect(computeBedTurnoverRateV13(records)).toBe(4.75);
  });
});

describe("computeSurgeryIntervalDaysV13", () => {
  // 算式：(3+3)/2 = 3.00
  it("手术间隔天数 = 3.00", () => {
    expect(computeSurgeryIntervalDaysV13(records)).toBe(3.00);
  });
});

describe("operationMgmtV13Routes 读路由", () => {
  it("GET /api/v1/operation-mgmt 路由存在且 auth:true", () => {
    const route = operationMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/operation-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
