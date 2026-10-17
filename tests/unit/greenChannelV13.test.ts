/**
 * 健澜科技 jlmedaios - 绿色通道 V13 单测（M372-D，M372 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeGreenChannelAverageDurationV13,
  computeGreenChannelRescueSuccessRateV13,
  computeGreenChannelStartCountV13,
  type GreenChannelRecordV13,
} from "../../src/bff/aggregators/greenChannelV13Aggregator";
import { greenChannelV13Routes } from "../../src/bff/routes/greenChannelV13";

const records: GreenChannelRecordV13[] = [
  { startCount: 10, averageDuration: 30, rescueCount: 100, rescueSuccessCount: 95 },
  { startCount: 10, averageDuration: 30, rescueCount: 100, rescueSuccessCount: 95 },
];

describe("computeGreenChannelStartCountV13", () => {
  // 算式：10+10 = 20
  it("绿色通道启动次数 = 20", () => {
    expect(computeGreenChannelStartCountV13(records)).toBe(20);
  });
  it("空态 → 0", () => {
    expect(computeGreenChannelStartCountV13([])).toBe(0);
  });
});

describe("computeGreenChannelAverageDurationV13", () => {
  // 算式：(30+30)/2 = 30.00
  it("绿色通道平均耗时 = 30.00 分钟", () => {
    expect(computeGreenChannelAverageDurationV13(records)).toBe(30.00);
  });
});

describe("computeGreenChannelRescueSuccessRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("绿色通道抢救成功率 = 95.00%", () => {
    expect(computeGreenChannelRescueSuccessRateV13(records)).toBe(95.00);
  });
});

describe("greenChannelV13Routes 读路由", () => {
  it("GET /api/v1/green-channel 路由存在且 auth:true", () => {
    const route = greenChannelV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/green-channel",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
