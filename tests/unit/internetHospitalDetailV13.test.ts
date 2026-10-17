/**
 * 健澜科技 jlmedaios - 互联网医院明细 V13 单测（M399-A，避让旧版 internetHospital/internetHospitalStatsV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFollowupVisitRateV13,
  computeOnlineConsultationCountV13,
  computeOnlinePrescriptionCountV13,
  type InternetHospitalDetailRecordV13,
} from "../../src/bff/aggregators/internetHospitalDetailV13Aggregator";
import { internetHospitalDetailV13Routes } from "../../src/bff/routes/internetHospitalDetailV13";

const records: InternetHospitalDetailRecordV13[] = [
  { consultationCount: 100, prescriptionCount: 80, followupCount: 40 },
  { consultationCount: 100, prescriptionCount: 80, followupCount: 40 },
];

describe("computeOnlineConsultationCountV13", () => {
  // 算式：100+100 = 200
  it("在线问诊数 = 200 次", () => {
    expect(computeOnlineConsultationCountV13(records)).toBe(200);
  });
  it("空态 → 0", () => {
    expect(computeOnlineConsultationCountV13([])).toBe(0);
  });
});

describe("computeOnlinePrescriptionCountV13", () => {
  // 算式：80+80 = 160
  it("在线处方数 = 160 张", () => {
    expect(computeOnlinePrescriptionCountV13(records)).toBe(160);
  });
});

describe("computeFollowupVisitRateV13", () => {
  // 算式：(40+40)/(100+100) = 80/200×100 = 40.00
  it("复诊率 = 40.00%", () => {
    expect(computeFollowupVisitRateV13(records)).toBe(40.00);
  });
});

describe("internetHospitalDetailV13Routes 读路由", () => {
  it("GET /api/v1/internet-hospital-detail 路由存在且 auth:true", () => {
    const route = internetHospitalDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/internet-hospital-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
