/**
 * 健澜科技 jlmedaios - 病历AI药品相互作用明细审查 V14 单测（M565-C，-detail 后缀避让 emrAiDrugInteractionV14）
 *
 * 测试 buildAiDrugInteractionDetail 构建 AI 药品相互作用明细审查、detailDrugInteractionByAi AI 药品相互作用明细审查、buildAiDrugInteractionDetailReport 构建药品相互作用明细审查报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDrugInteractionDetail,
  buildAiDrugInteractionDetailReport,
  detailDrugInteractionByAi,
  type AiDrugInteractionDetailInputV14,
} from "../../src/bff/aggregators/emrAiDrugInteractionDetailV14Aggregator";
import { emrAiDrugInteractionDetailV14Routes } from "../../src/bff/routes/emrAiDrugInteractionDetailV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDrugInteractionDetail 构建 AI 药品相互作用明细审查", () => {
  // 手算：recordId='RECB084', dept='药剂科' → 正确构建
  it("recordId='RECB084', dept='药剂科' → 正确构建", () => {
    const base = buildAiDrugInteractionDetail("RECB084", "药剂科");
    expect(base.recordId).toBe("RECB084");
    expect(base.dept).toBe("药剂科");
  });
});

describe("detailDrugInteractionByAi 严重", () => {
  // 手算：{drugA='华法林钠片', drugB='阿司匹林肠溶片'}
  // 手算：level = drugA.includes('华法林')=true && drugB.includes('阿司匹林')=true → '严重'
  // 手算：suggestion = level='严重' → '禁止联用，需调整方案'
  it("{drugA='华法林钠片', drugB='阿司匹林肠溶片'} → level='严重', suggestion='禁止联用，需调整方案'", () => {
    const input: AiDrugInteractionDetailInputV14 = { drugA: "华法林钠片", drugB: "阿司匹林肠溶片" };
    const result = detailDrugInteractionByAi(input);
    expect(result.level).toBe("严重");
    expect(result.suggestion).toBe("禁止联用，需调整方案");
  });
});

describe("detailDrugInteractionByAi 轻微", () => {
  // 手算：{drugA='维生素C片', drugB='钙片'}
  // 手算：level = (华法林&&阿司匹林)=false, (奥美拉唑&&地高辛)=false → '轻微'
  // 手算：suggestion = level='轻微' → '可联用，注意观察'
  it("{drugA='维生素C片', drugB='钙片'} → level='轻微', suggestion='可联用，注意观察'", () => {
    const input: AiDrugInteractionDetailInputV14 = { drugA: "维生素C片", drugB: "钙片" };
    const result = detailDrugInteractionByAi(input);
    expect(result.level).toBe("轻微");
    expect(result.suggestion).toBe("可联用，注意观察");
  });
});

describe("buildAiDrugInteractionDetailReport 构建药品相互作用明细审查报告", () => {
  // 手算：{level='严重', suggestion='禁止联用，需调整方案'}
  // 手算：透传 level + suggestion
  it("{level='严重', suggestion='禁止联用，需调整方案'} → 正确返回（透传）", () => {
    const report = buildAiDrugInteractionDetailReport({ level: "严重", suggestion: "禁止联用，需调整方案" });
    expect(report.level).toBe("严重");
    expect(report.suggestion).toBe("禁止联用，需调整方案");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-drug-interaction-detail auth:true", () => {
    const def = (emrAiDrugInteractionDetailV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-drug-interaction-detail");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
