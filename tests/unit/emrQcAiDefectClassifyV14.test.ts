/**
 * 健澜科技 jlmedaios - 质控 AI 缺陷自动分类 V14 单测（M499-A）
 *
 * 测试 classifyDefect 分类、buildClassifyReport 构建报告、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildClassifyReport,
  classifyDefect,
  type ClassifyReportV14,
  type ClassifyResultV14,
} from "../../src/bff/aggregators/emrQcAiDefectClassifyV14Aggregator";
import { emrQcAiDefectClassifyV14Routes } from "../../src/bff/routes/emrQcAiDefectClassifyV14";
import type { RouteDef } from "../../src/bff/types";

describe("classifyDefect 缺主诉", () => {
  // 手算：text='缺少主诉内容' → category 包含'主诉'（关键词"缺主诉"匹配）
  it("text='缺少主诉内容' → category 包含'主诉'", () => {
    const result: ClassifyResultV14 = classifyDefect("缺少主诉内容");
    expect(result.category).toContain("主诉");
  });
});

describe("classifyDefect 超时限", () => {
  // 手算：text='病历超时未完成' → category 包含'时效'（关键词"超时"匹配）
  it("text='病历超时未完成' → category 包含'时效'", () => {
    const result: ClassifyResultV14 = classifyDefect("病历超时未完成");
    expect(result.category).toContain("时效");
  });
});

describe("classifyDefect 术语不规范", () => {
  // 手算：text='医学术语使用不规范' → category 包含'术语'（关键词"术语"匹配）
  it("text='医学术语使用不规范' → category 包含'术语'", () => {
    const result: ClassifyResultV14 = classifyDefect("医学术语使用不规范");
    expect(result.category).toContain("术语");
  });
});

describe("buildClassifyReport 高置信度", () => {
  // 手算：{category:'主诉缺失', confidence:0.9} → 正确构建（confidence>=0.8 → 高置信度）
  it("{category:'主诉缺失', confidence:0.9} → 正确构建", () => {
    const report: ClassifyReportV14 = buildClassifyReport({ category: "主诉缺失", confidence: 0.9 });
    expect(report.category).toBe("主诉缺失");
    expect(report.confidence).toBe(0.9);
    expect(report.level).toBe("高置信度");
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-ai-defect-classify auth:true", () => {
    const def = (emrQcAiDefectClassifyV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-ai-defect-classify");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
