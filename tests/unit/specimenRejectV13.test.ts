/**
 * 健澜科技 jlmedaios - 标本不合格率 V13 单测（M338-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSpecimenRejectRateV13,
  type SpecimenRejectRecordV13,
} from "../../src/bff/aggregators/specimenRejectV13Aggregator";
import { specimenRejectV13Routes } from "../../src/bff/routes/specimenRejectV13";

const records: SpecimenRejectRecordV13[] = [
  { totalSpecimens: 1000, rejectedSpecimens: 20 },
];

describe("computeSpecimenRejectRateV13", () => {
  // 算式：20/1000×100 = 2
  it("标本不合格率 = 2%", () => {
    expect(computeSpecimenRejectRateV13(records)).toBe(2);
  });
  it("空态 → 0", () => {
    expect(computeSpecimenRejectRateV13([])).toBe(0);
  });
  it("总标本数为 0 → 0", () => {
    const zeroRecords: SpecimenRejectRecordV13[] = [
      { totalSpecimens: 0, rejectedSpecimens: 0 },
    ];
    expect(computeSpecimenRejectRateV13(zeroRecords)).toBe(0);
  });
});

describe("specimenRejectV13Routes 读路由", () => {
  it("GET /api/v1/specimen-reject 路由存在且 auth:true", () => {
    const route = specimenRejectV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/specimen-reject",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
