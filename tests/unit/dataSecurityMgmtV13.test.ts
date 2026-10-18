/**
 * 健澜科技 jlmedaios - 数据安全管理 V13 单测（M446-B，信息化建设与数据安全管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDataSecurityClassificationCoverageRateV13,
  computeDataSecurityIncidentCountV13,
  computeDataSecurityMaskingRateV13,
  type DataSecurityMgmtRecordV13,
} from "../../src/bff/aggregators/dataSecurityMgmtV13Aggregator";
import { dataSecurityMgmtV13Routes } from "../../src/bff/routes/dataSecurityMgmtV13";

const records: DataSecurityMgmtRecordV13[] = [
  { classified: 950, totalAssets: 1000, masked: 900, totalSensitive: 1000, securityIncident: true },
  { classified: 950, totalAssets: 1000, masked: 900, totalSensitive: 1000, securityIncident: true },
];

describe("computeDataSecurityClassificationCoverageRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("数据分级分类覆盖率 = 95.00%", () => {
    expect(computeDataSecurityClassificationCoverageRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDataSecurityClassificationCoverageRateV13([])).toBe(0);
  });
});

describe("computeDataSecurityMaskingRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("敏感数据脱敏率 = 90.00%", () => {
    expect(computeDataSecurityMaskingRateV13(records)).toBe(90.00);
  });
});

describe("computeDataSecurityIncidentCountV13", () => {
  // 算式：records.filter(r => r.securityIncident).length = 2 次（两条都 securityIncident=true，反向，越低越好）
  it("数据安全事件数 = 2 次（反向，越低越好）", () => {
    expect(computeDataSecurityIncidentCountV13(records)).toBe(2);
  });
});

describe("dataSecurityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/data-security-mgmt 路由存在且 auth:true", () => {
    const route = dataSecurityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/data-security-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
