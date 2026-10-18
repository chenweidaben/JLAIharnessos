/**
 * 健澜科技 jlmedaios - 质控干预建议生成 V14 单测（M495-D，M495 收官）
 *
 * 测试 generateIntervention 生成、buildInterventionReport 构建、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  generateIntervention,
  buildInterventionReport,
  type InterventionV14,
} from "../../src/bff/aggregators/emrQcInterventionV14Aggregator";
import { emrQcInterventionV14Routes } from "../../src/bff/routes/emrQcInterventionV14";
import type { RouteDef } from "../../src/bff/types";

describe("generateIntervention 低风险", () => {
  // 手算：level='低风险' → suggestion 包含'保持监控'
  it("level='低风险' → suggestion 包含'保持监控'", () => {
    const intervention: InterventionV14 = generateIntervention("低风险");
    expect(intervention.suggestion).toContain("保持监控");
  });
});

describe("generateIntervention 中风险", () => {
  // 手算：level='中风险' → suggestion 包含'加强培训'
  it("level='中风险' → suggestion 包含'加强培训'", () => {
    const intervention: InterventionV14 = generateIntervention("中风险");
    expect(intervention.suggestion).toContain("加强培训");
  });
});

describe("generateIntervention 高风险", () => {
  // 手算：level='高风险' → suggestion 包含'立即整改'
  it("level='高风险' → suggestion 包含'立即整改'", () => {
    const intervention: InterventionV14 = generateIntervention("高风险");
    expect(intervention.suggestion).toContain("立即整改");
  });
});

describe("buildInterventionReport 中风险", () => {
  // 手算：level='中风险', suggestion='加强培训' → 正确构建
  it("level='中风险', suggestion='加强培训' → 正确构建", () => {
    const report = buildInterventionReport("中风险", "加强培训");
    expect(report.level).toBe("中风险");
    expect(report.suggestion).toBe("加强培训");
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-intervention auth:true", () => {
    const def = (emrQcInterventionV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-intervention");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
