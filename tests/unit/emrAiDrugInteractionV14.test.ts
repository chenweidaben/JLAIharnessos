/**
 * 健澜科技 jlmedaios - 病历AI用药相互作用审查 V14 单测（M550-C）
 *
 * 测试 buildAiDrugInteraction 构建 AI 用药相互作用审查、checkDrugInteractionByAi AI 用药相互作用审查、buildAiDrugInteractionReport 构建用药相互作用报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDrugInteraction,
  buildAiDrugInteractionReport,
  checkDrugInteractionByAi,
  type AiDrugInteractionInputV14,
} from "../../src/bff/aggregators/emrAiDrugInteractionV14Aggregator";
import { emrAiDrugInteractionV14Routes } from "../../src/bff/routes/emrAiDrugInteractionV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDrugInteraction 构建 AI 用药相互作用审查", () => {
  // 手算：recordId='RECB023', dept='心内科' → 正确构建
  it("recordId='RECB023', dept='心内科' → 正确构建", () => {
    const base = buildAiDrugInteraction("RECB023", "心内科");
    expect(base.recordId).toBe("RECB023");
    expect(base.dept).toBe("心内科");
  });
});

describe("checkDrugInteractionByAi 严重", () => {
  // 手算：{drugA='华法林', drugB='阿司匹林'}
  // 手算：drugA.includes('华法林')=true 且 drugB.includes('阿司匹林')=true → hasInteraction=true
  // 手算：hasInteraction=true → level='严重', advice='避免联用，监测凝血功能'
  it("{drugA='华法林', drugB='阿司匹林'} → hasInteraction=true, level='严重', advice='避免联用，监测凝血功能'", () => {
    const input: AiDrugInteractionInputV14 = { drugA: "华法林", drugB: "阿司匹林" };
    const result = checkDrugInteractionByAi(input);
    expect(result.hasInteraction).toBe(true);
    expect(result.level).toBe("严重");
    expect(result.advice).toBe("避免联用，监测凝血功能");
  });
});

describe("checkDrugInteractionByAi 无", () => {
  // 手算：{drugA='二甲双胍', drugB='阿托伐他汀'}
  // 手算：不涉及华法林+阿司匹林 → hasInteraction=false
  // 手算：hasInteraction=false → level='无', advice='可联用'
  it("{drugA='二甲双胍', drugB='阿托伐他汀'} → hasInteraction=false, level='无', advice='可联用'", () => {
    const input: AiDrugInteractionInputV14 = { drugA: "二甲双胍", drugB: "阿托伐他汀" };
    const result = checkDrugInteractionByAi(input);
    expect(result.hasInteraction).toBe(false);
    expect(result.level).toBe("无");
    expect(result.advice).toBe("可联用");
  });
});

describe("buildAiDrugInteractionReport 构建用药相互作用报告", () => {
  // 手算：{hasInteraction=true, level='严重', advice='...'}
  // 手算：透传 hasInteraction + level + advice
  it("{hasInteraction=true, level='严重', advice='...'} → 正确返回（透传）", () => {
    const report = buildAiDrugInteractionReport({ hasInteraction: true, level: "严重", advice: "避免联用，监测凝血功能" });
    expect(report.hasInteraction).toBe(true);
    expect(report.level).toBe("严重");
    expect(report.advice).toBe("避免联用，监测凝血功能");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-drug-interaction auth:true", () => {
    const def = (emrAiDrugInteractionV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-drug-interaction");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
