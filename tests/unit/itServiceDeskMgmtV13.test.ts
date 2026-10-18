/**
 * 健澜科技 jlmedaios - 信息运维服务管理 V13 单测（M446-D，M446 收官，信息化建设与数据安全管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeItServiceDeskResolutionRateV13,
  computeItServiceDeskResponseTimelinessRateV13,
  computeItServiceDeskTerminalRepairMinutesV13,
  type ItServiceDeskMgmtRecordV13,
} from "../../src/bff/aggregators/itServiceDeskMgmtV13Aggregator";
import { itServiceDeskMgmtV13Routes } from "../../src/bff/routes/itServiceDeskMgmtV13";

const records: ItServiceDeskMgmtRecordV13[] = [
  { timelyResponse: 950, totalTicket: 1000, resolved: 900, avgRepairMinutes: 15.5 },
  { timelyResponse: 950, totalTicket: 1000, resolved: 900, avgRepairMinutes: 15.5 },
];

describe("computeItServiceDeskResponseTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("工单响应及时率 = 95.00%", () => {
    expect(computeItServiceDeskResponseTimelinessRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeItServiceDeskResponseTimelinessRateV13([])).toBe(0);
  });
});

describe("computeItServiceDeskResolutionRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("工单解决率 = 90.00%", () => {
    expect(computeItServiceDeskResolutionRateV13(records)).toBe(90.00);
  });
});

describe("computeItServiceDeskTerminalRepairMinutesV13", () => {
  // 算式：avg=(15.5+15.5)/2=15.5，Math.ceil(15.5) = 16 分钟
  it("终端故障修复时长 = 16 分钟（平均修复时长 Math.ceil 整分钟）", () => {
    expect(computeItServiceDeskTerminalRepairMinutesV13(records)).toBe(16);
  });
});

describe("itServiceDeskMgmtV13Routes 读路由", () => {
  it("GET /api/v1/it-service-desk-mgmt 路由存在且 auth:true", () => {
    const route = itServiceDeskMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/it-service-desk-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
