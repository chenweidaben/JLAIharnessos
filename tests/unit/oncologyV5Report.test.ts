/**
 * 健澜科技 jlmedaios - 肿瘤全程管理 V5 纯函数单测（M264-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildOncologyV5Report,
  recommendTumorRegimenV5,
  stageTumorV5,
} from "../../src/bff/aggregators/oncologyV5ReportAggregator";

describe("stageTumorV5", () => {
  it("T2N1M0 → II期手术+辅助治疗", () => {
    expect(stageTumorV5({ t: 2 }, { n: 1 }, { m: 0 }).stage).toBe("II期");
  });
});

describe("recommendTumorRegimenV5", () => {
  it("肺癌+EGFR突变 → EGFR-TKI靶向", () => {
    expect(recommendTumorRegimenV5({ type: "肺癌" }, { egfr: true, pdL1: 10 }).regimen).toBe("EGFR-TKI 靶向");
  });
});

describe("buildOncologyV5Report", () => {
  it("生成筛查数据", () => {
    const r = buildOncologyV5Report("30d");
    expect(r.screening.lungLDCT).toBeGreaterThan(0);
  });

  it("生成治疗数据", () => {
    const r = buildOncologyV5Report("30d");
    expect(r.treatment.surgery).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildOncologyV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
