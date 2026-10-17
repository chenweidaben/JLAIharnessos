/**
 * 健澜科技 jlmedaios - 慢病管理 V13 单测（M337-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDiabetesManagementRateV13,
  computeHypertensionManagementRateV13,
  type ChronicDiseaseRecordV13,
} from "../../src/bff/aggregators/chronicDiseaseV13Aggregator";
import { chronicDiseaseV13Routes } from "../../src/bff/routes/chronicDiseaseV13";

const records: ChronicDiseaseRecordV13[] = [
  { hypertensionPatients: 1000, hypertensionManaged: 800, diabetesPatients: 500, diabetesManaged: 400 },
];

describe("computeHypertensionManagementRateV13", () => {
  // 算式：800/1000×100 = 80
  it("高血压规范管理率 = 80%", () => {
    expect(computeHypertensionManagementRateV13(records)).toBe(80);
  });
  it("空态 → 0", () => {
    expect(computeHypertensionManagementRateV13([])).toBe(0);
  });
});

describe("computeDiabetesManagementRateV13", () => {
  // 算式：400/500×100 = 80
  it("糖尿病规范管理率 = 80%", () => {
    expect(computeDiabetesManagementRateV13(records)).toBe(80);
  });
  it("空态 → 0", () => {
    expect(computeDiabetesManagementRateV13([])).toBe(0);
  });
});

describe("chronicDiseaseV13Routes 读路由", () => {
  it("GET /api/v1/chronic-disease-stats 路由存在且 auth:true", () => {
    const route = chronicDiseaseV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/chronic-disease-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
