/**
 * 健澜科技 jlmedaios - 信息安全 V13 单测（M353-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAnnualDrillCountV13,
  computeMLPS3ComplianceRateV13,
  computeVulnerabilityPatchRateV13,
  type InfoSecurityRecordV13,
} from "../../src/bff/aggregators/infoSecurityV13Aggregator";
import { infoSecurityV13Routes } from "../../src/bff/routes/infoSecurityV13";

const records: InfoSecurityRecordV13[] = [
  { vulnerabilityFixedOnTime: 19, vulnerabilityHighCount: 20, mlps3CompliantItems: 95, mlps3TotalItems: 100, annualDrillCount: 2 },
  { vulnerabilityFixedOnTime: 18, vulnerabilityHighCount: 20, mlps3CompliantItems: 95, mlps3TotalItems: 100, annualDrillCount: 2 },
];

describe("computeVulnerabilityPatchRateV13", () => {
  // 算式：(19+18)/(20+20) = 37/40×100 = 92.50
  it("高危漏洞修复及时率 = 92.50%", () => {
    expect(computeVulnerabilityPatchRateV13(records)).toBe(92.50);
  });
  it("空态 → 0", () => {
    expect(computeVulnerabilityPatchRateV13([])).toBe(0);
  });
});

describe("computeMLPS3ComplianceRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("等保三级合规率 = 95.00%", () => {
    expect(computeMLPS3ComplianceRateV13(records)).toBe(95.00);
  });
});

describe("computeAnnualDrillCountV13", () => {
  // 算式：2+2 = 4
  it("年度安全演练次数 = 4", () => {
    expect(computeAnnualDrillCountV13(records)).toBe(4);
  });
});

describe("infoSecurityV13Routes 读路由", () => {
  it("GET /api/v1/info-security 路由存在且 auth:true", () => {
    const route = infoSecurityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/info-security",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
