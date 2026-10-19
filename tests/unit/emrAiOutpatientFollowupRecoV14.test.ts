/**
 * 健澜科技 jlmedaios - 病历AI门诊复诊提醒推荐 V14 单测（M560-D，M560 收官）
 *
 * 测试 buildAiOutpatientFollowupReco 构建 AI 门诊复诊提醒推荐、recommendFollowupByAi AI 门诊复诊提醒推荐、buildAiOutpatientFollowupRecoReport 构建门诊复诊提醒推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiOutpatientFollowupReco,
  buildAiOutpatientFollowupRecoReport,
  recommendFollowupByAi,
  type AiOutpatientFollowupRecoInputV14,
} from "../../src/bff/aggregators/emrAiOutpatientFollowupRecoV14Aggregator";
import { emrAiOutpatientFollowupRecoV14Routes } from "../../src/bff/routes/emrAiOutpatientFollowupRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiOutpatientFollowupReco 构建 AI 门诊复诊提醒推荐", () => {
  // 手算：recordId='RECB065', dept='门诊部' → 正确构建
  it("recordId='RECB065', dept='门诊部' → 正确构建", () => {
    const base = buildAiOutpatientFollowupReco("RECB065", "门诊部");
    expect(base.recordId).toBe("RECB065");
    expect(base.dept).toBe("门诊部");
  });
});

describe("recommendFollowupByAi 危重心梗", () => {
  // 手算：{diagnosis='急性心梗', severity='危重'}
  // 手算：followupDays = '急性心梗'.includes('心梗')=true → 7
  // 手算：reminder = severity==='危重' → '建议3天内复诊，如有不适随时就诊'
  it("{diagnosis='急性心梗', severity='危重'} → followupDays=7, reminder='建议3天内复诊，如有不适随时就诊'", () => {
    const input: AiOutpatientFollowupRecoInputV14 = { diagnosis: "急性心梗", severity: "危重" };
    const result = recommendFollowupByAi(input);
    expect(result.followupDays).toBe(7);
    expect(result.reminder).toBe("建议3天内复诊，如有不适随时就诊");
  });
});

describe("recommendFollowupByAi 普通", () => {
  // 手算：{diagnosis='上呼吸道感染', severity='普通'}
  // 手算：followupDays = '上呼吸道感染'.includes('心梗')=false, includes('肺炎')=false → 30
  // 手算：reminder = severity==='危重'? ... : '建议按预约时间复诊' = '建议按预约时间复诊'
  it("{diagnosis='上呼吸道感染', severity='普通'} → followupDays=30, reminder='建议按预约时间复诊'", () => {
    const input: AiOutpatientFollowupRecoInputV14 = { diagnosis: "上呼吸道感染", severity: "普通" };
    const result = recommendFollowupByAi(input);
    expect(result.followupDays).toBe(30);
    expect(result.reminder).toBe("建议按预约时间复诊");
  });
});

describe("buildAiOutpatientFollowupRecoReport 构建门诊复诊提醒推荐报告", () => {
  // 手算：{followupDays=7, reminder='建议3天内复诊，如有不适随时就诊'}
  // 手算：透传 followupDays + reminder
  it("{followupDays=7, reminder='建议3天内复诊，如有不适随时就诊'} → 正确返回（透传）", () => {
    const report = buildAiOutpatientFollowupRecoReport({ followupDays: 7, reminder: "建议3天内复诊，如有不适随时就诊" });
    expect(report.followupDays).toBe(7);
    expect(report.reminder).toBe("建议3天内复诊，如有不适随时就诊");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-outpatient-followup-reco auth:true", () => {
    const def = (emrAiOutpatientFollowupRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-outpatient-followup-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
