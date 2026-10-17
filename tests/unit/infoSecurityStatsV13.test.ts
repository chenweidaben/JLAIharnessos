/**
 * 健澜科技 jlmedaios - 信息安全 V13（统计）单测（M363-A，stats避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDataBackupSuccessRateV13,
  computeInfoSecurityIncidentCountV13,
  computeSystemAvailabilityRateV13,
  type InfoSecurityStatsRecordV13,
} from "../../src/bff/aggregators/infoSecurityStatsV13Aggregator";
import { infoSecurityStatsV13Routes } from "../../src/bff/routes/infoSecurityStatsV13";

const records: InfoSecurityStatsRecordV13[] = [
  { incidentCount: 1, availableHours: 720, requiredHours: 730, backupSuccess: 95, backupTotal: 100 },
  { incidentCount: 1, availableHours: 720, requiredHours: 730, backupSuccess: 95, backupTotal: 100 },
];

describe("computeInfoSecurityIncidentCountV13", () => {
  // 算式：1+1 = 2
  it("信息安全事件起数 = 2", () => {
    expect(computeInfoSecurityIncidentCountV13(records)).toBe(2);
  });
  it("空态 → 0", () => {
    expect(computeInfoSecurityIncidentCountV13([])).toBe(0);
  });
});

describe("computeSystemAvailabilityRateV13", () => {
  // 算式：(720+720)/(730+730) = 1440/1460×100 = 98.63
  it("信息系统可用率 = 98.63%", () => {
    expect(computeSystemAvailabilityRateV13(records)).toBe(98.63);
  });
});

describe("computeDataBackupSuccessRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("数据备份成功率 = 95.00%", () => {
    expect(computeDataBackupSuccessRateV13(records)).toBe(95.00);
  });
});

describe("infoSecurityStatsV13Routes 读路由", () => {
  it("GET /api/v1/info-security-stats 路由存在且 auth:true", () => {
    const route = infoSecurityStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/info-security-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
