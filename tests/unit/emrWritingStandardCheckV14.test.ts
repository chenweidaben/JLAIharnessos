/**
 * 健澜科技 jlmedaios - 病历书写规范检查 V14 单测（M485-A）
 *
 * 测试 checkWritingStandard 检查、buildWritingStandardReport 报告、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkWritingStandard,
  buildWritingStandardReport,
  type WritingStandardResultV14,
} from "../../src/bff/aggregators/emrWritingStandardCheckV14Aggregator";
import { emrWritingStandardCheckV14Routes } from "../../src/bff/routes/emrWritingStandardCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("checkWritingStandard 模糊用语", () => {
  // 手算：含"大概""可能" → issues 非空
  it("含大概可能 → issues 非空", () => {
    const result: WritingStandardResultV14 = checkWritingStandard("患者大概可能有发热");
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("checkWritingStandard 规范书写", () => {
  // 手算：规范书写 → issues=[]
  it("规范书写 → issues=[]", () => {
    const result: WritingStandardResultV14 = checkWritingStandard("患者体温39.5℃，咳嗽3天");
    expect(result.issues.length).toBe(0);
  });
});

describe("buildWritingStandardReport 2项", () => {
  // 手算：issueCount=2 → 100-2×5=90
  it("issueCount=2 → score=90", () => {
    const result: WritingStandardResultV14 = { content: "test", issues: ["含模糊用语大概", "含模糊用语可能"] };
    const report = buildWritingStandardReport(result);
    expect(report.score).toBe(90);
  });
});

describe("buildWritingStandardReport 0项", () => {
  // 手算：issueCount=0 → 100-0×5=100
  it("issueCount=0 → score=100", () => {
    const result: WritingStandardResultV14 = { content: "test", issues: [] };
    const report = buildWritingStandardReport(result);
    expect(report.score).toBe(100);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-writing-standard-check auth:true", () => {
    const def = (emrWritingStandardCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-writing-standard-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
