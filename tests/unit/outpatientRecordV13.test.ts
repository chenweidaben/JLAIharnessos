/**
 * 健澜科技 jlmedaios - 门诊病历书写合格率 V13 单测（M340-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOutpatientRecordPassRateV13,
  type OutpatientRecordV13,
} from "../../src/bff/aggregators/outpatientRecordV13Aggregator";
import { outpatientRecordV13Routes } from "../../src/bff/routes/outpatientRecordV13";

const records: OutpatientRecordV13[] = [
  { totalChecked: 100, passCount: 95 },
];

describe("computeOutpatientRecordPassRateV13", () => {
  // 算式：95/100×100 = 95.0
  it("门诊病历书写合格率 = 95.0%", () => {
    expect(computeOutpatientRecordPassRateV13(records)).toBe(95.0);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientRecordPassRateV13([])).toBe(0);
  });
  it("抽查总数为 0 → 0", () => {
    const zeroRecords: OutpatientRecordV13[] = [
      { totalChecked: 0, passCount: 0 },
    ];
    expect(computeOutpatientRecordPassRateV13(zeroRecords)).toBe(0);
  });
});

describe("outpatientRecordV13Routes 读路由", () => {
  it("GET /api/v1/outpatient-record 路由存在且 auth:true", () => {
    const route = outpatientRecordV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/outpatient-record",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
