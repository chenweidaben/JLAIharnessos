/**
 * 健澜科技 jlmedaios - ICD 编码准确率 V13 单测（M334-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePrimaryDxAccuracyV13,
  computeProcedureAccuracyV13,
  type ICDCodingRecordV13,
} from "../../src/bff/aggregators/icdCodingV13Aggregator";
import { icdCodingV13Routes } from "../../src/bff/routes/icdCodingV13";

const records: ICDCodingRecordV13[] = [
  { totalRecords: 100, primaryDxAccurateCount: 90, procedureAccurateCount: 85 },
];

describe("computePrimaryDxAccuracyV13", () => {
  // 算式：90/100×100 = 90
  it("主诊断准确率 = 90%", () => {
    expect(computePrimaryDxAccuracyV13(records)).toBe(90);
  });
  it("空态 → 0", () => {
    expect(computePrimaryDxAccuracyV13([])).toBe(0);
  });
});

describe("computeProcedureAccuracyV13", () => {
  // 算式：85/100×100 = 85
  it("手术准确率 = 85%", () => {
    expect(computeProcedureAccuracyV13(records)).toBe(85);
  });
  it("空态 → 0", () => {
    expect(computeProcedureAccuracyV13([])).toBe(0);
  });
});

describe("icdCodingV13Routes 读路由", () => {
  it("GET /api/v1/icd-coding-accuracy 路由存在且 auth:true", () => {
    const route = icdCodingV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/icd-coding-accuracy",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
