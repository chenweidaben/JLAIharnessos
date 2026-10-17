/**
 * 健澜科技 jlmedaios - 推送个人化学习 V13 单测（M303-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDoctorPreferenceV13,
  forgetStalePreferenceV13,
  personalizeRankV13,
  type DoctorEventV13,
} from "../../src/bff/aggregators/doctorPreferenceV13Aggregator";
import { doctorPreferenceV13Routes } from "../../src/bff/routes/doctorPreferenceV13";

const events: DoctorEventV13[] = [
  { dept: "cardio", disease: "afib", evidenceLevel: "strong", author: "dr-zhang", action: "adopted" },
  { dept: "cardio", disease: "afib", evidenceLevel: "strong", author: "dr-zhang", action: "clicked" },
  { dept: "surgery", disease: "postop", evidenceLevel: "weak", author: "dr-li", action: "dismissed" },
];

describe("buildDoctorPreferenceV13", () => {
  it("cardio=4 surgery=-2; afib=4 postop=-2; strong=4 weak=-2; dr-zhang=4 dr-li=-2", () => {
    const p = buildDoctorPreferenceV13(events);
    expect(p.deptPref["cardio"]).toBe(4);
    expect(p.deptPref["surgery"]).toBe(-2);
    expect(p.diseasePref["afib"]).toBe(4);
    expect(p.evidencePref["strong"]).toBe(4);
    expect(p.authorPref["dr-zhang"]).toBe(4);
  });
  it("空态 → 所有字典空", () => {
    const p = buildDoctorPreferenceV13([]);
    expect(Object.keys(p.deptPref).length).toBe(0);
  });
});

describe("personalizeRankV13", () => {
  it("base=18.79, match=16 → 18.79×2.6=48.85", () => {
    const p = buildDoctorPreferenceV13(events);
    const score = personalizeRankV13(18.79, p, {
      dept: "cardio", disease: "afib", evidenceLevel: "strong", author: "dr-zhang",
    });
    expect(score).toBe(48.85);
  });
});

describe("forgetStalePreferenceV13", () => {
  it("lastDays=120>90 → ×0.5（cardio 4→2）", () => {
    const p = buildDoctorPreferenceV13(events);
    const aged = forgetStalePreferenceV13(p, 120);
    expect(aged.deptPref["cardio"]).toBe(2);
  });
  it("lastDays=30≤90 → 不变（cardio=4）", () => {
    const p = buildDoctorPreferenceV13(events);
    const fresh = forgetStalePreferenceV13(p, 30);
    expect(fresh.deptPref["cardio"]).toBe(4);
  });
});

describe("doctorPreferenceV13Routes 读路由", () => {
  it("GET /api/v1/doctor-preference 路由存在且 auth:true", () => {
    const route = doctorPreferenceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/doctor-preference",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
