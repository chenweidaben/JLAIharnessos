/**
 * 健澜科技 jlmedaios - 远程医疗明细 V13 单测（M399-B，避让旧版 telemedicineV13/telemedicineStatsV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeRemoteConsultationCountV13,
  computeRemoteImagingDiagnosisCountV13,
  computeRemoteOutpatientCountV13,
  type TelemedicineDetailRecordV13,
} from "../../src/bff/aggregators/telemedicineDetailV13Aggregator";
import { telemedicineDetailV13Routes } from "../../src/bff/routes/telemedicineDetailV13";

const records: TelemedicineDetailRecordV13[] = [
  { consultationCount: 10, imagingCount: 5, outpatientCount: 20 },
  { consultationCount: 10, imagingCount: 5, outpatientCount: 20 },
];

describe("computeRemoteConsultationCountV13", () => {
  // 算式：10+10 = 20
  it("远程会诊数 = 20 次", () => {
    expect(computeRemoteConsultationCountV13(records)).toBe(20);
  });
  it("空态 → 0", () => {
    expect(computeRemoteConsultationCountV13([])).toBe(0);
  });
});

describe("computeRemoteImagingDiagnosisCountV13", () => {
  // 算式：5+5 = 10
  it("远程影像诊断数 = 10 例", () => {
    expect(computeRemoteImagingDiagnosisCountV13(records)).toBe(10);
  });
});

describe("computeRemoteOutpatientCountV13", () => {
  // 算式：20+20 = 40
  it("远程门诊数 = 40 次", () => {
    expect(computeRemoteOutpatientCountV13(records)).toBe(40);
  });
});

describe("telemedicineDetailV13Routes 读路由", () => {
  it("GET /api/v1/telemedicine-detail 路由存在且 auth:true", () => {
    const route = telemedicineDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/telemedicine-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
