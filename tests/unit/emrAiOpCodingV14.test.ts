/**
 * 健澜科技 jlmedaios - 病历AI手术编码建议 V14 单测（M544-B）
 *
 * 测试 buildAiOpCoding 构建 AI 手术编码、suggestOpCodingByAi AI 手术编码建议、buildAiOpCodingReport 构建手术编码报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiOpCoding,
  buildAiOpCodingReport,
  suggestOpCodingByAi,
  type AiOpCodingInputV14,
} from "../../src/bff/aggregators/emrAiOpCodingV14Aggregator";
import { emrAiOpCodingV14Routes } from "../../src/bff/routes/emrAiOpCodingV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiOpCoding 构建 AI 手术编码", () => {
  // 手算：recordId='RECA002', dept='心外科' → 正确构建
  it("recordId='RECA002', dept='心外科' → 正确构建", () => {
    const base = buildAiOpCoding("RECA002", "心外科");
    expect(base.recordId).toBe("RECA002");
    expect(base.dept).toBe("心外科");
  });
});

describe("suggestOpCodingByAi 搭桥", () => {
  // 手算：{opName='冠状动脉搭桥术'}
  // 手算：opName.includes('搭桥') → true → icd9Code='36.100'
  // 手算：confidence = 0.90
  it("{opName='冠状动脉搭桥术'} → icd9Code='36.100', confidence=0.90", () => {
    const input: AiOpCodingInputV14 = { opName: "冠状动脉搭桥术" };
    const result = suggestOpCodingByAi(input);
    expect(result.icd9Code).toBe("36.100");
    expect(result.confidence).toBe(0.90);
  });
});

describe("suggestOpCodingByAi 支架", () => {
  // 手算：{opName='冠脉支架植入术'}
  // 手算：opName.includes('搭桥') → false；opName.includes('支架') → true → icd9Code='36.060'
  // 手算：confidence = 0.90
  it("{opName='冠脉支架植入术'} → icd9Code='36.060', confidence=0.90", () => {
    const input: AiOpCodingInputV14 = { opName: "冠脉支架植入术" };
    const result = suggestOpCodingByAi(input);
    expect(result.icd9Code).toBe("36.060");
    expect(result.confidence).toBe(0.90);
  });
});

describe("buildAiOpCodingReport 构建手术编码报告", () => {
  // 手算：{icd9Code='36.100', confidence=0.90}
  // 手算：透传 icd9Code + confidence
  it("{icd9Code='36.100', confidence=0.90} → 正确返回（透传）", () => {
    const report = buildAiOpCodingReport({ icd9Code: "36.100", confidence: 0.90 });
    expect(report.icd9Code).toBe("36.100");
    expect(report.confidence).toBe(0.90);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-op-coding auth:true", () => {
    const def = (emrAiOpCodingV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-op-coding");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
