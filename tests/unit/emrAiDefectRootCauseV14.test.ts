/**
 * 健澜科技 jlmedaios - AI病历缺陷根因分析 V14 单测（M522-C）
 *
 * 测试 buildAiDefectRootCause 构建根因、analyzeRootCause 根因分析、buildAiDefectRootCauseReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDefectRootCause,
  buildAiDefectRootCauseReport,
  analyzeRootCause,
  type AiDefectRootCauseInputV14,
} from "../../src/bff/aggregators/emrAiDefectRootCauseV14Aggregator";
import { emrAiDefectRootCauseV14Routes } from "../../src/bff/routes/emrAiDefectRootCauseV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDefectRootCause 构建根因", () => {
  // 手算：defectId='D010', defectType='时限类' → 正确构建
  it("defectId='D010', defectType='时限类' → 正确构建", () => {
    const rootCause = buildAiDefectRootCause("D010", "时限类");
    expect(rootCause.defectId).toBe("D010");
    expect(rootCause.defectType).toBe("时限类");
  });
});

describe("analyzeRootCause 系统流程缺陷", () => {
  // 手算：input={defectType:'时限类', freq:15, severity:'major'}
  // 手算：freq=15 >= 10 → rootCause='系统流程缺陷'
  // 手算：confidence = Math.min(0.9, 0.5 + 15×0.03) = Math.min(0.9, 0.95) = 0.9
  it("input={defectType:'时限类', freq:15, severity:'major'} → rootCause='系统流程缺陷', confidence=0.9", () => {
    const input: AiDefectRootCauseInputV14 = { defectType: "时限类", freq: 15, severity: "major" };
    const result = analyzeRootCause(input);
    expect(result.rootCause).toBe("系统流程缺陷");
    expect(result.confidence).toBeCloseTo(0.9, 1);
  });
});

describe("analyzeRootCause 操作习惯问题", () => {
  // 手算：input={defectType:'完整性类', freq:7, severity:'minor'}
  // 手算：freq=7 >= 5 且 < 10 → rootCause='操作习惯问题'
  // 手算：confidence = 0.5 + 7×0.03 = 0.5 + 0.21 = 0.71
  it("input={defectType:'完整性类', freq:7, severity:'minor'} → rootCause='操作习惯问题', confidence=0.71", () => {
    const input: AiDefectRootCauseInputV14 = { defectType: "完整性类", freq: 7, severity: "minor" };
    const result = analyzeRootCause(input);
    expect(result.rootCause).toBe("操作习惯问题");
    expect(result.confidence).toBeCloseTo(0.71, 1);
  });
});

describe("analyzeRootCause 偶发因素", () => {
  // 手算：input={defectType:'其他', freq:2, severity:'minor'}
  // 手算：freq=2 < 5 → rootCause='偶发因素'
  // 手算：confidence = 0.5 + 2×0.03 = 0.5 + 0.06 = 0.56
  it("input={defectType:'其他', freq:2, severity:'minor'} → rootCause='偶发因素', confidence=0.56", () => {
    const input: AiDefectRootCauseInputV14 = { defectType: "其他", freq: 2, severity: "minor" };
    const result = analyzeRootCause(input);
    expect(result.rootCause).toBe("偶发因素");
    expect(result.confidence).toBeCloseTo(0.56, 1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-defect-root-cause auth:true", () => {
    const def = (emrAiDefectRootCauseV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-defect-root-cause");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
