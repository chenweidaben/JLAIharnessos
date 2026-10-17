/**
 * 健澜科技 jlmedaios - 手术质量 V13 单测（M371-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSurgeryComplicationRateV13,
  computeSurgeryMortalityRateV13,
  computeType1IncisionHealingRateV13,
  type SurgeryQualityRecordV13,
} from "../../src/bff/aggregators/surgeryQualityV13Aggregator";
import { surgeryQualityV13Routes } from "../../src/bff/routes/surgeryQualityV13";

const records: SurgeryQualityRecordV13[] = [
  { surgeryCount: 100, complicationCount: 2, mortalityCount: 1, type1IncisionCount: 50, type1HealingGradeA: 48 },
  { surgeryCount: 100, complicationCount: 2, mortalityCount: 1, type1IncisionCount: 50, type1HealingGradeA: 48 },
];

describe("computeSurgeryComplicationRateV13", () => {
  // 算式：(2+2)/(100+100) = 4/200×100 = 2.00
  it("手术并发症率 = 2.00%", () => {
    expect(computeSurgeryComplicationRateV13(records)).toBe(2.00);
  });
  it("空态 → 0", () => {
    expect(computeSurgeryComplicationRateV13([])).toBe(0);
  });
});

describe("computeSurgeryMortalityRateV13", () => {
  // 算式：(1+1)/(100+100) = 2/200×100 = 1.00
  it("手术死亡率 = 1.00%", () => {
    expect(computeSurgeryMortalityRateV13(records)).toBe(1.00);
  });
});

describe("computeType1IncisionHealingRateV13", () => {
  // 算式：(48+48)/(50+50) = 96/100×100 = 96.00
  it("Ⅰ类切口甲级愈合率 = 96.00%", () => {
    expect(computeType1IncisionHealingRateV13(records)).toBe(96.00);
  });
});

describe("surgeryQualityV13Routes 读路由", () => {
  it("GET /api/v1/surgery-quality 路由存在且 auth:true", () => {
    const route = surgeryQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/surgery-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
