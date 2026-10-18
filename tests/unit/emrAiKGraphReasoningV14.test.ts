/**
 * 健澜科技 jlmedaios - AI病历质控知识图谱推理 V14 单测（M522-D，M522 收官）
 *
 * 测试 buildAiKGraphReasoning 构建推理、reasonKGraph 知识图谱推理、buildAiKGraphReasoningReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiKGraphReasoning,
  buildAiKGraphReasoningReport,
  reasonKGraph,
  type AiKGraphReasoningInputV14,
} from "../../src/bff/aggregators/emrAiKGraphReasoningV14Aggregator";
import { emrAiKGraphReasoningV14Routes } from "../../src/bff/routes/emrAiKGraphReasoningV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiKGraphReasoning 构建推理", () => {
  // 手算：domain='病历质控', nodeCount=150 → 正确构建
  it("domain='病历质控', nodeCount=150 → 正确构建", () => {
    const reasoning = buildAiKGraphReasoning("病历质控", 150);
    expect(reasoning.domain).toBe("病历质控");
    expect(reasoning.nodeCount).toBe(150);
  });
});

describe("reasonKGraph 多匹配", () => {
  // 手算：input={query:'病历', nodes=['病历书写规范','病历首页','手术记录','病历质控指标']}
  // 手算：'病历书写规范'含'病历'✓, '病历首页'含'病历'✓, '手术记录'不含'病历'✗, '病历质控指标'含'病历'✓
  // 手算：matchedNodes = ['病历书写规范','病历首页','病历质控指标']（3 项）
  // 手算：edgeCount = 3 × 2 = 6
  it("input={query:'病历', nodes=['病历书写规范','病历首页','手术记录','病历质控指标']} → matchedNodes 含 3 项, edgeCount=6", () => {
    const input: AiKGraphReasoningInputV14 = {
      query: "病历",
      nodes: ["病历书写规范", "病历首页", "手术记录", "病历质控指标"],
    };
    const result = reasonKGraph(input);
    expect(result.matchedNodes).toContain("病历书写规范");
    expect(result.matchedNodes).toContain("病历首页");
    expect(result.matchedNodes).toContain("病历质控指标");
    expect(result.matchedNodes.length).toBe(3);
    expect(result.edgeCount).toBe(6);
  });
});

describe("reasonKGraph 单匹配", () => {
  // 手算：input={query:'手术', nodes=['病历书写规范','病历首页','手术记录','病历质控指标']}
  // 手算：仅'手术记录'含'手术'✓ → matchedNodes = ['手术记录']（1 项）
  // 手算：edgeCount = 1 × 2 = 2
  it("input={query:'手术', nodes=['病历书写规范','病历首页','手术记录','病历质控指标']} → matchedNodes=['手术记录'], edgeCount=2", () => {
    const input: AiKGraphReasoningInputV14 = {
      query: "手术",
      nodes: ["病历书写规范", "病历首页", "手术记录", "病历质控指标"],
    };
    const result = reasonKGraph(input);
    expect(result.matchedNodes).toEqual(["手术记录"]);
    expect(result.edgeCount).toBe(2);
  });
});

describe("buildAiKGraphReasoningReport 构建报告", () => {
  // 手算：matchedNodes=['病历书写规范','病历首页','病历质控指标'] → matchedCount=3
  // 手算：edgeCount=6 透传
  it("{matchedNodes:['病历书写规范','病历首页','病历质控指标'], edgeCount:6} → matchedCount=3, edgeCount=6", () => {
    const report = buildAiKGraphReasoningReport({
      matchedNodes: ["病历书写规范", "病历首页", "病历质控指标"],
      edgeCount: 6,
    });
    expect(report.matchedCount).toBe(3);
    expect(report.edgeCount).toBe(6);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-kgraph-reasoning auth:true", () => {
    const def = (emrAiKGraphReasoningV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-kgraph-reasoning");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
