/**
 * 健澜科技 jlmedaios - 压疮管理（细节）V13 单测（M422-B，detail 避让旧版 pressureUlcerMgmtV13（M394-B））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHospitalPressureUlcerOccurrenceRateV13,
  computePressureUlcerHealingRateV13,
  computePressureUlcerReportTimelyRateV13,
  type PressureUlcerDetailRecordV13,
} from "../../src/bff/aggregators/pressureUlcerDetailV13Aggregator";
import { pressureUlcerDetailV13Routes } from "../../src/bff/routes/pressureUlcerDetailV13";

const records: PressureUlcerDetailRecordV13[] = [
  { occurredPatients: 5, inpatientTotal: 10000, reportedTimely: 98, pressureUlcerTotal: 100, healedCount: 90 },
  { occurredPatients: 5, inpatientTotal: 10000, reportedTimely: 98, pressureUlcerTotal: 100, healedCount: 90 },
];

describe("computeHospitalPressureUlcerOccurrenceRateV13", () => {
  // 算式：(5+5)/(10000+10000)×100 = 10/20000×100 = 0.05（反向指标，越低越好）
  it("院内压疮发生率 = 0.05%（反向指标）", () => {
    expect(computeHospitalPressureUlcerOccurrenceRateV13(records)).toBe(0.05);
  });
  it("空态 → 0", () => {
    expect(computeHospitalPressureUlcerOccurrenceRateV13([])).toBe(0);
  });
});

describe("computePressureUlcerReportTimelyRateV13", () => {
  // 算式：(98+98)/(100+100)×100 = 196/200×100 = 98.00
  it("压疮上报及时率 = 98.00%", () => {
    expect(computePressureUlcerReportTimelyRateV13(records)).toBe(98.00);
  });
});

describe("computePressureUlcerHealingRateV13", () => {
  // 算式：(90+90)/(100+100)×100 = 180/200×100 = 90.00
  it("压疮愈合率 = 90.00%", () => {
    expect(computePressureUlcerHealingRateV13(records)).toBe(90.00);
  });
});

describe("pressureUlcerDetailV13Routes 读路由", () => {
  it("GET /api/v1/pressure-ulcer-detail 路由存在且 auth:true", () => {
    const route = pressureUlcerDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pressure-ulcer-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
