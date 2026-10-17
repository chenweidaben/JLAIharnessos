/**
 * 健澜科技 jlmedaios - 中药房 V13 单测（M380-D，M380 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeTCMDecoctionCountV13,
  computeTCMHerbVarietyCountV13,
  computeTCMPrescriptionCountV13,
  type TCMpharmacyRecordV13,
} from "../../src/bff/aggregators/TCMpharmacyV13Aggregator";
import { TCMpharmacyV13Routes } from "../../src/bff/routes/TCMpharmacyV13";

const records: TCMpharmacyRecordV13[] = [
  { herbVarietyCount: 200, decoctionCount: 300, prescriptionCount: 800 },
  { herbVarietyCount: 200, decoctionCount: 300, prescriptionCount: 800 },
];

describe("computeTCMHerbVarietyCountV13", () => {
  // 算式：200+200 = 400
  it("中药饮片品种数 = 400 种", () => {
    expect(computeTCMHerbVarietyCountV13(records)).toBe(400);
  });
  it("空态 → 0", () => {
    expect(computeTCMHerbVarietyCountV13([])).toBe(0);
  });
});

describe("computeTCMDecoctionCountV13", () => {
  // 算式：300+300 = 600
  it("中药代煎剂人次 = 600 人次", () => {
    expect(computeTCMDecoctionCountV13(records)).toBe(600);
  });
});

describe("computeTCMPrescriptionCountV13", () => {
  // 算式：800+800 = 1600
  it("中药处方数 = 1600 张", () => {
    expect(computeTCMPrescriptionCountV13(records)).toBe(1600);
  });
});

describe("TCMpharmacyV13Routes 读路由", () => {
  it("GET /api/v1/tcm-pharmacy 路由存在且 auth:true", () => {
    const route = TCMpharmacyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/tcm-pharmacy",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
