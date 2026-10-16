/**
 * 健澜科技 jlmedaios - 科研管理 V4 纯函数单测（M254-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildResearchManagementV4Report,
  scoreResearchOutputV4,
  trackResearchProjectV4,
} from "../../src/bff/aggregators/researchManagementV4ReportAggregator";

describe("scoreResearchOutputV4", () => {
  it("论文10专利5项目3 → 100+100+90=290优秀", () => {
    expect(scoreResearchOutputV4(10, 5, 3).level).toBe("优秀");
  });
});

describe("trackResearchProjectV4", () => {
  it("3个项目分别立项中期结题 → 各1", () => {
    const r = trackResearchProjectV4([{ name: "A", stage: "立项" }, { name: "B", stage: "中期" }, { name: "C", stage: "结题" }]);
    expect(r.total).toBe(3);
  });
});

describe("buildResearchManagementV4Report", () => {
  it("生成课题数据", () => {
    const r = buildResearchManagementV4Report("30d");
    expect(r.projects.nsfc).toBeGreaterThan(0);
  });

  it("生成论文数据", () => {
    const r = buildResearchManagementV4Report("30d");
    expect(r.papers.sci).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildResearchManagementV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
