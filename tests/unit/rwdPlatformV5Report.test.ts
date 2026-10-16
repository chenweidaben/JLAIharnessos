/**
 * 健澜科技 jlmedaios - 临床研究 RWD/RWE 平台 V5 纯函数单测（M269-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessRWDQualityV5,
  buildRWDPlatformV5Report,
  designCohortV5,
} from "../../src/bff/aggregators/rwdPlatformV5ReportAggregator";

describe("designCohortV5", () => {
  it("人群10000+符合纳排 → 队列7000人", () => {
    expect(designCohortV5({ total: 10000, ageMin: 18, ageMax: 80 }, { include: ["糖尿病"], exclude: ["妊娠"] }).cohortSize).toBe(7000);
  });
});

describe("assessRWDQualityV5", () => {
  it("四项均85分 → 平均85分A级可用", () => {
    expect(assessRWDQualityV5({ completeness: 85, consistency: 85, timeliness: 85, accuracy: 85 }).grade).toBe("A");
  });
});

describe("buildRWDPlatformV5Report", () => {
  it("生成RWD数据", () => {
    const r = buildRWDPlatformV5Report("30d");
    expect(r.rwd.emr).toBeGreaterThan(0);
  });

  it("生成研究设计数据", () => {
    const r = buildRWDPlatformV5Report("30d");
    expect(r.design.cohort).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildRWDPlatformV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
