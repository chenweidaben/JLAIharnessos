/**
 * 健澜科技 jlmedaios - 病历术语规范检查 V14 单测（M485-C）
 *
 * 测试 checkTerminology 检查、buildTerminologyReport 报告、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkTerminology,
  buildTerminologyReport,
  type TerminologyCheckResultV14,
} from "../../src/bff/aggregators/emrTerminologyCheckV14Aggregator";
import { emrTerminologyCheckV14Routes } from "../../src/bff/routes/emrTerminologyCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("checkTerminology 拉肚子", () => {
  // 手算：含"拉肚子" → issues 非空
  it("含拉肚子 → issues 非空", () => {
    const result: TerminologyCheckResultV14 = checkTerminology("患者拉肚子3天");
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("checkTerminology 规范术语", () => {
  // 手算：规范医学术语 → issues=[]
  it("规范医学术语 → issues=[]", () => {
    const result: TerminologyCheckResultV14 = checkTerminology("患者腹泻3天，发热1天");
    expect(result.issues.length).toBe(0);
  });
});

describe("buildTerminologyReport 2项", () => {
  // 手算：issueCount=2 → 100-2×5=90
  it("issueCount=2 → score=90", () => {
    const result: TerminologyCheckResultV14 = { content: "test", issues: ["含口语化术语拉肚子", "含口语化术语发烧"] };
    const report = buildTerminologyReport(result);
    expect(report.score).toBe(90);
  });
});

describe("buildTerminologyReport 0项", () => {
  // 手算：issueCount=0 → 100-0×5=100
  it("issueCount=0 → score=100", () => {
    const result: TerminologyCheckResultV14 = { content: "test", issues: [] };
    const report = buildTerminologyReport(result);
    expect(report.score).toBe(100);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-terminology-check auth:true", () => {
    const def = (emrTerminologyCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-terminology-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
