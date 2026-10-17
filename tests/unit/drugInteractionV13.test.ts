/**
 * 健澜科技 jlmedaios - 药物相互作用 V13 单测（M368-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDrugInteractionWarningCountV13,
  computeMedicationErrorCountV13,
  computeWarningInterceptRateV13,
  type DrugInteractionRecordV13,
} from "../../src/bff/aggregators/drugInteractionV13Aggregator";
import { drugInteractionV13Routes } from "../../src/bff/routes/drugInteractionV13";

const records: DrugInteractionRecordV13[] = [
  { interactionWarningCount: 50, warningIntercepted: 45, medicationErrorCount: 5 },
  { interactionWarningCount: 50, warningIntercepted: 45, medicationErrorCount: 5 },
];

describe("computeDrugInteractionWarningCountV13", () => {
  // 算式：50+50 = 100
  it("相互作用预警数 = 100", () => {
    expect(computeDrugInteractionWarningCountV13(records)).toBe(100);
  });
  it("空态 → 0", () => {
    expect(computeDrugInteractionWarningCountV13([])).toBe(0);
  });
});

describe("computeWarningInterceptRateV13", () => {
  // 算式：(45+45)/(50+50) = 90/100×100 = 90.00
  it("预警拦截率 = 90.00%", () => {
    expect(computeWarningInterceptRateV13(records)).toBe(90.00);
  });
});

describe("computeMedicationErrorCountV13", () => {
  // 算式：5+5 = 10
  it("用药错误数 = 10", () => {
    expect(computeMedicationErrorCountV13(records)).toBe(10);
  });
});

describe("drugInteractionV13Routes 读路由", () => {
  it("GET /api/v1/drug-interaction 路由存在且 auth:true", () => {
    const route = drugInteractionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drug-interaction",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
