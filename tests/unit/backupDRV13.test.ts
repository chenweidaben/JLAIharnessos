/**
 * 健澜科技 jlmedaios - 备份与容灾 V13 单测（M353-D，M353 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBackupSuccessRateV13,
  computeRPOComplianceRateV13,
  computeRTOComplianceRateV13,
  type BackupDRRecordV13,
} from "../../src/bff/aggregators/backupDRV13Aggregator";
import { backupDRV13Routes } from "../../src/bff/routes/backupDRV13";

const records: BackupDRRecordV13[] = [
  { backupSuccessCount: 99, backupTotalCount: 100, rtoPassedCount: 5, rtoTestedCount: 5, rpoPassedCount: 4, rpoTestedCount: 5 },
  { backupSuccessCount: 98, backupTotalCount: 100, rtoPassedCount: 5, rtoTestedCount: 5, rpoPassedCount: 5, rpoTestedCount: 5 },
];

describe("computeBackupSuccessRateV13", () => {
  // 算式：(99+98)/(100+100) = 197/200×100 = 98.50
  it("备份成功率 = 98.50%", () => {
    expect(computeBackupSuccessRateV13(records)).toBe(98.50);
  });
  it("空态 → 0", () => {
    expect(computeBackupSuccessRateV13([])).toBe(0);
  });
});

describe("computeRTOComplianceRateV13", () => {
  // 算式：(5+5)/(5+5) = 10/10×100 = 100.00
  it("RTO 达标率 = 100.00%", () => {
    expect(computeRTOComplianceRateV13(records)).toBe(100.00);
  });
});

describe("computeRPOComplianceRateV13", () => {
  // 算式：(4+5)/(5+5) = 9/10×100 = 90.00
  it("RPO 达标率 = 90.00%", () => {
    expect(computeRPOComplianceRateV13(records)).toBe(90.00);
  });
});

describe("backupDRV13Routes 读路由", () => {
  it("GET /api/v1/backup-dr 路由存在且 auth:true", () => {
    const route = backupDRV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/backup-dr",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
