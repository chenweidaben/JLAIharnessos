/**
 * 健澜科技 jlmedaios - ICU 管理 V13 单测（M416-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeIcuApacheIIPassRateV13,
  computeIcuAverageLosDaysV13,
  computeIcuUnplannedExtubationRateV13,
  type IcuMgmtRecordV13,
} from "../../src/bff/aggregators/icuMgmtV13Aggregator";
import { icuMgmtV13Routes } from "../../src/bff/routes/icuMgmtV13";

const records: IcuMgmtRecordV13[] = [
  { apacheQualified: 900, icuPatientTotal: 1000, unplannedExtubation: 10, intubationTotal: 1000, losDays: 5.5 },
  { apacheQualified: 900, icuPatientTotal: 1000, unplannedExtubation: 10, intubationTotal: 1000, losDays: 6.5 },
];

describe("computeIcuApacheIIPassRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("ICU 患者 APACHE II 评分合格率 = 90.00%", () => {
    expect(computeIcuApacheIIPassRateV13(records)).toBe(90.00);
  });
  it("空态 → 0", () => {
    expect(computeIcuApacheIIPassRateV13([])).toBe(0);
  });
});

describe("computeIcuUnplannedExtubationRateV13", () => {
  // 算式：(10+10)/(1000+1000)×100 = 20/2000×100 = 1.00（反向指标，越低越好）
  it("ICU 非计划拔管率 = 1.00%（反向指标）", () => {
    expect(computeIcuUnplannedExtubationRateV13(records)).toBe(1.00);
  });
});

describe("computeIcuAverageLosDaysV13", () => {
  // 算式：(5.5+6.5)/2 = 6.0 天（保留 1 位小数）
  it("ICU 平均住院日 = 6.0 天", () => {
    expect(computeIcuAverageLosDaysV13(records)).toBe(6.0);
  });
});

describe("icuMgmtV13Routes 读路由", () => {
  it("GET /api/v1/icu-mgmt 路由存在且 auth:true", () => {
    const route = icuMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/icu-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
