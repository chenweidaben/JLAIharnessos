/**
 * 健澜科技 jlmedaios - 隔离管理 V13 单测（M393-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeIsolationLabelCorrectRateV13,
  computeIsolationMeasureImplementationRateV13,
  computeIsolationPatientDisposalRateV13,
  type IsolationMgmtRecordV13,
} from "../../src/bff/aggregators/isolationMgmtV13Aggregator";
import { isolationMgmtV13Routes } from "../../src/bff/routes/isolationMgmtV13";

const records: IsolationMgmtRecordV13[] = [
  { implementedCount: 950, shouldCount: 1000, correctCount: 980, checkTotalCount: 1000, disposedCount: 900, shouldDisposeCount: 1000 },
  { implementedCount: 950, shouldCount: 1000, correctCount: 980, checkTotalCount: 1000, disposedCount: 900, shouldDisposeCount: 1000 },
];

describe("computeIsolationMeasureImplementationRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("隔离措施落实率 = 95.00%", () => {
    expect(computeIsolationMeasureImplementationRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeIsolationMeasureImplementationRateV13([])).toBe(0);
  });
});

describe("computeIsolationLabelCorrectRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("隔离标识正确率 = 98.00%", () => {
    expect(computeIsolationLabelCorrectRateV13(records)).toBe(98.00);
  });
});

describe("computeIsolationPatientDisposalRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("隔离患者处置率 = 90.00%", () => {
    expect(computeIsolationPatientDisposalRateV13(records)).toBe(90.00);
  });
});

describe("isolationMgmtV13Routes 读路由", () => {
  it("GET /api/v1/isolation-mgmt 路由存在且 auth:true", () => {
    const route = isolationMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/isolation-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
