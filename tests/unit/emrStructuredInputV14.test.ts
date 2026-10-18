/**
 * 健澜科技 jlmedaios - 病历结构化录入辅助 V14 单测（M539-B）
 *
 * 测试 buildStructuredInput 构建结构化录入、assistStructuredInput 录入辅助、buildStructuredInputReport 构建录入报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildStructuredInput,
  buildStructuredInputReport,
  assistStructuredInput,
  type StructuredInputInputV14,
} from "../../src/bff/aggregators/emrStructuredInputV14Aggregator";
import { emrStructuredInputV14Routes } from "../../src/bff/routes/emrStructuredInputV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildStructuredInput 构建结构化录入", () => {
  // 手算：recordId='REC601', fieldName='主诉' → 正确构建
  it("recordId='REC601', fieldName='主诉' → 正确构建", () => {
    const base = buildStructuredInput("REC601", "主诉");
    expect(base.recordId).toBe("REC601");
    expect(base.fieldName).toBe("主诉");
  });
});

describe("assistStructuredInput 有文本", () => {
  // 手算：{rawText='胸闷3天', fieldType='主诉'}
  // 手算：filled = rawText.length > 0 = 4 > 0 → true
  // 手算：suggestedValue = rawText.length > 0 ? rawText = '胸闷3天'
  it("{rawText='胸闷3天', fieldType='主诉'} → filled=true, suggestedValue='胸闷3天'", () => {
    const input: StructuredInputInputV14 = { rawText: "胸闷3天", fieldType: "主诉" };
    const result = assistStructuredInput(input);
    expect(result.filled).toBe(true);
    expect(result.suggestedValue).toBe("胸闷3天");
  });
});

describe("assistStructuredInput 空文本", () => {
  // 手算：{rawText='', fieldType='主诉'}
  // 手算：filled = rawText.length > 0 = 0 > 0 → false
  // 手算：suggestedValue = '请输入' + fieldType = '请输入' + '主诉' = '请输入主诉'
  it("{rawText='', fieldType='主诉'} → filled=false, suggestedValue='请输入主诉'", () => {
    const input: StructuredInputInputV14 = { rawText: "", fieldType: "主诉" };
    const result = assistStructuredInput(input);
    expect(result.filled).toBe(false);
    expect(result.suggestedValue).toBe("请输入主诉");
  });
});

describe("buildStructuredInputReport 构建录入报告", () => {
  // 手算：{filled=true, suggestedValue='胸闷3天'}
  // 手算：透传 filled + suggestedValue
  it("{filled=true, suggestedValue='胸闷3天'} → 正确返回（透传）", () => {
    const report = buildStructuredInputReport({ filled: true, suggestedValue: "胸闷3天" });
    expect(report.filled).toBe(true);
    expect(report.suggestedValue).toBe("胸闷3天");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-structured-input auth:true", () => {
    const def = (emrStructuredInputV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-structured-input");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
