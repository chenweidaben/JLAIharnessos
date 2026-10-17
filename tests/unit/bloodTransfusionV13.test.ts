/**
 * 健澜科技 jlmedaios - 输血率 V13 单测（M342-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeTransfusionRatePer1000V13,
  type BloodTransfusionRecordV13,
} from "../../src/bff/aggregators/bloodTransfusionV13Aggregator";
import { bloodTransfusionV13Routes } from "../../src/bff/routes/bloodTransfusionV13";

const records: BloodTransfusionRecordV13[] = [
  { inpatientCount: 1000, transfusionCount: 50 },
];

describe("computeTransfusionRatePer1000V13", () => {
  // 算式：50×1000/1000 = 50.0
  it("千人输血率 = 50.0‰", () => {
    expect(computeTransfusionRatePer1000V13(records)).toBe(50.0);
  });
  it("空态 → 0", () => {
    expect(computeTransfusionRatePer1000V13([])).toBe(0);
  });
  it("住院患者数为 0 → 0", () => {
    const zeroRecords: BloodTransfusionRecordV13[] = [
      { inpatientCount: 0, transfusionCount: 0 },
    ];
    expect(computeTransfusionRatePer1000V13(zeroRecords)).toBe(0);
  });
});

describe("bloodTransfusionV13Routes 读路由", () => {
  it("GET /api/v1/blood-transfusion 路由存在且 auth:true", () => {
    const route = bloodTransfusionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/blood-transfusion",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
