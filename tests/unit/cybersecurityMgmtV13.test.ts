/**
 * 健澜科技 jlmedaios - 网络安全管理 V13 单测（M409-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClassifiedProtectionTestPassRateV13,
  computeSecurityIncidentResponseTimeV13,
  computeVulnerabilityFixTimelyRateV13,
  type CybersecurityMgmtRecordV13,
} from "../../src/bff/aggregators/cybersecurityMgmtV13Aggregator";
import { cybersecurityMgmtV13Routes } from "../../src/bff/routes/cybersecurityMgmtV13";

const records: CybersecurityMgmtRecordV13[] = [
  { passed: 95, total: 100, fixed: 980, vulnTotal: 1000, responseHours: 2.5 },
  { passed: 95, total: 100, fixed: 980, vulnTotal: 1000, responseHours: 2.5 },
];

describe("computeClassifiedProtectionTestPassRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("等保测评通过率 = 95.00%", () => {
    expect(computeClassifiedProtectionTestPassRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeClassifiedProtectionTestPassRateV13([])).toBe(0);
  });
});

describe("computeVulnerabilityFixTimelyRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("漏洞修复及时率 = 98.00%", () => {
    expect(computeVulnerabilityFixTimelyRateV13(records)).toBe(98.00);
  });
});

describe("computeSecurityIncidentResponseTimeV13", () => {
  // 算式：(2.5+2.5)/2 = 2.5 → Math.ceil(2.5) = 3
  it("安全事件响应时长 = 3 小时（Math.ceil 向上取整）", () => {
    expect(computeSecurityIncidentResponseTimeV13(records)).toBe(3);
  });
});

describe("cybersecurityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/cybersecurity-mgmt 路由存在且 auth:true", () => {
    const route = cybersecurityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/cybersecurity-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
