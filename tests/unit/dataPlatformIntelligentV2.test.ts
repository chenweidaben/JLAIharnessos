/**
 * 健澜科技 jlmedaios - 数据中台智能化 V2 纯函数单测（M235-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  answerDataQuestion,
  buildDataPipeline,
  buildDataPlatformIntelligentV2,
} from "../../src/bff/aggregators/dataPlatformIntelligentV2Aggregator";

describe("buildDataPipeline", () => {
  it("HIVE->ClickHouse → 管道", () => {
    expect(buildDataPipeline("HIVE", "ClickHouse").pipeline).toContain("ClickHouse");
  });
});

describe("answerDataQuestion", () => {
  it("Q:门诊量 → 答案", () => {
    expect(answerDataQuestion("门诊量", "CDR").answer).toContain("CDR");
  });
});

describe("buildDataPlatformIntelligentV2", () => {
  it("生成湖仓数据", () => {
    const r = buildDataPlatformIntelligentV2("30d");
    expect(r.lakehouse.integration).toBeGreaterThan(0);
  });

  it("生成智能问答数据", () => {
    const r = buildDataPlatformIntelligentV2("30d");
    expect(r.qna.nl2sql).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildDataPlatformIntelligentV2("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
