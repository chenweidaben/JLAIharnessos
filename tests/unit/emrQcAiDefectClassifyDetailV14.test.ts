/**
 * 健澜科技 jlmedaios - 质控 AI 缺陷自动分类明细 V14 单测（M508-A，-detail 避让）
 *
 * 测试 classifyDefect 分类、buildClassifyReport 报告、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildClassifyReport,
  classifyDefect,
  type AiDefectClassifyResultDetailV14,
} from "../../src/bff/aggregators/emrQcAiDefectClassifyDetailV14Aggregator";
import { emrQcAiDefectClassifyDetailV14Routes } from "../../src/bff/routes/emrQcAiDefectClassifyDetailV14";
import type { RouteDef } from "../../src/bff/types";

describe("classifyDefect 未签名", () => {
  // 手算：text='未签名' → 关键词'签名'匹配 → category='签名缺陷', confidence=95
  it("text='未签名' → category='签名缺陷', confidence=95", () => {
    const result = classifyDefect("未签名");
    expect(result.category).toBe("签名缺陷");
    expect(result.confidence).toBe(95);
  });
});

describe("classifyDefect 用药剂量错误", () => {
  // 手算：text='用药剂量错误' → 关键词'用药'匹配 → category='用药缺陷', confidence=90
  it("text='用药剂量错误' → category='用药缺陷', confidence=90", () => {
    const result = classifyDefect("用药剂量错误");
    expect(result.category).toBe("用药缺陷");
    expect(result.confidence).toBe(90);
  });
});

describe("buildClassifyReport 三条结果", () => {
  // 手算：3 条结果（95/90/85）
  // total = 3
  // avgConfidence = (95+90+85)/3 = 270/3 = 90
  // categories = 去重后包含所有类别
  it("3 条结果（95/90/85）→ total=3, avgConfidence=90, categories 包含所有类别", () => {
    const results: AiDefectClassifyResultDetailV14[] = [
      { category: "签名缺陷", confidence: 95 },
      { category: "用药缺陷", confidence: 90 },
      { category: "内容缺失", confidence: 85 },
    ];
    const report = buildClassifyReport(results);
    expect(report.total).toBe(3);
    expect(report.avgConfidence).toBe(90);
    expect(report.categories).toContain("签名缺陷");
    expect(report.categories).toContain("用药缺陷");
    expect(report.categories).toContain("内容缺失");
  });
});

describe("classifyDefect 无主诉", () => {
  // 手算：text='无主诉' → 关键词'主诉'匹配 → category='内容缺失', confidence=88
  it("text='无主诉' → category='内容缺失', confidence=88", () => {
    const result = classifyDefect("无主诉");
    expect(result.category).toBe("内容缺失");
    expect(result.confidence).toBe(88);
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-ai-defect-classify-detail auth:true", () => {
    const def = (emrQcAiDefectClassifyDetailV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-ai-defect-classify-detail");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
