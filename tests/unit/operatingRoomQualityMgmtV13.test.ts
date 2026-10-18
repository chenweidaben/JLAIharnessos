/**
 * 健澜科技 jlmedaios - 手术室质量管理 V13 单测（M429-C，-quality 后缀避让旧版 operatingRoomMgmtV13（M417））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOperatingRoomConsumableWasteRateV13,
  computeOperatingRoomContinuousSurgeryMinutesV13,
  computeOperatingRoomSterilePassRateV13,
  type OperatingRoomQualityMgmtRecordV13,
} from "../../src/bff/aggregators/operatingRoomQualityMgmtV13Aggregator";
import { operatingRoomQualityMgmtV13Routes } from "../../src/bff/routes/operatingRoomQualityMgmtV13";

const records: OperatingRoomQualityMgmtRecordV13[] = [
  { sterilePass: 980, sterileTotal: 1000, continuousMinutes: 25.5, wasteAmount: 500, totalAmount: 10000 },
  { sterilePass: 980, sterileTotal: 1000, continuousMinutes: 34.3, wasteAmount: 500, totalAmount: 10000 },
];

describe("computeOperatingRoomSterilePassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("手术室无菌合格率 = 98.00%", () => {
    expect(computeOperatingRoomSterilePassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeOperatingRoomSterilePassRateV13([])).toBe(0);
  });
});

describe("computeOperatingRoomContinuousSurgeryMinutesV13", () => {
  // 算式：avg = (25.5+34.3)/2 = 29.9，Math.ceil(29.9) = 30 分钟（Math.ceil 整分钟）
  it("手术室连台时间 = 30 分钟（Math.ceil 整分钟）", () => {
    expect(computeOperatingRoomContinuousSurgeryMinutesV13(records)).toBe(30);
  });
});

describe("computeOperatingRoomConsumableWasteRateV13", () => {
  // 算式：(500+500)/(10000+10000)×100 = 1000/20000×100 = 5.00%（反向指标）
  it("手术室耗材浪费率 = 5.00%（反向指标）", () => {
    expect(computeOperatingRoomConsumableWasteRateV13(records)).toBe(5.00);
  });
});

describe("operatingRoomQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/operating-room-quality-mgmt 路由存在且 auth:true", () => {
    const route = operatingRoomQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/operating-room-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
