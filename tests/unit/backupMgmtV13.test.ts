/**
 * 健澜科技 jlmedaios - 备份管理 V13 单测（M379-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBackupSuccessRateV13,
  computeBackupTaskTotalCountV13,
  computeAvgRecoveryTimeHoursV13,
  type BackupMgmtRecordV13,
} from "../../src/bff/aggregators/backupMgmtV13Aggregator";
import { backupMgmtV13Routes } from "../../src/bff/routes/backupMgmtV13";

const records: BackupMgmtRecordV13[] = [
  { backupTaskCount: 50, backupSuccessCount: 49, recoveryCount: 5, recoveryHours: 10 },
  { backupTaskCount: 50, backupSuccessCount: 49, recoveryCount: 5, recoveryHours: 10 },
];

describe("computeBackupTaskTotalCountV13", () => {
  // 算式：50+50 = 100
  it("备份任务总数 = 100 次", () => {
    expect(computeBackupTaskTotalCountV13(records)).toBe(100);
  });
  it("空态 → 0", () => {
    expect(computeBackupTaskTotalCountV13([])).toBe(0);
  });
});

describe("computeBackupSuccessRateV13", () => {
  // 算式：(49+49)/(50+50) = 98/100×100 = 98.00
  it("备份成功率 = 98.00%", () => {
    expect(computeBackupSuccessRateV13(records)).toBe(98.00);
  });
});

describe("computeAvgRecoveryTimeHoursV13", () => {
  // 算式：(10+10)/(5+5) = 20/10 = 2.00
  it("数据恢复平均时长 = 2.00 小时", () => {
    expect(computeAvgRecoveryTimeHoursV13(records)).toBe(2.00);
  });
});

describe("backupMgmtV13Routes 读路由", () => {
  it("GET /api/v1/backup-mgmt 路由存在且 auth:true", () => {
    const route = backupMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/backup-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
