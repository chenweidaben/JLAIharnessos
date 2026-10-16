/**
 * 健澜科技 jlmedaios - 科研创新 V3 纯函数单测（M242-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildResearchV3Report,
  scoreResearchOutputV3,
  trackResearchProjectV3,
} from "../../src/bff/aggregators/researchV3ReportAggregator";

describe("scoreResearchOutputV3", () => {
  it("SCI 200+专利50+项目10 → 优秀", () => {
    expect(scoreResearchOutputV3(200, 50, 10).level).toBe("优秀");
  });
});

describe("trackResearchProjectV3", () => {
  it("总100完成80 → 80%", () => {
    expect(trackResearchProjectV3({ total: 100, funded: 80, completed: 80 }).rate).toBe(80);
  });
});

describe("buildResearchV3Report", () => {
  it("生成立项数据", () => {
    const r = buildResearchV3Report("30d");
    expect(r.grants.nsfc).toBeGreaterThan(0);
  });

  it("生成成果数据", () => {
    const r = buildResearchV3Report("30d");
    expect(r.output.sci).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildResearchV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
