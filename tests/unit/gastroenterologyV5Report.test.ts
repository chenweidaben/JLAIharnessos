/**
 * 健澜科技 jlmedaios - 消化系统疾病管理 V5 纯函数单测（M265-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessGIEndoscopyQualityV5,
  buildGastroenterologyV5Report,
  classifyLiverDiseaseV5,
} from "../../src/bff/aggregators/gastroenterologyV5ReportAggregator";

describe("classifyLiverDiseaseV5", () => {
  it("白蛋白25+INR 1.6+胆红素60 → 失代偿肝硬化", () => {
    expect(classifyLiverDiseaseV5({ alt: 5, bilirubin: 60, albumin: 25, inr: 1.6 }, { viral: true, fatty: false, alcohol: false }).stage).toBe("肝硬化");
  });
});

describe("assessGIEndoscopyQualityV5", () => {
  it("肠镜1000+息肉300+盲肠插镜980 → 腺瘤检出30%合格", () => {
    expect(assessGIEndoscopyQualityV5({ colonoscopy: 1000, polypDetected: 300, cecalIntubation: 980, biopsy: 500 }).adenomaDetection).toBe(30);
  });
});

describe("buildGastroenterologyV5Report", () => {
  it("生成内镜数据", () => {
    const r = buildGastroenterologyV5Report("30d");
    expect(r.endoscopy.gastroscopy).toBeGreaterThan(0);
  });

  it("生成肝病数据", () => {
    const r = buildGastroenterologyV5Report("30d");
    expect(r.liver.cirrhosis).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildGastroenterologyV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
