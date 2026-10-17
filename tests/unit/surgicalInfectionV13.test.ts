/**
 * 健澜科技 jlmedaios - 手术部位感染 V13 单测（M357-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClass1IncisionInfectionRateV13,
  computePerioperativeProphylaxisRationalRateV13,
  computeSsiRateV13,
  type SurgicalInfectionRecordV13,
} from "../../src/bff/aggregators/surgicalInfectionV13Aggregator";
import { surgicalInfectionV13Routes } from "../../src/bff/routes/surgicalInfectionV13";

const records: SurgicalInfectionRecordV13[] = [
  { ssiInfected: 2, surgeryCount: 1000, class1Infected: 1, class1IncisionCount: 500, prophylaxisRational: 480, prophylaxisCount: 500 },
  { ssiInfected: 2, surgeryCount: 1000, class1Infected: 1, class1IncisionCount: 500, prophylaxisRational: 470, prophylaxisCount: 500 },
];

describe("computeSsiRateV13", () => {
  // 算式：(2+2)/(1000+1000) = 4/2000×100 = 0.20
  it("SSI 发生率 = 0.20%", () => {
    expect(computeSsiRateV13(records)).toBe(0.20);
  });
  it("空态 → 0", () => {
    expect(computeSsiRateV13([])).toBe(0);
  });
});

describe("computeClass1IncisionInfectionRateV13", () => {
  // 算式：(1+1)/(500+500) = 2/1000×100 = 0.20
  it("Ⅰ类切口感染率 = 0.20%", () => {
    expect(computeClass1IncisionInfectionRateV13(records)).toBe(0.20);
  });
});

describe("computePerioperativeProphylaxisRationalRateV13", () => {
  // 算式：(480+470)/(500+500) = 950/1000×100 = 95.00
  it("围术期预防用药合理率 = 95.00%", () => {
    expect(computePerioperativeProphylaxisRationalRateV13(records)).toBe(95.00);
  });
});

describe("surgicalInfectionV13Routes 读路由", () => {
  it("GET /api/v1/surgical-infection 路由存在且 auth:true", () => {
    const route = surgicalInfectionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/surgical-infection",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
