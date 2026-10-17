/**
 * 健澜科技 jlmedaios - 病房管理（细节）V13 单测（M417-D，M417 收官，detail 避让旧版 inpatientBedMgmtV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeWardAverageLosDaysV13,
  computeWardBedTurnoverRateV13,
  computeWardVisitCompanionMgmtPassRateV13,
  type WardMgmtDetailRecordV13,
} from "../../src/bff/aggregators/wardMgmtDetailV13Aggregator";
import { wardMgmtDetailV13Routes } from "../../src/bff/routes/wardMgmtDetailV13";

const records: WardMgmtDetailRecordV13[] = [
  { dischargeTotal: 360, avgBeds: 50, losDays: 8.5, qualified: 950, visitCompanionTotal: 1000 },
  { dischargeTotal: 360, avgBeds: 50, losDays: 9.7, qualified: 950, visitCompanionTotal: 1000 },
];

describe("computeWardBedTurnoverRateV13", () => {
  // 算式：(360+360)/(50+50) = 720/100 = 7.2 次（保留 1 位小数）
  it("病房床位周转次数 = 7.2 次", () => {
    expect(computeWardBedTurnoverRateV13(records)).toBe(7.2);
  });
  it("空态 → 0", () => {
    expect(computeWardBedTurnoverRateV13([])).toBe(0);
  });
});

describe("computeWardAverageLosDaysV13", () => {
  // 算式：(8.5+9.7)/2 = 18.2/2 = 9.1 天（保留 1 位小数）
  it("病房平均住院日 = 9.1 天", () => {
    expect(computeWardAverageLosDaysV13(records)).toBe(9.1);
  });
});

describe("computeWardVisitCompanionMgmtPassRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("病房探视与陪护管理合格率 = 95.00%", () => {
    expect(computeWardVisitCompanionMgmtPassRateV13(records)).toBe(95.00);
  });
});

describe("wardMgmtDetailV13Routes 读路由", () => {
  it("GET /api/v1/ward-mgmt-detail 路由存在且 auth:true", () => {
    const route = wardMgmtDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/ward-mgmt-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
