/**
 * 健澜科技 jlmedaios - 病理服务 V13 单测（M374-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePathologyBiopsyCountV13,
  computePathologyDiagnosisConsistencyRateV13,
  computePathologyFrozenSectionCountV13,
  type PathologyServiceRecordV13,
} from "../../src/bff/aggregators/pathologyServiceV13Aggregator";
import { pathologyServiceV13Routes } from "../../src/bff/routes/pathologyServiceV13";

const records: PathologyServiceRecordV13[] = [
  { biopsyCount: 100, frozenSectionCount: 50, diagnosisSample: 100, diagnosisPass: 98 },
  { biopsyCount: 100, frozenSectionCount: 50, diagnosisSample: 100, diagnosisPass: 98 },
];

describe("computePathologyBiopsyCountV13", () => {
  // 算式：100+100 = 200
  it("病理活检人次 = 200", () => {
    expect(computePathologyBiopsyCountV13(records)).toBe(200);
  });
  it("空态 → 0", () => {
    expect(computePathologyBiopsyCountV13([])).toBe(0);
  });
});

describe("computePathologyFrozenSectionCountV13", () => {
  // 算式：50+50 = 100
  it("病理冰冻人次 = 100", () => {
    expect(computePathologyFrozenSectionCountV13(records)).toBe(100);
  });
});

describe("computePathologyDiagnosisConsistencyRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("病理诊断符合率 = 98.00%", () => {
    expect(computePathologyDiagnosisConsistencyRateV13(records)).toBe(98.00);
  });
});

describe("pathologyServiceV13Routes 读路由", () => {
  it("GET /api/v1/pathology-service 路由存在且 auth:true", () => {
    const route = pathologyServiceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pathology-service",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
