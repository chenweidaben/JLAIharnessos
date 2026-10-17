/**
 * 健澜科技 jlmedaios - 信息安全事件 V13 单测（M344-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgResponseMinutesV13,
  computeSevereIncidentCountV13,
  computeTotalIncidentCountV13,
  type SecurityIncidentRecordV13,
} from "../../src/bff/aggregators/securityIncidentV13Aggregator";
import { securityIncidentV13Routes } from "../../src/bff/routes/securityIncidentV13";

const records: SecurityIncidentRecordV13[] = [
  { severity: "severe", responseMinutes: 5 },
  { severity: "moderate", responseMinutes: 10 },
  { severity: "severe", responseMinutes: 15 },
];

describe("computeTotalIncidentCountV13", () => {
  // 算式：records.length = 3
  it("本月事件数 = 3", () => {
    expect(computeTotalIncidentCountV13(records)).toBe(3);
  });
  it("空态 → 0", () => {
    expect(computeTotalIncidentCountV13([])).toBe(0);
  });
});

describe("computeSevereIncidentCountV13", () => {
  // 算式：severity=severe 的记录数 = 2
  it("严重事件数 = 2", () => {
    expect(computeSevereIncidentCountV13(records)).toBe(2);
  });
});

describe("computeAvgResponseMinutesV13", () => {
  // 算式：(5+10+15)/3 = 30/3 = 10.0
  it("平均响应时长 = 10.0 分钟", () => {
    expect(computeAvgResponseMinutesV13(records)).toBe(10.0);
  });
});

describe("securityIncidentV13Routes 读路由", () => {
  it("GET /api/v1/security-incident 路由存在且 auth:true", () => {
    const route = securityIncidentV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/security-incident",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
