/**
 * 健澜科技 jlmedaios - 隔离医嘱执行率 V13 单测（M341-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeIsolationExecutionRateV13,
  type IsolationOrderRecordV13,
} from "../../src/bff/aggregators/isolationOrderV13Aggregator";
import { isolationOrderV13Routes } from "../../src/bff/routes/isolationOrderV13";

const records: IsolationOrderRecordV13[] = [
  { requiredCount: 100, executedCount: 98 },
];

describe("computeIsolationExecutionRateV13", () => {
  // 算式：98/100×100 = 98.0
  it("隔离医嘱执行率 = 98.0%", () => {
    expect(computeIsolationExecutionRateV13(records)).toBe(98.0);
  });
  it("空态 → 0", () => {
    expect(computeIsolationExecutionRateV13([])).toBe(0);
  });
  it("应执行数为 0 → 0", () => {
    const zeroRecords: IsolationOrderRecordV13[] = [
      { requiredCount: 0, executedCount: 0 },
    ];
    expect(computeIsolationExecutionRateV13(zeroRecords)).toBe(0);
  });
});

describe("isolationOrderV13Routes 读路由", () => {
  it("GET /api/v1/isolation-order 路由存在且 auth:true", () => {
    const route = isolationOrderV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/isolation-order",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
