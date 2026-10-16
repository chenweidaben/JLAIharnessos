/**
 * 健澜科技 jlmedaios - 内分泌代谢疾病管理 V5 纯函数单测（M264-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessOsteoporosisV5,
  buildEndocrinologyV5Report,
  classifyDiabetesV5,
} from "../../src/bff/aggregators/endocrinologyV5ReportAggregator";

describe("classifyDiabetesV5", () => {
  it("HbA1c 6.5%+无低血糖+无并发症 → 达标目标7", () => {
    expect(classifyDiabetesV5({ value: 6.5 }, { hypoglycemia: false, complication: false }).control).toBe("达标");
  });
});

describe("assessOsteoporosisV5", () => {
  it("T-score -3.0+椎体骨折 → 极高危强效抗骨松", () => {
    expect(assessOsteoporosisV5({ value: -3.0 }, { vertebral: true, hip: false }).risk).toBe("极高危");
  });
});

describe("buildEndocrinologyV5Report", () => {
  it("生成糖尿病数据", () => {
    const r = buildEndocrinologyV5Report("30d");
    expect(r.diabetes.t2dm).toBeGreaterThan(0);
  });

  it("生成甲状腺数据", () => {
    const r = buildEndocrinologyV5Report("30d");
    expect(r.thyroid.thyroidFunction).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildEndocrinologyV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
