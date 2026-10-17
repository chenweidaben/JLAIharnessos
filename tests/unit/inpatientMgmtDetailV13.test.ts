/**
 * 健澜科技 jlmedaios - 住院管理（细节）V13 单测（M416-D，M416 收官，detail 避让旧版 inpatientBedMgmtV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInpatientMedicalRecordPassRateV13,
  computeInpatientPressureUlcerOccurrenceRateV13,
  computeInpatientStayOver30dRateV13,
  type InpatientMgmtDetailRecordV13,
} from "../../src/bff/aggregators/inpatientMgmtDetailV13Aggregator";
import { inpatientMgmtDetailV13Routes } from "../../src/bff/routes/inpatientMgmtDetailV13";

const records: InpatientMgmtDetailRecordV13[] = [
  { inpatientRecordQualified: 980, inpatientRecordTotal: 1000, over30d: 20, dischargeTotal: 1000, pressureUlcer: 5, inpatientCaseTotal: 1000 },
  { inpatientRecordQualified: 980, inpatientRecordTotal: 1000, over30d: 20, dischargeTotal: 1000, pressureUlcer: 5, inpatientCaseTotal: 1000 },
];

describe("computeInpatientMedicalRecordPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("住院病历合格率 = 98.00%", () => {
    expect(computeInpatientMedicalRecordPassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeInpatientMedicalRecordPassRateV13([])).toBe(0);
  });
});

describe("computeInpatientStayOver30dRateV13", () => {
  // 算式：(20+20)/(1000+1000)×100 = 40/2000×100 = 2.00（反向指标，越低越好）
  it("住院超30天患者比例 = 2.00%（反向指标）", () => {
    expect(computeInpatientStayOver30dRateV13(records)).toBe(2.00);
  });
});

describe("computeInpatientPressureUlcerOccurrenceRateV13", () => {
  // 算式：(5+5)/(1000+1000)×100 = 10/2000×100 = 0.50（反向指标，越低越好）
  it("住院患者压疮发生率 = 0.50%（反向指标）", () => {
    expect(computeInpatientPressureUlcerOccurrenceRateV13(records)).toBe(0.50);
  });
});

describe("inpatientMgmtDetailV13Routes 读路由", () => {
  it("GET /api/v1/inpatient-mgmt-detail 路由存在且 auth:true", () => {
    const route = inpatientMgmtDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/inpatient-mgmt-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
