/**
 * 健澜科技 jlmedaios - 病历AI临床知识图谱 V14 单测（M550-A）
 *
 * 测试 buildAiClinicalGraph 构建 AI 临床知识图谱、queryClinicalGraphByAi AI 临床知识图谱查询、buildAiClinicalGraphReport 构建知识图谱报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiClinicalGraph,
  buildAiClinicalGraphReport,
  queryClinicalGraphByAi,
  type AiClinicalGraphInputV14,
} from "../../src/bff/aggregators/emrAiClinicalGraphV14Aggregator";
import { emrAiClinicalGraphV14Routes } from "../../src/bff/routes/emrAiClinicalGraphV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiClinicalGraph 构建 AI 临床知识图谱", () => {
  // 手算：recordId='RECB021', dept='心内科' → 正确构建
  it("recordId='RECB021', dept='心内科' → 正确构建", () => {
    const base = buildAiClinicalGraph("RECB021", "心内科");
    expect(base.recordId).toBe("RECB021");
    expect(base.dept).toBe("心内科");
  });
});

describe("queryClinicalGraphByAi 心梗", () => {
  // 手算：{node='急性心梗'}
  // 手算：node.includes('心梗')=true → relatedNodes=['心绞痛','心律失常','心力衰竭']
  // 手算：edgeCount = relatedNodes.length = 3
  it("{node='急性心梗'} → relatedNodes=['心绞痛','心律失常','心力衰竭'], edgeCount=3", () => {
    const input: AiClinicalGraphInputV14 = { node: "急性心梗" };
    const result = queryClinicalGraphByAi(input);
    expect(result.relatedNodes).toEqual(["心绞痛", "心律失常", "心力衰竭"]);
    expect(result.edgeCount).toBe(3);
  });
});

describe("queryClinicalGraphByAi 一般", () => {
  // 手算：{node='发热'}
  // 手算：node.includes('心梗')=false → relatedNodes=['症状待查']
  // 手算：edgeCount = relatedNodes.length = 1
  it("{node='发热'} → relatedNodes=['症状待查'], edgeCount=1", () => {
    const input: AiClinicalGraphInputV14 = { node: "发热" };
    const result = queryClinicalGraphByAi(input);
    expect(result.relatedNodes).toEqual(["症状待查"]);
    expect(result.edgeCount).toBe(1);
  });
});

describe("buildAiClinicalGraphReport 构建知识图谱报告", () => {
  // 手算：{relatedNodes=[3个], edgeCount=3}
  // 手算：透传 relatedNodes + edgeCount
  it("{relatedNodes=[3个], edgeCount=3} → 正确返回（透传）", () => {
    const report = buildAiClinicalGraphReport({ relatedNodes: ["心绞痛", "心律失常", "心力衰竭"], edgeCount: 3 });
    expect(report.relatedNodes).toEqual(["心绞痛", "心律失常", "心力衰竭"]);
    expect(report.edgeCount).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-clinical-graph auth:true", () => {
    const def = (emrAiClinicalGraphV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-clinical-graph");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
