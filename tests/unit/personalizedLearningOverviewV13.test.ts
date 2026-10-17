/**
 * 健澜科技 jlmedaios - 个人化学习效果总览 V13 单测（M303-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPersonalizedLearningOverviewV13,
  computePersonalizationMaturityV13,
  identifyPersonalizationGapV13,
  type PersonalizedDoctorV13,
} from "../../src/bff/aggregators/personalizedLearningOverviewV13Aggregator";
import { personalizedLearningOverviewV13Routes } from "../../src/bff/routes/personalizedLearningOverviewV13";

const doctors: PersonalizedDoctorV13[] = [
  { doctorId: "dr-zhang", active: true, adoptionRate: 40, slope: 22, coldStart: false, plateau: false },
  { doctorId: "dr-li", active: true, adoptionRate: 30, slope: 5, coldStart: false, plateau: false },
  { doctorId: "dr-wang", active: true, adoptionRate: 35, slope: 10, coldStart: false, plateau: false },
  { doctorId: "dr-new1", active: false, adoptionRate: 0, slope: 0, coldStart: true, plateau: false },
  { doctorId: "dr-new2", active: false, adoptionRate: 0, slope: 0, coldStart: true, plateau: false },
];

describe("buildPersonalizedLearningOverviewV13", () => {
  it("5医生：active=3, avgAdoption=21(=105/5), avgSlope=7.4(=37/5), plateau=0, coldStart=2", () => {
    const o = buildPersonalizedLearningOverviewV13(doctors);
    expect(o.activeDoctors).toBe(3);
    expect(o.avgAdoptionRate).toBe(21);
    expect(o.avgSlope).toBe(7.4);
    expect(o.plateauDoctors).toBe(0);
    expect(o.coldStartDoctors).toBe(2);
  });
  it("空态 → 全0", () => {
    const o = buildPersonalizedLearningOverviewV13([]);
    expect(o.activeDoctors).toBe(0);
  });
});

describe("computePersonalizationMaturityV13", () => {
  it("activeRatio=60×0.3=18 + adoption=21×0.4=8.4 + slope=7.4×0.3=2.22 → round(28.62)=29", () => {
    const o = buildPersonalizedLearningOverviewV13(doctors);
    expect(computePersonalizationMaturityV13(o, 5)).toBe(29);
  });
});

describe("identifyPersonalizationGapV13", () => {
  it("coldStart=2≤10, plateau=0≤5 → 无缺口", () => {
    const o = buildPersonalizedLearningOverviewV13(doctors);
    expect(identifyPersonalizationGapV13(o)).toBe("");
  });
  it("coldStart=11>10 → '新医生冷启动未覆盖'", () => {
    const o = { activeDoctors: 5, avgAdoptionRate: 30, avgSlope: 10, plateauDoctors: 0, coldStartDoctors: 11 };
    expect(identifyPersonalizationGapV13(o)).toContain("冷启动");
  });
  it("plateau=6>5 → '多人学习进入平台期'", () => {
    const o = { activeDoctors: 5, avgAdoptionRate: 30, avgSlope: 1, plateauDoctors: 6, coldStartDoctors: 0 };
    expect(identifyPersonalizationGapV13(o)).toContain("平台期");
  });
});

describe("personalizedLearningOverviewV13Routes 读路由", () => {
  it("GET /api/v1/personalized-learning-overview 路由存在且 auth:true", () => {
    const route = personalizedLearningOverviewV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/personalized-learning-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
