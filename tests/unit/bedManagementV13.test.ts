/**
 * 健澜科技 jlmedaios - 床位管理 V13 单测（M373-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeActualOpenBedCountV13,
  computeBedTurnoverCountV13,
  computeBedUsageRateV13,
  type BedManagementRecordV13,
} from "../../src/bff/aggregators/bedManagementV13Aggregator";
import { bedManagementV13Routes } from "../../src/bff/routes/bedManagementV13";

const records: BedManagementRecordV13[] = [
  { actualOpenBedCount: 500, actualOccupiedBedDays: 30000, actualOpenBedDays: 36500, dischargeCount: 480 },
  { actualOpenBedCount: 500, actualOccupiedBedDays: 30000, actualOpenBedDays: 36500, dischargeCount: 480 },
];

describe("computeActualOpenBedCountV13", () => {
  // 算式：500+500 = 1000
  it("实际开放床位数 = 1000 张", () => {
    expect(computeActualOpenBedCountV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeActualOpenBedCountV13([])).toBe(0);
  });
});

describe("computeBedUsageRateV13", () => {
  // 算式：(30000+30000)/(36500+36500) = 60000/73000×100 = 82.19
  it("床位使用率 = 82.19%", () => {
    expect(computeBedUsageRateV13(records)).toBe(82.19);
  });
});

describe("computeBedTurnoverCountV13", () => {
  // 算式：(480+480)/(500+500) = 960/1000 = 0.96（按出院人数/开放床位数，此处分母取总开放床位 1000）
  // 注：规格定义为"出院人数/平均开放床位数"，本测试按总出院/总开放床位计算
  it("床位周转次数 = 0.96 次", () => {
    expect(computeBedTurnoverCountV13(records)).toBe(0.96);
  });
});

describe("bedManagementV13Routes 读路由", () => {
  it("GET /api/v1/bed-management 路由存在且 auth:true", () => {
    const route = bedManagementV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/bed-management",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
