/**
 * 健澜科技 jlmedaios - 心血管疾病管理 V5 纯函数单测（M264-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessHeartFailureV5,
  buildCardiologyV5Report,
  stratifyHypertensionV5,
} from "../../src/bff/aggregators/cardiologyV5ReportAggregator";

describe("stratifyHypertensionV5", () => {
  it("160/100+糖尿病+靶器官损害 → 很高危目标130", () => {
    expect(stratifyHypertensionV5({ systolic: 160, diastolic: 100 }, { age: 60, smoking: false, diabetes: true, targetOrgan: true }).riskLevel).toBe("很高危");
  });
});

describe("assessHeartFailureV5", () => {
  it("BNP 1200+呼吸困难+EF 30% → 重度高再入院风险", () => {
    expect(assessHeartFailureV5({ value: 1200 }, { dyspnea: true, edema: false }, { ef: 30 }).severity).toBe("重度");
  });
});

describe("buildCardiologyV5Report", () => {
  it("生成冠心病数据", () => {
    const r = buildCardiologyV5Report("30d");
    expect(r.coronary.pci).toBeGreaterThan(0);
  });

  it("生成心律失常数据", () => {
    const r = buildCardiologyV5Report("30d");
    expect(r.arrhythmia.af).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildCardiologyV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
