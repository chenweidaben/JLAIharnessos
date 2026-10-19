/**
 * 健澜科技 jlmedaios - 病历AI病历书写建议 V14 单测（M553-A）
 *
 * 测试 buildAiWritingSuggest 构建 AI 病历书写建议、suggestWritingByAi AI 病历书写建议、buildAiWritingSuggestReport 构建书写建议报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiWritingSuggest,
  buildAiWritingSuggestReport,
  suggestWritingByAi,
  type AiWritingSuggestInputV14,
} from "../../src/bff/aggregators/emrAiWritingSuggestV14Aggregator";
import { emrAiWritingSuggestV14Routes } from "../../src/bff/routes/emrAiWritingSuggestV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiWritingSuggest 构建 AI 病历书写建议", () => {
  // 手算：recordId='RECB033', dept='内科' → 正确构建
  it("recordId='RECB033', dept='内科' → 正确构建", () => {
    const base = buildAiWritingSuggest("RECB033", "内科");
    expect(base.recordId).toBe("RECB033");
    expect(base.dept).toBe("内科");
  });
});

describe("suggestWritingByAi 高优先级", () => {
  // 手算：{recordType='入院记录', hasChiefComplaint=false}
  // 手算：hasChiefComplaint=false → suggestion='建议补充主诉内容'；priority='高'
  it("{recordType='入院记录', hasChiefComplaint=false} → suggestion='建议补充主诉内容', priority='高'", () => {
    const input: AiWritingSuggestInputV14 = { recordType: "入院记录", hasChiefComplaint: false };
    const result = suggestWritingByAi(input);
    expect(result.suggestion).toBe("建议补充主诉内容");
    expect(result.priority).toBe("高");
  });
});

describe("suggestWritingByAi 中优先级", () => {
  // 手算：{recordType='病程记录', hasChiefComplaint=true}
  // 手算：hasChiefComplaint=true → suggestion='建议完善现病史描述'；priority='中'
  it("{recordType='病程记录', hasChiefComplaint=true} → suggestion='建议完善现病史描述', priority='中'", () => {
    const input: AiWritingSuggestInputV14 = { recordType: "病程记录", hasChiefComplaint: true };
    const result = suggestWritingByAi(input);
    expect(result.suggestion).toBe("建议完善现病史描述");
    expect(result.priority).toBe("中");
  });
});

describe("buildAiWritingSuggestReport 构建书写建议报告", () => {
  // 手算：{suggestion='建议补充主诉内容', priority='高'}
  // 手算：透传 suggestion + priority
  it("{suggestion='建议补充主诉内容', priority='高'} → 正确返回（透传）", () => {
    const report = buildAiWritingSuggestReport({ suggestion: "建议补充主诉内容", priority: "高" });
    expect(report.suggestion).toBe("建议补充主诉内容");
    expect(report.priority).toBe("高");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-writing-suggest auth:true", () => {
    const def = (emrAiWritingSuggestV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-writing-suggest");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
