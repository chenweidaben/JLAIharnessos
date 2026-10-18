/**
 * 健澜科技 jlmedaios - DIP 分值预测 V14 单测（M535-D）
 *
 * 测试 buildDipPredict 构建 DIP 预测、predictDipScore DIP 分值预测、buildDipPredictReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDipPredict,
  buildDipPredictReport,
  predictDipScore,
  type DipPredictInputV14,
} from "../../src/bff/aggregators/emrDipPredictV14Aggregator";
import { emrDipPredictV14Routes } from "../../src/bff/routes/emrDipPredictV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDipPredict 构建 DIP 预测", () => {
  // 手算：recordId='REC203', mainDiagnosis='肺炎' → 正确构建
  it("recordId='REC203', mainDiagnosis='肺炎' → 正确构建", () => {
    const predict = buildDipPredict("REC203", "肺炎");
    expect(predict.recordId).toBe("REC203");
    expect(predict.mainDiagnosis).toBe("肺炎");
  });
});

describe("predictDipScore A级", () => {
  // 手算：{mainDiagnosis='肺炎', treatmentCount=8, cost=5000}
  // 手算：dipScore = Math.round((8*10 + 5000/100) * 10) / 10
  // 手算：= Math.round((80 + 50) * 10) / 10 = Math.round(1300) / 10 = 1300 / 10 = 130.0
  // 手算：level = 130.0 >= 100 → 'A'
  it("{mainDiagnosis='肺炎', treatmentCount=8, cost=5000} → dipScore=130.0, level='A'", () => {
    const input: DipPredictInputV14 = { mainDiagnosis: "肺炎", treatmentCount: 8, cost: 5000 };
    const result = predictDipScore(input);
    expect(result.dipScore).toBeCloseTo(130.0, 1);
    expect(result.level).toBe("A");
  });
});

describe("predictDipScore B级", () => {
  // 手算：{mainDiagnosis='肺炎', treatmentCount=3, cost=2000}
  // 手算：dipScore = Math.round((3*10 + 2000/100) * 10) / 10
  // 手算：= Math.round((30 + 20) * 10) / 10 = Math.round(500) / 10 = 500 / 10 = 50.0
  // 手算：level = 50.0 >= 50 → 'B'
  it("{mainDiagnosis='肺炎', treatmentCount=3, cost=2000} → dipScore=50.0, level='B'", () => {
    const input: DipPredictInputV14 = { mainDiagnosis: "肺炎", treatmentCount: 3, cost: 2000 };
    const result = predictDipScore(input);
    expect(result.dipScore).toBeCloseTo(50.0, 1);
    expect(result.level).toBe("B");
  });
});

describe("buildDipPredictReport 构建报告", () => {
  // 手算：{dipScore=130.0, level='A'}
  // 手算：透传 dipScore + level
  it("{dipScore=130.0, level='A'} → 正确返回（透传）", () => {
    const report = buildDipPredictReport({ dipScore: 130.0, level: "A" });
    expect(report.dipScore).toBe(130.0);
    expect(report.level).toBe("A");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-dip-predict auth:true", () => {
    const def = (emrDipPredictV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-dip-predict");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
