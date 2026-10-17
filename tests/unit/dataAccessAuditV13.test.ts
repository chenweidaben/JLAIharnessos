/**
 * 健澜科技 jlmedaios - 数据访问审计异常 V13 单测（M318-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  detectAfterHoursAccessV13,
  detectBulkExportV13,
  detectOverAccessV13,
  type DataAccessLogV13,
} from "../../src/bff/aggregators/dataAccessAuditV13Aggregator";
import { dataAccessAuditV13Routes } from "../../src/bff/routes/dataAccessAuditV13";

const logs: DataAccessLogV13[] = [
  { logId: "l1", userId: "u1", accessHour: 10, hasPermission: true, exportRecordCount: 100 },
  { logId: "l2", userId: "u1", accessHour: 11, hasPermission: true, exportRecordCount: 200 },
  { logId: "l3", userId: "u1", accessHour: 14, hasPermission: true, exportRecordCount: 300 },
  { logId: "l4", userId: "u1", accessHour: 15, hasPermission: true, exportRecordCount: 500 },
  { logId: "l5", userId: "u1", accessHour: 22, hasPermission: true, exportRecordCount: 100 },
  { logId: "l6", userId: "u1", accessHour: 23, hasPermission: true, exportRecordCount: 200 },
  { logId: "l7", userId: "u1", accessHour: 7, hasPermission: true, exportRecordCount: 300 },
  { logId: "l8", userId: "u1", accessHour: 10, hasPermission: false, exportRecordCount: 100 },
  { logId: "l9", userId: "u1", accessHour: 11, hasPermission: false, exportRecordCount: 200 },
  { logId: "l10", userId: "u1", accessHour: 14, hasPermission: true, exportRecordCount: 5000 },
];

describe("detectAfterHoursAccessV13", () => {
  // 算式：accessHour>=18 或 <8 = l5(22) + l6(23) + l7(7) = 3
  it("非工作时间 = 3（l5/l6/l7）", () => {
    expect(detectAfterHoursAccessV13(logs).length).toBe(3);
  });
  it("空态 → []", () => {
    expect(detectAfterHoursAccessV13([]).length).toBe(0);
  });
});

describe("detectOverAccessV13", () => {
  // 算式：hasPermission=false = l8 + l9 = 2
  it("越权访问 = 2（l8/l9）", () => {
    expect(detectOverAccessV13(logs).length).toBe(2);
  });
});

describe("detectBulkExportV13", () => {
  // 算式：exportRecordCount>1000 = l10(5000) = 1
  it("批量导出 = 1（l10）", () => {
    expect(detectBulkExportV13(logs, 1000).length).toBe(1);
  });
});

describe("dataAccessAuditV13Routes 读路由", () => {
  it("GET /api/v1/data-access-audit 路由存在且 auth:true", () => {
    const route = dataAccessAuditV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/data-access-audit",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
