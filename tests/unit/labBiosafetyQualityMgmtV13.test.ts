/**
 * 健澜科技 jlmedaios - 实验室生物安全质量管理 V13 单测（M436-C，院感安全环保质量管理深化组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeLabBiosafetyCabinetQualifiedRateV13,
  computeLabBiosafetyIncidentCountV13,
  computeLabBiosafetyStrainManagementComplianceRateV13,
  type LabBiosafetyQualityMgmtRecordV13,
} from "../../src/bff/aggregators/labBiosafetyQualityMgmtV13Aggregator";
import { labBiosafetyQualityMgmtV13Routes } from "../../src/bff/routes/labBiosafetyQualityMgmtV13";

const records: LabBiosafetyQualityMgmtRecordV13[] = [
  { incidentCount: 2, qualifiedCabinets: 980, totalCabinets: 1000, compliantItems: 950, totalItems: 1000 },
  { incidentCount: 2, qualifiedCabinets: 980, totalCabinets: 1000, compliantItems: 950, totalItems: 1000 },
];

describe("computeLabBiosafetyIncidentCountV13", () => {
  // 算式：2 + 2 = 4 次（整数求和类，反向，越低越好）
  it("生物安全事件数 = 4 次（整数求和类，反向，越低越好）", () => {
    expect(computeLabBiosafetyIncidentCountV13(records)).toBe(4);
  });
  it("空态 → 0", () => {
    expect(computeLabBiosafetyIncidentCountV13([])).toBe(0);
  });
});

describe("computeLabBiosafetyCabinetQualifiedRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("生物安全柜合格率 = 98.00%", () => {
    expect(computeLabBiosafetyCabinetQualifiedRateV13(records)).toBe(98.00);
  });
});

describe("computeLabBiosafetyStrainManagementComplianceRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("菌毒种管理合规率 = 95.00%", () => {
    expect(computeLabBiosafetyStrainManagementComplianceRateV13(records)).toBe(95.00);
  });
});

describe("labBiosafetyQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/lab-biosafety-quality-mgmt 路由存在且 auth:true", () => {
    const route = labBiosafetyQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/lab-biosafety-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
