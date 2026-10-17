/**
 * 健澜科技 jlmedaios - 环境管理 V13 单测（M377-D，M377 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEnvironmentMonitoringPassRateV13,
  computeMedicalWasteDisposalCountV13,
  computeSewageTreatmentComplianceRateV13,
  type EnvironmentMgmtRecordV13,
} from "../../src/bff/aggregators/environmentMgmtV13Aggregator";
import { environmentMgmtV13Routes } from "../../src/bff/routes/environmentMgmtV13";

const records: EnvironmentMgmtRecordV13[] = [
  { medicalWasteCount: 5, sewageTestCount: 100, sewagePassCount: 98, envMonitorCount: 100, envMonitorPassCount: 99 },
  { medicalWasteCount: 5, sewageTestCount: 100, sewagePassCount: 98, envMonitorCount: 100, envMonitorPassCount: 99 },
];

describe("computeMedicalWasteDisposalCountV13", () => {
  // 算式：5+5 = 10
  it("医疗废物处置量 = 10 吨", () => {
    expect(computeMedicalWasteDisposalCountV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeMedicalWasteDisposalCountV13([])).toBe(0);
  });
});

describe("computeSewageTreatmentComplianceRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("污水处理达标率 = 98.00%", () => {
    expect(computeSewageTreatmentComplianceRateV13(records)).toBe(98.00);
  });
});

describe("computeEnvironmentMonitoringPassRateV13", () => {
  // 算式：(99+99)/(100+100) = 198/200×100 = 99.00
  it("环境监测合格率 = 99.00%", () => {
    expect(computeEnvironmentMonitoringPassRateV13(records)).toBe(99.00);
  });
});

describe("environmentMgmtV13Routes 读路由", () => {
  it("GET /api/v1/environment-mgmt 路由存在且 auth:true", () => {
    const route = environmentMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/environment-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
