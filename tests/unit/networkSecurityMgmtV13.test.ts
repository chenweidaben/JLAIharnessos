/**
 * 健澜科技 jlmedaios - 网络安全防护管理 V13 单测（M446-C，信息化建设与数据安全管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNetworkSecurityDengBaoPassRateV13,
  computeNetworkSecurityIncidentCountV13,
  computeNetworkSecurityVulnFixTimelinessRateV13,
  type NetworkSecurityMgmtRecordV13,
} from "../../src/bff/aggregators/networkSecurityMgmtV13Aggregator";
import { networkSecurityMgmtV13Routes } from "../../src/bff/routes/networkSecurityMgmtV13";

const records: NetworkSecurityMgmtRecordV13[] = [
  { securityIncident: true, timelyFixed: 950, totalVuln: 1000, passed: 900, totalAssessment: 1000 },
  { securityIncident: true, timelyFixed: 950, totalVuln: 1000, passed: 900, totalAssessment: 1000 },
];

describe("computeNetworkSecurityIncidentCountV13", () => {
  // 算式：records.filter(r => r.securityIncident).length = 2 次（两条都 securityIncident=true，反向，越低越好）
  it("网络安全事件数 = 2 次（反向，越低越好）", () => {
    expect(computeNetworkSecurityIncidentCountV13(records)).toBe(2);
  });
  it("空态 → 0", () => {
    expect(computeNetworkSecurityIncidentCountV13([])).toBe(0);
  });
});

describe("computeNetworkSecurityVulnFixTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("漏洞修复及时率 = 95.00%", () => {
    expect(computeNetworkSecurityVulnFixTimelinessRateV13(records)).toBe(95.00);
  });
});

describe("computeNetworkSecurityDengBaoPassRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("等保测评通过率 = 90.00%", () => {
    expect(computeNetworkSecurityDengBaoPassRateV13(records)).toBe(90.00);
  });
});

describe("networkSecurityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/network-security-mgmt 路由存在且 auth:true", () => {
    const route = networkSecurityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/network-security-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
