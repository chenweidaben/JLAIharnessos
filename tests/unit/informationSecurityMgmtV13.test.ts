/**
 * 健澜科技 jlmedaios - 信息安全管理 V13 单测（M419-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDataBackupSuccessRateV13,
  computeInfoSecEventResponseHoursV13,
  computeSystemVulnFixTimelyRateV13,
  type InformationSecurityMgmtRecordV13,
} from "../../src/bff/aggregators/informationSecurityMgmtV13Aggregator";
import { informationSecurityMgmtV13Routes } from "../../src/bff/routes/informationSecurityMgmtV13";

const records: InformationSecurityMgmtRecordV13[] = [
  { responseHours: 3.6, backupSuccess: 990, backupTotal: 1000, vulnFixTimely: 950, vulnTotal: 1000 },
  { responseHours: 4.5, backupSuccess: 990, backupTotal: 1000, vulnFixTimely: 950, vulnTotal: 1000 },
];

describe("computeInfoSecEventResponseHoursV13", () => {
  // 算式：(3.6+4.5)/2 = 4.05，Math.ceil(4.05) = 5 小时
  it("信息安全事件响应时间 = 5 小时（Math.ceil）", () => {
    expect(computeInfoSecEventResponseHoursV13(records)).toBe(5);
  });
  it("空态 → 0", () => {
    expect(computeInfoSecEventResponseHoursV13([])).toBe(0);
  });
});

describe("computeDataBackupSuccessRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("数据备份成功率 = 99.00%", () => {
    expect(computeDataBackupSuccessRateV13(records)).toBe(99.00);
  });
});

describe("computeSystemVulnFixTimelyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("系统漏洞修复及时率 = 95.00%", () => {
    expect(computeSystemVulnFixTimelyRateV13(records)).toBe(95.00);
  });
});

describe("informationSecurityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/information-security-mgmt 路由存在且 auth:true", () => {
    const route = informationSecurityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/information-security-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
