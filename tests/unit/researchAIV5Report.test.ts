/**
 * 健澜科技 jlmedaios - AI 科研助手 V5 纯函数单测（M259-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildResearchAIV5Report,
  designStudyV5,
  writePaperSectionV5,
} from "../../src/bff/aggregators/researchAIV5ReportAggregator";

describe("designStudyV5", () => {
  it("干预问题+1000人 → RCT随机化100样本", () => {
    expect(designStudyV5("干预治疗效果", { size: 1000, condition: "高血压" }).design).toBe("RCT");
  });
});

describe("writePaperSectionV5", () => {
  it("结果章节+200例+P0.01 → 内容润色", () => {
    expect(writePaperSectionV5("结果", { n: 200, result: "有效", pValue: 0.01 }).polished).toBe(true);
  });
});

describe("buildResearchAIV5Report", () => {
  it("生成文献数据", () => {
    const r = buildResearchAIV5Report("30d");
    expect(r.literature.aiSearch).toBeGreaterThan(0);
  });

  it("生成论文数据", () => {
    const r = buildResearchAIV5Report("30d");
    expect(r.paper.imrad).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildResearchAIV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
