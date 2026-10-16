/**
 * 健澜科技 jlmedaios - EMR 评级 V3 纯函数单测（M231-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessEMRLevel,
  buildEMRRatingV3Report,
  trackClosedLoop,
} from "../../src/bff/aggregators/emrRatingV3ReportAggregator";

describe("assessEMRLevel", () => {
  it("90项 → 八级", () => {
    expect(assessEMRLevel(90).level).toBe("八级");
  });

  it("80项 → 七级", () => {
    expect(assessEMRLevel(80).level).toBe("七级");
  });
});

describe("trackClosedLoop", () => {
  it("有医嘱有执行 → 闭环", () => {
    expect(trackClosedLoop("医嘱001", "执行001").closed).toBe(true);
  });

  it("无执行 → 断点", () => {
    expect(trackClosedLoop("医嘱001", "").closed).toBe(false);
  });
});

describe("buildEMRRatingV3Report", () => {
  it("生成6级数据", () => {
    const r = buildEMRRatingV3Report("30d");
    expect(r.level6.closedLoop).toBe(true);
  });

  it("生成7级数据", () => {
    const r = buildEMRRatingV3Report("30d");
    expect(r.level7.aiAssisted).toBe(true);
  });

  it("生成RWE数据", () => {
    const r = buildEMRRatingV3Report("30d");
    expect(r.rwe.enabled).toBe(true);
  });

  it("生成建议", () => {
    const r = buildEMRRatingV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
