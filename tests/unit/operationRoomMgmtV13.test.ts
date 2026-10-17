/**
 * 健澜科技 jlmedaios - 手术室管理 V13 单测（M417-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOperationRoomAverageWaitMinutesV13,
  computeOperationRoomEnvironmentSamplingPassRateV13,
  computeOperationRoomUtilizationRateV13,
  type OperationRoomMgmtRecordV13,
} from "../../src/bff/aggregators/operationRoomMgmtV13Aggregator";
import { operationRoomMgmtV13Routes } from "../../src/bff/routes/operationRoomMgmtV13";

const records: OperationRoomMgmtRecordV13[] = [
  { waitMinutes: 12.5, usedHours: 480, shouldUseHours: 600, sampleQualified: 95, sampleTotal: 100 },
  { waitMinutes: 14.3, usedHours: 480, shouldUseHours: 600, sampleQualified: 95, sampleTotal: 100 },
];

describe("computeOperationRoomAverageWaitMinutesV13", () => {
  // 算式：(12.5+14.3)/2 = 26.8/2 = 13.4 分钟（保留 1 位小数）
  it("手术室接台平均等待分钟 = 13.4 分钟", () => {
    expect(computeOperationRoomAverageWaitMinutesV13(records)).toBe(13.4);
  });
  it("空态 → 0", () => {
    expect(computeOperationRoomAverageWaitMinutesV13([])).toBe(0);
  });
});

describe("computeOperationRoomUtilizationRateV13", () => {
  // 算式：(480+480)/(600+600)×100 = 960/1200×100 = 80.00
  it("手术间利用率 = 80.00%", () => {
    expect(computeOperationRoomUtilizationRateV13(records)).toBe(80.00);
  });
});

describe("computeOperationRoomEnvironmentSamplingPassRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("手术室环境采样合格率 = 95.00%", () => {
    expect(computeOperationRoomEnvironmentSamplingPassRateV13(records)).toBe(95.00);
  });
});

describe("operationRoomMgmtV13Routes 读路由", () => {
  it("GET /api/v1/operation-room-mgmt 路由存在且 auth:true", () => {
    const route = operationRoomMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/operation-room-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
