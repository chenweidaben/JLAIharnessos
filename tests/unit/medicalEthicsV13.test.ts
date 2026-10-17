/**
 * 健澜科技 jlmedaios - 医德医风考评 V13 单测（M340-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCommendationCountV13,
  computeExcellentGoodRateV13,
  type MedicalEthicsRecordV13,
} from "../../src/bff/aggregators/medicalEthicsV13Aggregator";
import { medicalEthicsV13Routes } from "../../src/bff/routes/medicalEthicsV13";

const records: MedicalEthicsRecordV13[] = [
  { totalEvaluated: 100, excellentGoodCount: 95, commendationCount: 3 },
];

describe("computeExcellentGoodRateV13", () => {
  // 算式：95/100×100 = 95.0
  it("考评优良率 = 95.0%", () => {
    expect(computeExcellentGoodRateV13(records)).toBe(95.0);
  });
  it("空态 → 0", () => {
    expect(computeExcellentGoodRateV13([])).toBe(0);
  });
  it("考评总数为 0 → 0", () => {
    const zeroRecords: MedicalEthicsRecordV13[] = [
      { totalEvaluated: 0, excellentGoodCount: 0, commendationCount: 0 },
    ];
    expect(computeExcellentGoodRateV13(zeroRecords)).toBe(0);
  });
});

describe("computeCommendationCountV13", () => {
  // 算式：3 = 3
  it("受表扬人次 = 3", () => {
    expect(computeCommendationCountV13(records)).toBe(3);
  });
});

describe("medicalEthicsV13Routes 读路由", () => {
  it("GET /api/v1/medical-ethics 路由存在且 auth:true", () => {
    const route = medicalEthicsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-ethics",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
