/**
 * 健澜科技 jlmedaios - 网络安全质量管理 V13 单测（M432-C，-quality 后缀避让旧版 networkSecurityMgmtV13（M409））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNetworkSecurityIncidentCountV13,
  computeNetworkSecurityLevelAssessmentPassRateV13,
  computeNetworkSecurityVulnFixTimelinessRateV13,
  type NetworkSecurityQualityMgmtRecordV13,
} from "../../src/bff/aggregators/networkSecurityQualityMgmtV13Aggregator";
import { networkSecurityQualityMgmtV13Routes } from "../../src/bff/routes/networkSecurityQualityMgmtV13";

const records: NetworkSecurityQualityMgmtRecordV13[] = [
  { incidentCount: 3, timelyFixed: 950, shouldFixVulns: 1000, passedAssessments: 980, totalAssessments: 1000 },
  { incidentCount: 3, timelyFixed: 950, shouldFixVulns: 1000, passedAssessments: 980, totalAssessments: 1000 },
];

describe("computeNetworkSecurityIncidentCountV13", () => {
  // 算式：3 + 3 = 6 次（整数求和类，反向指标，越低越好）
  it("网络安全事件数 = 6 次（整数求和类，反向指标）", () => {
    expect(computeNetworkSecurityIncidentCountV13(records)).toBe(6);
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

describe("computeNetworkSecurityLevelAssessmentPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("等保测评通过率 = 98.00%", () => {
    expect(computeNetworkSecurityLevelAssessmentPassRateV13(records)).toBe(98.00);
  });
});

describe("networkSecurityQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/network-security-quality-mgmt 路由存在且 auth:true", () => {
    const route = networkSecurityQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/network-security-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
