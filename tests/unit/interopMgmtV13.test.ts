/**
 * 健澜科技 jlmedaios - 互联互通管理 V13 单测（M409-D，M409 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDataSharingExchangeRateV13,
  computeInterfaceStandardizationRateV13,
  computeInteropMaturityLevelV13,
  type InteropMgmtRecordV13,
} from "../../src/bff/aggregators/interopMgmtV13Aggregator";
import { interopMgmtV13Routes } from "../../src/bff/routes/interopMgmtV13";

const records: InteropMgmtRecordV13[] = [
  { level: 4, standardized: 95, total: 100, shared: 900, should: 1000 },
  { level: 5, standardized: 95, total: 100, shared: 900, should: 1000 },
];

describe("computeInteropMaturityLevelV13", () => {
  // 算式：Math.max(4, 5) = 5
  it("互联互通成熟度测评等级 = 5 级（取最高等级）", () => {
    expect(computeInteropMaturityLevelV13(records)).toBe(5);
  });
  it("空态 → 0", () => {
    expect(computeInteropMaturityLevelV13([])).toBe(0);
  });
});

describe("computeInterfaceStandardizationRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("接口标准化率 = 95.00%", () => {
    expect(computeInterfaceStandardizationRateV13(records)).toBe(95.00);
  });
});

describe("computeDataSharingExchangeRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("数据共享交换率 = 90.00%", () => {
    expect(computeDataSharingExchangeRateV13(records)).toBe(90.00);
  });
});

describe("interopMgmtV13Routes 读路由", () => {
  it("GET /api/v1/interop-mgmt 路由存在且 auth:true", () => {
    const route = interopMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/interop-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
