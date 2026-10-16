/**
 * 健澜科技 jlmedaios - 呼吸系统疾病管理 V5 纯函数单测（M264-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessAsthmaControlV5,
  buildPulmonologyV5Report,
  classifyCOPDV5,
} from "../../src/bff/aggregators/pulmonologyV5ReportAggregator";

describe("classifyCOPDV5", () => {
  it("FEV1 45%+mMRC 3+急性加重 2次 → E组 ICS+LABA", () => {
    expect(classifyCOPDV5({ percent: 45 }, { mMRC: 3, exacerbation: 2 }).therapy).toBe("ICS+LABA");
  });
});

describe("assessAsthmaControlV5", () => {
  it("ACT 18+急性加重 2次 → 未控制升级治疗", () => {
    expect(assessAsthmaControlV5({ score: 18 }, { nocturnal: 1, exacerbation: 2 }).action).toBe("升级治疗");
  });
});

describe("buildPulmonologyV5Report", () => {
  it("生成 COPD 数据", () => {
    const r = buildPulmonologyV5Report("30d");
    expect(r.copd.pft).toBeGreaterThan(0);
  });

  it("生成哮喘数据", () => {
    const r = buildPulmonologyV5Report("30d");
    expect(r.asthma.gina).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPulmonologyV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
