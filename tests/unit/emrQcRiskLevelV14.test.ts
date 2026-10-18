/**
 * 健澜科技 jlmedaios - 质控风险等级评估 V14 单测（M495-C）
 *
 * 测试 assessRiskLevel 评估、buildRiskLevelReport 构建、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessRiskLevel,
  buildRiskLevelReport,
  type RiskLevelV14,
} from "../../src/bff/aggregators/emrQcRiskLevelV14Aggregator";
import { emrQcRiskLevelV14Routes } from "../../src/bff/routes/emrQcRiskLevelV14";
import type { RouteDef } from "../../src/bff/types";

describe("assessRiskLevel 低风险", () => {
  // 手算：score=95 >=90 → level='低风险'
  it("score=95 → level='低风险'", () => {
    const result: RiskLevelV14 = assessRiskLevel(95);
    expect(result.level).toBe("低风险");
  });
});

describe("assessRiskLevel 中风险", () => {
  // 手算：score=80，70<=80<90 → level='中风险'
  it("score=80 → level='中风险'", () => {
    const result: RiskLevelV14 = assessRiskLevel(80);
    expect(result.level).toBe("中风险");
  });
});

describe("assessRiskLevel 高风险", () => {
  // 手算：score=60 <70 → level='高风险'
  it("score=60 → level='高风险'", () => {
    const result: RiskLevelV14 = assessRiskLevel(60);
    expect(result.level).toBe("高风险");
  });
});

describe("buildRiskLevelReport 中风险", () => {
  // 手算：level='中风险', score=80 → 正确构建
  it("level='中风险', score=80 → 正确构建", () => {
    const report = buildRiskLevelReport("中风险", 80);
    expect(report.level).toBe("中风险");
    expect(report.score).toBe(80);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-risk-level auth:true", () => {
    const def = (emrQcRiskLevelV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-risk-level");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
