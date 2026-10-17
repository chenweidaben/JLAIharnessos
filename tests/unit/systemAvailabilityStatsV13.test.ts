/**
 * 健澜科技 jlmedaios - 系统可用率 V13 单测（M353-C，stats 避让已有 systemAvailabilityV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHisAvailabilityRateV13,
  computeMTTRMinutesV13,
  computeUnplannedDowntimeMinutesV13,
  type SystemAvailabilityStatsRecordV13,
} from "../../src/bff/aggregators/systemAvailabilityStatsV13Aggregator";
import { systemAvailabilityStatsV13Routes } from "../../src/bff/routes/systemAvailabilityStatsV13";

const records: SystemAvailabilityStatsRecordV13[] = [
  { hisAvailableMinutes: 43000, hisTotalMinutes: 43200, mttrMinutes: 30, unplannedDowntimeMinutes: 200 },
  { hisAvailableMinutes: 43000, hisTotalMinutes: 43200, mttrMinutes: 50, unplannedDowntimeMinutes: 200 },
];

describe("computeHisAvailabilityRateV13", () => {
  // 算式：(43000+43000)/(43200+43200) = 86000/86400×100 = 99.54
  it("核心 HIS 月度可用率 = 99.54%", () => {
    expect(computeHisAvailabilityRateV13(records)).toBe(99.54);
  });
  it("空态 → 0", () => {
    expect(computeHisAvailabilityRateV13([])).toBe(0);
  });
});

describe("computeMTTRMinutesV13", () => {
  // 算式：(30+50)/2 = 40.00
  it("故障 MTTR = 40.00 分钟", () => {
    expect(computeMTTRMinutesV13(records)).toBe(40.00);
  });
});

describe("computeUnplannedDowntimeMinutesV13", () => {
  // 算式：200+200 = 400
  it("计划外停机时长 = 400 分钟", () => {
    expect(computeUnplannedDowntimeMinutesV13(records)).toBe(400);
  });
});

describe("systemAvailabilityStatsV13Routes 读路由", () => {
  it("GET /api/v1/system-availability-stats 路由存在且 auth:true", () => {
    const route = systemAvailabilityStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/system-availability-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
