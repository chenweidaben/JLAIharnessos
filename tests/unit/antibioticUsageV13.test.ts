/**
 * 健澜科技 jlmedaios - 抗菌药物使用 V13 单测（M388-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAntibioticDDDV13,
  computeInpatientAntibioticUsageRateV13,
  computeOutpatientAntibioticPrescriptionRateV13,
  type AntibioticUsageRecordV13,
} from "../../src/bff/aggregators/antibioticUsageV13Aggregator";
import { antibioticUsageV13Routes } from "../../src/bff/routes/antibioticUsageV13";

const records: AntibioticUsageRecordV13[] = [
  { inpatientUsageCount: 600, dischargeCount: 1000, antibioticRxCount: 200, totalRxCount: 1000, totalDdd: 4000, avgStayDays: 5 },
  { inpatientUsageCount: 600, dischargeCount: 1000, antibioticRxCount: 200, totalRxCount: 1000, totalDdd: 4000, avgStayDays: 5 },
];

describe("computeInpatientAntibioticUsageRateV13", () => {
  // 算式：(600+600)/(1000+1000) = 1200/2000×100 = 60.00
  it("住院抗菌药物使用率 = 60.00%", () => {
    expect(computeInpatientAntibioticUsageRateV13(records)).toBe(60.00);
  });
  it("空态 → 0", () => {
    expect(computeInpatientAntibioticUsageRateV13([])).toBe(0);
  });
});

describe("computeOutpatientAntibioticPrescriptionRateV13", () => {
  // 算式：(200+200)/(1000+1000) = 400/2000×100 = 20.00
  it("门诊抗菌药物处方率 = 20.00%", () => {
    expect(computeOutpatientAntibioticPrescriptionRateV13(records)).toBe(20.00);
  });
});

describe("computeAntibioticDDDV13", () => {
  // 算式：(4000+4000)/((1000+1000)×(5+5)) = 8000/20000 = 0.40
  // 注意：avgStayDays 是每条记录的平均住院天数，汇总时按出院人数加权
  it("抗菌药物使用强度 DDD = 0.40", () => {
    expect(computeAntibioticDDDV13(records)).toBe(0.40);
  });
});

describe("antibioticUsageV13Routes 读路由", () => {
  it("GET /api/v1/antibiotic-usage 路由存在且 auth:true", () => {
    const route = antibioticUsageV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/antibiotic-usage",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
