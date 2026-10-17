/**
 * 健澜科技 jlmedaios - 公共卫生应急 V13 单测（M324-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeChronicDiseaseCoverageV13,
  computeEmergencyResponseTimeV13,
  computeVaccinationCompletionRateV13,
  type ChronicPatientV13,
  type EmergencyEventV13,
  type VaccinationRecordV13,
} from "../../src/bff/aggregators/publicHealthEmergencyV13Aggregator";
import { publicHealthEmergencyV13Routes } from "../../src/bff/routes/publicHealthEmergencyV13";

const events: EmergencyEventV13[] = [
  { responseMinutes: 5 },
  { responseMinutes: 10 },
  { responseMinutes: 15 },
  { responseMinutes: 20 },
];

const vaccinations: VaccinationRecordV13[] = [
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: false },
];

const chronicPatients: ChronicPatientV13[] = [
  { isManaged: true },
  { isManaged: true },
  { isManaged: true },
  { isManaged: true },
  { isManaged: false },
];

describe("computeEmergencyResponseTimeV13", () => {
  // 算式：(5+10+15+20)/4 = 50/4 = 12.5
  it("平均响应 = 12.5 分钟", () => {
    expect(computeEmergencyResponseTimeV13(events)).toBe(12.5);
  });
  it("空态 → 0", () => {
    expect(computeEmergencyResponseTimeV13([])).toBe(0);
  });
});

describe("computeVaccinationCompletionRateV13", () => {
  // 算式：9/10×100 = 90
  it("疫苗接种率 = 90%", () => {
    expect(computeVaccinationCompletionRateV13(vaccinations)).toBe(90);
  });
});

describe("computeChronicDiseaseCoverageV13", () => {
  // 算式：4/5×100 = 80
  it("慢病覆盖率 = 80%", () => {
    expect(computeChronicDiseaseCoverageV13(chronicPatients)).toBe(80);
  });
});

describe("publicHealthEmergencyV13Routes 读路由", () => {
  it("GET /api/v1/public-health-emergency 路由存在且 auth:true", () => {
    const route = publicHealthEmergencyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/public-health-emergency",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
