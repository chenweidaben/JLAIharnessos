/**
 * 健澜科技 jlmedaios - 病历AI复诊提醒 V14 单测（M547-D，M547 收官）
 *
 * 测试 buildAiFollowupRemind 构建 AI 复诊提醒、remindFollowupByAi AI 复诊提醒、buildAiFollowupRemindReport 构建复诊提醒报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiFollowupRemind,
  buildAiFollowupRemindReport,
  remindFollowupByAi,
  type AiFollowupRemindInputV14,
} from "../../src/bff/aggregators/emrAiFollowupRemindV14Aggregator";
import { emrAiFollowupRemindV14Routes } from "../../src/bff/routes/emrAiFollowupRemindV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiFollowupRemind 构建 AI 复诊提醒", () => {
  // 手算：recordId='RECB012', dept='心内科' → 正确构建
  it("recordId='RECB012', dept='心内科' → 正确构建", () => {
    const base = buildAiFollowupRemind("RECB012", "心内科");
    expect(base.recordId).toBe("RECB012");
    expect(base.dept).toBe("心内科");
  });
});

describe("remindFollowupByAi 心梗", () => {
  // 手算：{diagnosis='急性心梗', daysSinceDischarge=3}
  // 手算：diagnosis.includes('心梗') → true → action='建议立即复诊'
  // 手算：remindDate = `出院后第${daysSinceDischarge + 7}天` = `出院后第${3+7}天` = '出院后第10天'
  it("{diagnosis='急性心梗', daysSinceDischarge=3} → action='建议立即复诊', remindDate='出院后第10天'", () => {
    const input: AiFollowupRemindInputV14 = { diagnosis: "急性心梗", daysSinceDischarge: 3 };
    const result = remindFollowupByAi(input);
    expect(result.action).toBe("建议立即复诊");
    expect(result.remindDate).toBe("出院后第10天");
  });
});

describe("remindFollowupByAi 一般", () => {
  // 手算：{diagnosis='上感', daysSinceDischarge=5}
  // 手算：diagnosis.includes('心梗') → false → action='建议按计划复诊'
  // 手算：remindDate = `出院后第${daysSinceDischarge + 7}天` = `出院后第${5+7}天` = '出院后第12天'
  it("{diagnosis='上感', daysSinceDischarge=5} → action='建议按计划复诊', remindDate='出院后第12天'", () => {
    const input: AiFollowupRemindInputV14 = { diagnosis: "上感", daysSinceDischarge: 5 };
    const result = remindFollowupByAi(input);
    expect(result.action).toBe("建议按计划复诊");
    expect(result.remindDate).toBe("出院后第12天");
  });
});

describe("buildAiFollowupRemindReport 构建复诊提醒报告", () => {
  // 手算：{remindDate='出院后第10天', action='建议立即复诊'}
  // 手算：透传 remindDate + action
  it("{remindDate='出院后第10天', action='建议立即复诊'} → 正确返回（透传）", () => {
    const report = buildAiFollowupRemindReport({ remindDate: "出院后第10天", action: "建议立即复诊" });
    expect(report.remindDate).toBe("出院后第10天");
    expect(report.action).toBe("建议立即复诊");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-followup-remind auth:true", () => {
    const def = (emrAiFollowupRemindV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-followup-remind");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
