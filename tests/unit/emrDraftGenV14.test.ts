/**
 * 健澜科技 jlmedaios - 病历 AI 草稿生成 V14 单测（M462-A）
 *
 * 测试 buildAdmissionDraft 含主诉关键词、含诊断关键词、buildProgressNoteDraft 含日期、含诊疗调整关键词、POST 路由 auth:true。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAdmissionDraft,
  buildProgressNoteDraft,
  type AdmissionDraftInputV14,
  type ProgressNoteDraftInputV14,
} from "../../src/bff/aggregators/emrDraftGenV14Aggregator";
import { emrDraftGenV14Routes } from "../../src/bff/routes/emrDraftGenV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAdmissionDraft 含主诉关键词", () => {
  it("输出含'咳嗽3天'", () => {
    const input: AdmissionDraftInputV14 = {
      chiefComplaint: "咳嗽3天",
      presentIllness: "患者3天前无明显诱因出现咳嗽",
      physicalExam: "双肺呼吸音粗",
      diagnosis: "社区获得性肺炎",
    };
    const draft = buildAdmissionDraft(input);
    expect(draft).toContain("咳嗽3天");
  });
});

describe("buildAdmissionDraft 含诊断关键词", () => {
  it("输出含'社区获得性肺炎'", () => {
    const input: AdmissionDraftInputV14 = {
      chiefComplaint: "咳嗽3天",
      presentIllness: "患者3天前无明显诱因出现咳嗽",
      physicalExam: "双肺呼吸音粗",
      diagnosis: "社区获得性肺炎",
    };
    const draft = buildAdmissionDraft(input);
    expect(draft).toContain("社区获得性肺炎");
  });
});

describe("buildProgressNoteDraft 含日期", () => {
  it("输出含'2026-10-18'", () => {
    const input: ProgressNoteDraftInputV14 = {
      date: "2026-10-18",
      bodyCondition: "患者咳嗽症状缓解",
      treatmentAdjustment: "继续抗感染治疗",
      plan: "明日复查血常规",
    };
    const draft = buildProgressNoteDraft(input);
    expect(draft).toContain("2026-10-18");
  });
});

describe("buildProgressNoteDraft 含诊疗调整关键词", () => {
  it("输出含'继续抗感染治疗'", () => {
    const input: ProgressNoteDraftInputV14 = {
      date: "2026-10-18",
      bodyCondition: "患者咳嗽症状缓解",
      treatmentAdjustment: "继续抗感染治疗",
      plan: "明日复查血常规",
    };
    const draft = buildProgressNoteDraft(input);
    expect(draft).toContain("继续抗感染治疗");
  });
});

describe("POST 路由 auth", () => {
  it("POST /api/v1/emr-draft-gen auth:true", () => {
    const def = (emrDraftGenV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-draft-gen");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
