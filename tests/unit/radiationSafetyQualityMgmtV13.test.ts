/**
 * 健澜科技 jlmedaios - 辐射安全质量管理 V13 单测（M436-B，院感安全环保质量管理深化组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeRadiationIncidentCountV13,
  computeRadiationMonitoringQualifiedRateV13,
  computeRadiationProtectionCompletenessRateV13,
  type RadiationSafetyQualityMgmtRecordV13,
} from "../../src/bff/aggregators/radiationSafetyQualityMgmtV13Aggregator";
import { radiationSafetyQualityMgmtV13Routes } from "../../src/bff/routes/radiationSafetyQualityMgmtV13";

const records: RadiationSafetyQualityMgmtRecordV13[] = [
  { incidentCount: 2, qualifiedMonitoring: 980, totalMonitoring: 1000, intactProtection: 950, totalProtection: 1000 },
  { incidentCount: 2, qualifiedMonitoring: 980, totalMonitoring: 1000, intactProtection: 950, totalProtection: 1000 },
];

describe("computeRadiationIncidentCountV13", () => {
  // 算式：2 + 2 = 4 次（整数求和类，反向，越低越好）
  it("辐射事件数 = 4 次（整数求和类，反向，越低越好）", () => {
    expect(computeRadiationIncidentCountV13(records)).toBe(4);
  });
  it("空态 → 0", () => {
    expect(computeRadiationIncidentCountV13([])).toBe(0);
  });
});

describe("computeRadiationMonitoringQualifiedRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("辐射监测合格率 = 98.00%", () => {
    expect(computeRadiationMonitoringQualifiedRateV13(records)).toBe(98.00);
  });
});

describe("computeRadiationProtectionCompletenessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("辐射防护完好率 = 95.00%", () => {
    expect(computeRadiationProtectionCompletenessRateV13(records)).toBe(95.00);
  });
});

describe("radiationSafetyQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/radiation-safety-quality-mgmt 路由存在且 auth:true", () => {
    const route = radiationSafetyQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/radiation-safety-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
