/**
 * 健澜科技 jlmedaios - 网络安全 V13 单测（M363-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClassifiedProtectionComplianceRateV13,
  computeHighRiskVulnerabilityFixRateV13,
  computeNetworkAttackBlockedCountV13,
  type NetworkSecurityRecordV13,
} from "../../src/bff/aggregators/networkSecurityV13Aggregator";
import { networkSecurityV13Routes } from "../../src/bff/routes/networkSecurityV13";

const records: NetworkSecurityRecordV13[] = [
  { attackBlocked: 1000, vulnerabilityFixed: 95, vulnerabilityFound: 100, classifiedCompliant: 9, classifiedRequired: 10 },
  { attackBlocked: 1000, vulnerabilityFixed: 95, vulnerabilityFound: 100, classifiedCompliant: 9, classifiedRequired: 10 },
];

describe("computeNetworkAttackBlockedCountV13", () => {
  // 算式：1000+1000 = 2000
  it("网络攻击拦截数 = 2000", () => {
    expect(computeNetworkAttackBlockedCountV13(records)).toBe(2000);
  });
  it("空态 → 0", () => {
    expect(computeNetworkAttackBlockedCountV13([])).toBe(0);
  });
});

describe("computeHighRiskVulnerabilityFixRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("高危漏洞修复率 = 95.00%", () => {
    expect(computeHighRiskVulnerabilityFixRateV13(records)).toBe(95.00);
  });
});

describe("computeClassifiedProtectionComplianceRateV13", () => {
  // 算式：(9+9)/(10+10) = 18/20×100 = 90.00
  it("等保三级合规率 = 90.00%", () => {
    expect(computeClassifiedProtectionComplianceRateV13(records)).toBe(90.00);
  });
});

describe("networkSecurityV13Routes 读路由", () => {
  it("GET /api/v1/network-security 路由存在且 auth:true", () => {
    const route = networkSecurityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/network-security",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
