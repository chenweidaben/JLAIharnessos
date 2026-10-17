/**
 * 健澜科技 jlmedaios - 护理质量（统计）V13 单测（M369-A，stats避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBasicNursingPassRateV13,
  computeNursingPassRateV13,
  computeSpecialNursingPassRateV13,
  type NursingQualityStatsRecordV13,
} from "../../src/bff/aggregators/nursingQualityStatsV13Aggregator";
import { nursingQualityStatsV13Routes } from "../../src/bff/routes/nursingQualityStatsV13";

const records: NursingQualityStatsRecordV13[] = [
  { totalCheck: 100, totalPass: 95, basicCheck: 100, basicPass: 90, specialCheck: 100, specialPass: 98 },
  { totalCheck: 100, totalPass: 95, basicCheck: 100, basicPass: 90, specialCheck: 100, specialPass: 98 },
];

describe("computeNursingPassRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("护理合格率 = 95.00%", () => {
    expect(computeNursingPassRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeNursingPassRateV13([])).toBe(0);
  });
});

describe("computeBasicNursingPassRateV13", () => {
  // 算式：(90+90)/(100+100) = 180/200×100 = 90.00
  it("基础护理合格率 = 90.00%", () => {
    expect(computeBasicNursingPassRateV13(records)).toBe(90.00);
  });
});

describe("computeSpecialNursingPassRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("特级护理合格率 = 98.00%", () => {
    expect(computeSpecialNursingPassRateV13(records)).toBe(98.00);
  });
});

describe("nursingQualityStatsV13Routes 读路由", () => {
  it("GET /api/v1/nursing-quality-stats 路由存在且 auth:true", () => {
    const route = nursingQualityStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-quality-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
