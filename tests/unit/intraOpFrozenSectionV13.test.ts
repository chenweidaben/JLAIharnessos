/**
 * 健澜科技 jlmedaios - 术中冰冻病理与术后石蜡符合率 V13 单测（M339-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFrozenParaffinConcordanceV13,
  type FrozenSectionRecordV13,
} from "../../src/bff/aggregators/intraOpFrozenSectionV13Aggregator";
import { intraOpFrozenSectionV13Routes } from "../../src/bff/routes/intraOpFrozenSectionV13";

const records: FrozenSectionRecordV13[] = [
  { totalCases: 100, concordantCases: 95 },
];

describe("computeFrozenParaffinConcordanceV13", () => {
  // 算式：95/100×100 = 95.0
  it("冰冻-石蜡符合率 = 95.0%", () => {
    expect(computeFrozenParaffinConcordanceV13(records)).toBe(95.0);
  });
  it("空态 → 0", () => {
    expect(computeFrozenParaffinConcordanceV13([])).toBe(0);
  });
  it("总例数为 0 → 0", () => {
    const zeroRecords: FrozenSectionRecordV13[] = [
      { totalCases: 0, concordantCases: 0 },
    ];
    expect(computeFrozenParaffinConcordanceV13(zeroRecords)).toBe(0);
  });
});

describe("intraOpFrozenSectionV13Routes 读路由", () => {
  it("GET /api/v1/intraop-frozen-section 路由存在且 auth:true", () => {
    const route = intraOpFrozenSectionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/intraop-frozen-section",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
