/**
 * 健澜科技 jlmedaios - 会诊管理 V13 单测（M404-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeConsultationOpinionExecutionRateV13,
  computeEmergencyConsultationArrivalTimeV13,
  computeGeneralConsultationTimelyRateV13,
  type ConsultationMgmtRecordV13,
} from "../../src/bff/aggregators/consultationMgmtV13Aggregator";
import { consultationMgmtV13Routes } from "../../src/bff/routes/consultationMgmtV13";

const records: ConsultationMgmtRecordV13[] = [
  { timelyGeneral: 950, totalGeneral: 1000, emergencyArrival: 5.3, executed: 980, totalOpinion: 1000 },
  { timelyGeneral: 950, totalGeneral: 1000, emergencyArrival: 5.3, executed: 980, totalOpinion: 1000 },
];

describe("computeGeneralConsultationTimelyRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("普通会诊及时率 = 95.00%", () => {
    expect(computeGeneralConsultationTimelyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeGeneralConsultationTimelyRateV13([])).toBe(0);
  });
});

describe("computeEmergencyConsultationArrivalTimeV13", () => {
  // 算式：(5.3+5.3)/2 = 5.3 → Math.ceil(5.3*100)/100 = 6
  it("急会诊到位时间 = 6 分钟", () => {
    expect(computeEmergencyConsultationArrivalTimeV13(records)).toBe(6);
  });
});

describe("computeConsultationOpinionExecutionRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("会诊意见执行率 = 98.00%", () => {
    expect(computeConsultationOpinionExecutionRateV13(records)).toBe(98.00);
  });
});

describe("consultationMgmtV13Routes 读路由", () => {
  it("GET /api/v1/consultation-mgmt 路由存在且 auth:true", () => {
    const route = consultationMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/consultation-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
