/**
 * 健澜科技 jlmedaios - 手术部位感染率 V13 单测（M339-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSSIRateV13,
  type SSIRecordV13,
} from "../../src/bff/aggregators/ssiRateV13Aggregator";
import { ssiRateV13Routes } from "../../src/bff/routes/ssiRateV13";

const records: SSIRecordV13[] = [
  { totalSurgeries: 500, ssiCount: 5 },
];

describe("computeSSIRateV13", () => {
  // 算式：5/500×100 = 1.0
  it("SSI 发生率 = 1.0%", () => {
    expect(computeSSIRateV13(records)).toBe(1.0);
  });
  it("空态 → 0", () => {
    expect(computeSSIRateV13([])).toBe(0);
  });
  it("总手术数为 0 → 0", () => {
    const zeroRecords: SSIRecordV13[] = [
      { totalSurgeries: 0, ssiCount: 0 },
    ];
    expect(computeSSIRateV13(zeroRecords)).toBe(0);
  });
});

describe("ssiRateV13Routes 读路由", () => {
  it("GET /api/v1/ssi-rate 路由存在且 auth:true", () => {
    const route = ssiRateV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/ssi-rate",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
