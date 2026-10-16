/**
 * 健澜科技 jlmedaios - 风湿免疫与过敏性疾病 V5 纯函数单测（M265-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessSLEDAIV5,
  buildRheumatologyV5Report,
  scoreDAS28V5,
} from "../../src/bff/aggregators/rheumatologyV5ReportAggregator";

describe("scoreDAS28V5", () => {
  it("压痛关节 10+肿胀关节 5+ESR 60 → 高度活动生物制剂", () => {
    expect(scoreDAS28V5({ tender: 10, swollen: 5 }, { value: 60 }).activity).toBe("高度活动");
  });
});

describe("assessSLEDAIV5", () => {
  it("狼疮肾+神经精神+补体低 → 重度激素冲击", () => {
    expect(assessSLEDAIV5({ renal: true, neurologic: true, mucocutaneous: false }, { complement: 0.3, antiDsDna: 150 }).severity).toBe("重度");
  });
});

describe("buildRheumatologyV5Report", () => {
  it("生成 RA 数据", () => {
    const r = buildRheumatologyV5Report("30d");
    expect(r.ra.das28).toBeGreaterThan(0);
  });

  it("生成 SLE 数据", () => {
    const r = buildRheumatologyV5Report("30d");
    expect(r.sle.sledai).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildRheumatologyV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
