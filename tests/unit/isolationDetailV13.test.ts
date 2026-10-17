/**
 * 健澜科技 jlmedaios - 隔离管理（细节）V13 单测（M423-B，detail 避让旧版 isolationMgmtV13（M393-B））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeIsolationMeasuresImplementationRateV13,
  computeIsolationOrderComplianceRateV13,
  computeIsolationSignCorrectRateV13,
  type IsolationDetailRecordV13,
} from "../../src/bff/aggregators/isolationDetailV13Aggregator";
import { isolationDetailV13Routes } from "../../src/bff/routes/isolationDetailV13";

const records: IsolationDetailRecordV13[] = [
  { implemented: 980, shouldIsolate: 1000, signCorrect: 990, isolationTotal: 1000, orderCompliant: 970, isolationOrderTotal: 1000 },
  { implemented: 980, shouldIsolate: 1000, signCorrect: 990, isolationTotal: 1000, orderCompliant: 970, isolationOrderTotal: 1000 },
];

describe("computeIsolationMeasuresImplementationRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("隔离措施落实率 = 98.00%", () => {
    expect(computeIsolationMeasuresImplementationRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeIsolationMeasuresImplementationRateV13([])).toBe(0);
  });
});

describe("computeIsolationSignCorrectRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("隔离标识正确率 = 99.00%", () => {
    expect(computeIsolationSignCorrectRateV13(records)).toBe(99.00);
  });
});

describe("computeIsolationOrderComplianceRateV13", () => {
  // 算式：(970+970)/(1000+1000)×100 = 1940/2000×100 = 97.00
  it("隔离医嘱规范率 = 97.00%", () => {
    expect(computeIsolationOrderComplianceRateV13(records)).toBe(97.00);
  });
});

describe("isolationDetailV13Routes 读路由", () => {
  it("GET /api/v1/isolation-detail 路由存在且 auth:true", () => {
    const route = isolationDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/isolation-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
