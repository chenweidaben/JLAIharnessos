/**
 * 健澜科技 jlmedaios - 病历AI归档校验 V14 单测（M551-D，M551 收官）
 *
 * 测试 buildAiArchiveCheck 构建 AI 归档校验、checkArchiveByAi AI 病案归档校验、buildAiArchiveCheckReport 构建归档校验报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiArchiveCheck,
  buildAiArchiveCheckReport,
  checkArchiveByAi,
  type AiArchiveCheckInputV14,
} from "../../src/bff/aggregators/emrAiArchiveCheckV14Aggregator";
import { emrAiArchiveCheckV14Routes } from "../../src/bff/routes/emrAiArchiveCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiArchiveCheck 构建 AI 归档校验", () => {
  // 手算：recordId='RECB028', dept='病案室' → 正确构建
  it("recordId='RECB028', dept='病案室' → 正确构建", () => {
    const base = buildAiArchiveCheck("RECB028", "病案室");
    expect(base.recordId).toBe("RECB028");
    expect(base.dept).toBe("病案室");
  });
});

describe("checkArchiveByAi 可归档", () => {
  // 手算：{hasCompleteRecord=true, hasSigned=true, hasCoded=true}
  // 手算：missingItems = 0+0+0 = 0
  // 手算：missingItems=0 → canArchive=true
  it("{hasCompleteRecord=true, hasSigned=true, hasCoded=true} → missingItems=0, canArchive=true", () => {
    const input: AiArchiveCheckInputV14 = { hasCompleteRecord: true, hasSigned: true, hasCoded: true };
    const result = checkArchiveByAi(input);
    expect(result.missingItems).toBe(0);
    expect(result.canArchive).toBe(true);
  });
});

describe("checkArchiveByAi 不可归档", () => {
  // 手算：{hasCompleteRecord=true, hasSigned=false, hasCoded=false}
  // 手算：missingItems = 0+1+1 = 2（缺签名+编码）
  // 手算：missingItems=2 → canArchive=false
  it("{hasCompleteRecord=true, hasSigned=false, hasCoded=false} → missingItems=2, canArchive=false", () => {
    const input: AiArchiveCheckInputV14 = { hasCompleteRecord: true, hasSigned: false, hasCoded: false };
    const result = checkArchiveByAi(input);
    expect(result.missingItems).toBe(2);
    expect(result.canArchive).toBe(false);
  });
});

describe("buildAiArchiveCheckReport 构建归档校验报告", () => {
  // 手算：{canArchive=true, missingItems=0}
  // 手算：透传 canArchive + missingItems
  it("{canArchive=true, missingItems=0} → 正确返回（透传）", () => {
    const report = buildAiArchiveCheckReport({ canArchive: true, missingItems: 0 });
    expect(report.canArchive).toBe(true);
    expect(report.missingItems).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-archive-check auth:true", () => {
    const def = (emrAiArchiveCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-archive-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
