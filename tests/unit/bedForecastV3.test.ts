/**
 * 健澜科技 jlmedaios - 床位需求与周转预测 V3 单测（M277-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildBedForecastV3Report,
  estimateLOSV3,
  forecastBedDemandV3,
  optimizeDischargeV3,
  type BedHistory,
} from "../../src/bff/aggregators/bedForecastV3Aggregator";

const hist: BedHistory = { ward: "心内科", occupied: 48, admitted: 6, discharged: 5, totalBeds: 50 };

describe("forecastBedDemandV3", () => {
  it("占用48+入院6-出院6=48，占用率96%", () => {
    const r = forecastBedDemandV3(hist, 6);
    expect(r.forecastOccupied).toBe(48);
    expect(r.occupancyRate).toBe(96);
  });
});

describe("estimateLOSV3", () => {
  it("肺炎70岁2合并症→12天", () => {
    expect(estimateLOSV3({ age: 70, diagnosis: "肺炎", comorbidities: 2 })).toBe(12);
  });
  it("择期手术50岁无合并症→4天", () => {
    expect(estimateLOSV3({ age: 50, diagnosis: "择期手术", comorbidities: 0 })).toBe(4);
  });
});

describe("optimizeDischargeV3", () => {
  it("仅占用率≥90的病区纳入加速出院", () => {
    const r = optimizeDischargeV3([
      { ward: "A", occupancyRate: 95, readyForDischarge: 5 },
      { ward: "B", occupancyRate: 80, readyForDischarge: 3 },
    ]);
    expect(r.totalExpedite).toBe(5);
    expect(r.expedite[0].ward).toBe("A");
  });
});

describe("buildBedForecastV3Report", () => {
  it("占用率96%→床位压力紧张", () => {
    const r = buildBedForecastV3Report("心内科", hist, 6);
    expect(r.bedPressure).toBe("紧张");
  });
});
