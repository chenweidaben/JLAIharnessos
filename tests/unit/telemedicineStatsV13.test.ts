/**
 * 健澜科技 jlmedaios - 远程医疗（统计）V13 单测（M367-B，stats避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeRemoteConsultationCountV13,
  computeRemoteImagingDiagnosisCountV13,
  computeRemoteTeachingCountV13,
  type TelemedicineStatsRecordV13,
} from "../../src/bff/aggregators/telemedicineStatsV13Aggregator";
import { telemedicineStatsV13Routes } from "../../src/bff/routes/telemedicineStatsV13";

const records: TelemedicineStatsRecordV13[] = [
  { remoteConsultationCount: 10, remoteImagingDiagnosisCount: 15, remoteTeachingCount: 5 },
  { remoteConsultationCount: 20, remoteImagingDiagnosisCount: 25, remoteTeachingCount: 5 },
];

describe("computeRemoteConsultationCountV13", () => {
  // 算式：10+20 = 30
  it("远程会诊次数 = 30", () => {
    expect(computeRemoteConsultationCountV13(records)).toBe(30);
  });
  it("空态 → 0", () => {
    expect(computeRemoteConsultationCountV13([])).toBe(0);
  });
});

describe("computeRemoteImagingDiagnosisCountV13", () => {
  // 算式：15+25 = 40
  it("远程影像诊断数 = 40", () => {
    expect(computeRemoteImagingDiagnosisCountV13(records)).toBe(40);
  });
});

describe("computeRemoteTeachingCountV13", () => {
  // 算式：5+5 = 10
  it("远程教学次数 = 10", () => {
    expect(computeRemoteTeachingCountV13(records)).toBe(10);
  });
});

describe("telemedicineStatsV13Routes 读路由", () => {
  it("GET /api/v1/telemedicine-stats 路由存在且 auth:true", () => {
    const route = telemedicineStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/telemedicine-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
