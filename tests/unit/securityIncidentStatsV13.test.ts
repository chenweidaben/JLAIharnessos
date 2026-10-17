/**
 * 健澜科技 jlmedaios - 安全事件统计 V13 单测（M379-A，stats 避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgResponseTimeHoursV13,
  computeIncidentResolutionRateV13,
  computeSecurityIncidentCountV13,
  type SecurityIncidentRecordV13,
} from "../../src/bff/aggregators/securityIncidentStatsV13Aggregator";
import { securityIncidentStatsV13Routes } from "../../src/bff/routes/securityIncidentStatsV13";

const records: SecurityIncidentRecordV13[] = [
  { incidentCount: 10, responseHours: 24, resolvedCount: 9 },
  { incidentCount: 10, responseHours: 24, resolvedCount: 9 },
];

describe("computeSecurityIncidentCountV13", () => {
  // 算式：10+10 = 20
  it("安全事件数 = 20 起", () => {
    expect(computeSecurityIncidentCountV13(records)).toBe(20);
  });
  it("空态 → 0", () => {
    expect(computeSecurityIncidentCountV13([])).toBe(0);
  });
});

describe("computeAvgResponseTimeHoursV13", () => {
  // 算式：(24+24)/(10+10) = 48/20 = 2.40
  it("事件平均响应时长 = 2.40 小时", () => {
    expect(computeAvgResponseTimeHoursV13(records)).toBe(2.40);
  });
});

describe("computeIncidentResolutionRateV13", () => {
  // 算式：(9+9)/(10+10) = 18/20×100 = 90.00
  it("事件处置完成率 = 90.00%", () => {
    expect(computeIncidentResolutionRateV13(records)).toBe(90.00);
  });
});

describe("securityIncidentStatsV13Routes 读路由", () => {
  it("GET /api/v1/security-incident-stats 路由存在且 auth:true", () => {
    const route = securityIncidentStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/security-incident-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
