/**
 * 健澜科技 jlmedaios - 互联网医院管理 V13 单测（M459-C，医院运营与健康管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInternetHospitalOnlineConsultationCountV13,
  computeInternetHospitalOnlinePrescriptionRateV13,
  computeInternetHospitalReconsultationResponseMinutesV13,
  type InternetHospitalMgmtRecordV13,
} from "../../src/bff/aggregators/internetHospitalMgmtV13Aggregator";
import { internetHospitalMgmtV13Routes } from "../../src/bff/routes/internetHospitalMgmtV13";

const records: InternetHospitalMgmtRecordV13[] = [
  { consultationCount: 950, prescribed: 900, totalConsultation: 1000, responseMinutes: 15 },
  { consultationCount: 950, prescribed: 900, totalConsultation: 1000, responseMinutes: 15 },
];

describe("computeInternetHospitalOnlineConsultationCountV13", () => {
  // 算式：950 + 950 = 1900（reduce 累加）
  it("在线问诊量 = 1900 人次（reduce 累加）", () => {
    expect(computeInternetHospitalOnlineConsultationCountV13(records)).toBe(1900);
  });
  it("空态 → 0", () => {
    expect(computeInternetHospitalOnlineConsultationCountV13([])).toBe(0);
  });
});

describe("computeInternetHospitalOnlinePrescriptionRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("在线处方率 = 90.00%", () => {
    expect(computeInternetHospitalOnlinePrescriptionRateV13(records)).toBe(90.00);
  });
});

describe("computeInternetHospitalReconsultationResponseMinutesV13", () => {
  // 算式：(15+15)/2 = 15，Math.ceil(15) = 15（整分钟，不用 Math.ceil(avg*100)/100）
  it("复诊咨询响应时长 = 15 分钟（Math.ceil(avg) 整分钟）", () => {
    expect(computeInternetHospitalReconsultationResponseMinutesV13(records)).toBe(15);
  });
});

describe("internetHospitalMgmtV13Routes 读路由", () => {
  it("GET /api/v1/internet-hospital-mgmt 路由存在且 auth:true", () => {
    const route = internetHospitalMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/internet-hospital-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
