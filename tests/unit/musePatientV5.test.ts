/**
 * 健澜科技 jlmedaios - 患者 MUSE 助手 V5 单测（M284-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  answerPatientV5,
  buildMusePatientV5Report,
  buildPatientMUSEV5,
  nudgePatientV5,
  type PatientContext,
} from "../../src/bff/aggregators/musePatientV5Aggregator";
import { musePatientV5Routes } from "../../src/bff/routes/musePatientV5";

const ctx: PatientContext = {
  patientRef: "p-1",
  channel: "wechat",
  upcomingVisits: 2,
  pendingReports: 1,
  chronicDiseases: ["高血压"],
};

describe("buildPatientMUSEV5", () => {
  it("有1份待报告→下一步是查看报告", () => {
    const r = buildPatientMUSEV5(ctx);
    expect(r.nextAction).toContain("报告");
  });
});

describe("answerPatientV5", () => {
  it("问高血压→命中知识库", () => {
    const r = answerPatientV5("我有高血压要注意什么", { "高血压": "低盐饮食" });
    expect(r.found).toBe(true);
  });
  it("问未知疾病→转医生", () => {
    const r = answerPatientV5("我有罕见病", { "高血压": "低盐" });
    expect(r.found).toBe(false);
  });
});

describe("nudgePatientV5", () => {
  it("有报告+预约+慢病→3条提醒", () => {
    const nudges = nudgePatientV5(ctx, "低盐");
    expect(nudges.length).toBe(3);
  });
});

describe("buildMusePatientV5Report", () => {
  it("2患者共3份待报告→平均1.5", () => {
    const patients: PatientContext[] = [
      { ...ctx },
      { ...ctx, pendingReports: 2 },
    ];
    expect(buildMusePatientV5Report(patients).avgPendingReports).toBe(1.5);
  });
});

describe("musePatientV5Routes 写权限", () => {
  it("POST /api/v1/muse-patient/ask 路由存在且 auth:true", () => {
    const post = musePatientV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/muse-patient/ask");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
