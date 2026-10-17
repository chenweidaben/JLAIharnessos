/**
 * 健澜科技 jlmedaios - 检验差错率 V13 单测（M338-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEQAFailureRateV13,
  computeQCFailureCountV13,
  type LabErrorRecordV13,
} from "../../src/bff/aggregators/labErrorV13Aggregator";
import { labErrorV13Routes } from "../../src/bff/routes/labErrorV13";

const records: LabErrorRecordV13[] = [
  { qcFailureCount: 3, eqaTotalItems: 10, eqaFailedItems: 1 },
  { qcFailureCount: 2, eqaTotalItems: 10, eqaFailedItems: 1 },
];

describe("computeQCFailureCountV13", () => {
  // 算式：3+2 = 5
  it("质控失控次数 = 5", () => {
    expect(computeQCFailureCountV13(records)).toBe(5);
  });
  it("空态 → 0", () => {
    expect(computeQCFailureCountV13([])).toBe(0);
  });
});

describe("computeEQAFailureRateV13", () => {
  // 算式：(1+1)/((10+10)) = 2/20×100 = 10
  it("室间质评不合格率 = 10%", () => {
    expect(computeEQAFailureRateV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeEQAFailureRateV13([])).toBe(0);
  });
});

describe("labErrorV13Routes 读路由", () => {
  it("GET /api/v1/lab-error 路由存在且 auth:true", () => {
    const route = labErrorV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/lab-error",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
