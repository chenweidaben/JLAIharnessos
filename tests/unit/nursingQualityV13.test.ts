/**
 * 健澜科技 jlmedaios - 护理质量 V13 单测（M358-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBasicNursingPassRateV13,
  computeNursingAdverseEventRateV13,
  computeSpecialGradeNursingPassRateV13,
  type NursingQualityRecordV13,
} from "../../src/bff/aggregators/nursingQualityV13Aggregator";
import { nursingQualityV13Routes } from "../../src/bff/routes/nursingQualityV13";

const records: NursingQualityRecordV13[] = [
  { basicNursingPassed: 95, basicNursingSampled: 100, specialGradeNursingPassed: 48, specialGradeNursingSampled: 50, nursingAdverseEventOccurred: 1, inpatientAdmissions: 2000 },
  { basicNursingPassed: 95, basicNursingSampled: 100, specialGradeNursingPassed: 47, specialGradeNursingSampled: 50, nursingAdverseEventOccurred: 1, inpatientAdmissions: 2000 },
];

describe("computeBasicNursingPassRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("基础护理合格率 = 95.00%", () => {
    expect(computeBasicNursingPassRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeBasicNursingPassRateV13([])).toBe(0);
  });
});

describe("computeSpecialGradeNursingPassRateV13", () => {
  // 算式：(48+47)/(50+50) = 95/100×100 = 95.00
  it("特级护理合格率 = 95.00%", () => {
    expect(computeSpecialGradeNursingPassRateV13(records)).toBe(95.00);
  });
});

describe("computeNursingAdverseEventRateV13", () => {
  // 算式：(1+1)/(2000+2000) = 2/4000×100 = 0.05
  it("护理不良事件发生率 = 0.05%", () => {
    expect(computeNursingAdverseEventRateV13(records)).toBe(0.05);
  });
});

describe("nursingQualityV13Routes 读路由", () => {
  it("GET /api/v1/nursing-quality 路由存在且 auth:true", () => {
    const route = nursingQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
