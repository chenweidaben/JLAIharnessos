/**
 * 健澜科技 jlmedaios - 患者安全事件总览 V13 单测（M322-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSafetyOverviewV13,
  computeYoyReductionRateV13,
  countSafetyEventsByTypeV13,
  type SafetyEventV13,
} from "../../src/bff/aggregators/patientSafetyV13Aggregator";
import { patientSafetyV13Routes } from "../../src/bff/routes/patientSafetyV13";

const currentEvents: SafetyEventV13[] = [
  { eventId: "e1", type: "fall" },
  { eventId: "e2", type: "fall" },
  { eventId: "e3", type: "fall" },
  { eventId: "e4", type: "fall" },
  { eventId: "e5", type: "fall" },
  { eventId: "e6", type: "fall" },
  { eventId: "e7", type: "fall" },
  { eventId: "e8", type: "bedsore" },
  { eventId: "e9", type: "bedsore" },
  { eventId: "e10", type: "bedsore" },
  { eventId: "e11", type: "bedsore" },
  { eventId: "e12", type: "bedsore" },
  { eventId: "e13", type: "medicationError" },
  { eventId: "e14", type: "medicationError" },
  { eventId: "e15", type: "medicationError" },
  { eventId: "e16", type: "surgicalComplication" },
  { eventId: "e17", type: "surgicalComplication" },
];

const lastYearEvents: SafetyEventV13[] = [
  { eventId: "l1", type: "fall" },
  { eventId: "l2", type: "fall" },
  { eventId: "l3", type: "fall" },
  { eventId: "l4", type: "fall" },
  { eventId: "l5", type: "fall" },
  { eventId: "l6", type: "fall" },
  { eventId: "l7", type: "fall" },
  { eventId: "l8", type: "fall" },
  { eventId: "l9", type: "fall" },
  { eventId: "l10", type: "fall" },
  { eventId: "l11", type: "bedsore" },
  { eventId: "l12", type: "bedsore" },
  { eventId: "l13", type: "bedsore" },
  { eventId: "l14", type: "bedsore" },
  { eventId: "l15", type: "bedsore" },
  { eventId: "l16", type: "bedsore" },
  { eventId: "l17", type: "bedsore" },
  { eventId: "l18", type: "bedsore" },
  { eventId: "l19", type: "medicationError" },
  { eventId: "l20", type: "medicationError" },
  { eventId: "l21", type: "medicationError" },
  { eventId: "l22", type: "medicationError" },
  { eventId: "l23", type: "medicationError" },
  { eventId: "l24", type: "surgicalComplication" },
  { eventId: "l25", type: "surgicalComplication" },
  { eventId: "l26", type: "surgicalComplication" },
  { eventId: "l27", type: "surgicalComplication" },
];

describe("countSafetyEventsByTypeV13", () => {
  // 算式：fall=7, bedsore=5, medicationError=3, surgicalComplication=2
  it("分类计数正确", () => {
    const result = countSafetyEventsByTypeV13(currentEvents);
    expect(result.fall).toBe(7);
    expect(result.bedsore).toBe(5);
    expect(result.medicationError).toBe(3);
    expect(result.surgicalComplication).toBe(2);
  });
  it("空态 → 全 0", () => {
    expect(countSafetyEventsByTypeV13([]).fall).toBe(0);
  });
});

describe("computeYoyReductionRateV13", () => {
  // 算式：(10-7)/10×100 = 30
  it("跌倒同比下降 = 30%", () => {
    expect(computeYoyReductionRateV13(7, 10)).toBe(30);
  });
  // 算式：(8-5)/8×100 = 37.5 → round = 38
  it("压疮同比下降 = 38%", () => {
    expect(computeYoyReductionRateV13(5, 8)).toBe(38);
  });
});

describe("buildSafetyOverviewV13", () => {
  it("总览汇总正确", () => {
    const overview = buildSafetyOverviewV13(currentEvents, lastYearEvents);
    expect(overview.current.fall).toBe(7);
    expect(overview.yoyReductionRate.fall).toBe(30);
  });
});

describe("patientSafetyV13Routes 读路由", () => {
  it("GET /api/v1/patient-safety-overview 路由存在且 auth:true", () => {
    const route = patientSafetyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-safety-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
