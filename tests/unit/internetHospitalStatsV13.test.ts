/**
 * 健澜科技 jlmedaios - 互联网医院（统计）V13 单测（M367-A，stats避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOnlineConsultationCountV13,
  computeOnlineFollowUpCountV13,
  computeOnlinePrescriptionCountV13,
  type InternetHospitalStatsRecordV13,
} from "../../src/bff/aggregators/internetHospitalStatsV13Aggregator";
import { internetHospitalStatsV13Routes } from "../../src/bff/routes/internetHospitalStatsV13";

const records: InternetHospitalStatsRecordV13[] = [
  { onlineConsultationCount: 500, onlinePrescriptionCount: 300, onlineFollowUpCount: 200 },
  { onlineConsultationCount: 500, onlinePrescriptionCount: 300, onlineFollowUpCount: 200 },
];

describe("computeOnlineConsultationCountV13", () => {
  // 算式：500+500 = 1000
  it("在线问诊人次 = 1000", () => {
    expect(computeOnlineConsultationCountV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeOnlineConsultationCountV13([])).toBe(0);
  });
});

describe("computeOnlinePrescriptionCountV13", () => {
  // 算式：300+300 = 600
  it("在线处方数 = 600", () => {
    expect(computeOnlinePrescriptionCountV13(records)).toBe(600);
  });
});

describe("computeOnlineFollowUpCountV13", () => {
  // 算式：200+200 = 400
  it("在线随访数 = 400", () => {
    expect(computeOnlineFollowUpCountV13(records)).toBe(400);
  });
});

describe("internetHospitalStatsV13Routes 读路由", () => {
  it("GET /api/v1/internet-hospital-stats 路由存在且 auth:true", () => {
    const route = internetHospitalStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/internet-hospital-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
