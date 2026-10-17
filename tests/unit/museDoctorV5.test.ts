/**
 * 健澜科技 jlmedaios - 医生 MUSE 工作台 V5 单测（M283-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDoctorDailyV5,
  buildMuseDoctorV5Report,
  prioritizePatientsV5,
  suggestExperienceV5,
  type WardPatient,
} from "../../src/bff/aggregators/museDoctorV5Aggregator";
import { museDoctorV5Routes } from "../../src/bff/routes/museDoctorV5";

const patients: WardPatient[] = [
  { patientId: "p1", name: "张三", severity: 9, lastRoundHoursAgo: 6, pendingTests: 2 },
  { patientId: "p2", name: "李四", severity: 5, lastRoundHoursAgo: 2, pendingTests: 0 },
  { patientId: "p3", name: "王五", severity: 8, lastRoundHoursAgo: 4, pendingTests: 1 },
];

describe("prioritizePatientsV5", () => {
  it("severity×10+距上次久者优先→p1排第一", () => {
    // p1: 9*10+6=96; p3: 8*10+4=84; p2: 5*10+2=52
    const sorted = prioritizePatientsV5(patients);
    expect(sorted[0].patientId).toBe("p1");
    expect(sorted[2].patientId).toBe("p2");
  });
});

describe("buildDoctorDailyV5", () => {
  it("3人重症2个（severity>=8）", () => {
    const summary = buildDoctorDailyV5("doc-1", patients, []);
    expect(summary.pendingCount).toBe(3);
    expect(summary.highSeverityCount).toBe(2);
  });
});

describe("suggestExperienceV5", () => {
  it("心梗→返回双抗经验", () => {
    const tips = suggestExperienceV5({ diagnosis: "急性心梗", department: "心内" });
    expect(tips.length).toBeGreaterThan(0);
    expect(tips[0]).toContain("心梗");
  });
  it("未知诊断→空提醒", () => {
    expect(suggestExperienceV5({ diagnosis: "感冒", department: "呼吸" }).length).toBe(0);
  });
});

describe("buildMuseDoctorV5Report", () => {
  it("2医生平均重症数", () => {
    const r = buildMuseDoctorV5Report([{ highSeverityCount: 2 }, { highSeverityCount: 4 }]);
    expect(r.avgHighSeverityPerDoctor).toBe(3);
  });
});

describe("museDoctorV5Routes 写权限", () => {
  it("POST /api/v1/muse-doctor/read 路由存在且 auth:true", () => {
    const post = museDoctorV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/muse-doctor/read");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
