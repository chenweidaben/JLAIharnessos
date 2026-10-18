/**
 * 健澜科技 jlmedaios - 病历质控质量监控大盘 V14 单测（M474-D，M474 收官）
 *
 * 测试 buildMonitorBoard 组装、buildRealTimeStats 降序排列、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMonitorBoard,
  buildRealTimeStats,
  type RealTimeEventV14,
} from "../../src/bff/aggregators/emrQcMonitorBoardV14Aggregator";
import { emrQcMonitorBoardV14Routes } from "../../src/bff/routes/emrQcMonitorBoardV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildMonitorBoard 组装", () => {
  // 手算：todayReviewed=45, todayPending=8, weekPassRate=92, alertCount=2 → 正确组装
  it("todayReviewed=45, todayPending=8, weekPassRate=92, alertCount=2 → 正确组装", () => {
    const board = buildMonitorBoard({
      todayReviewed: 45,
      todayPending: 8,
      weekPassRate: 92,
      alertCount: 2,
    });
    expect(board.todayReviewed).toBe(45);
    expect(board.todayPending).toBe(8);
    expect(board.weekPassRate).toBe(92);
    expect(board.alertCount).toBe(2);
  });
});

describe("buildMonitorBoard 全零", () => {
  // 手算：所有值为 0 → 正确组装（全零）
  it("所有值为 0 → 正确组装（全零）", () => {
    const board = buildMonitorBoard({
      todayReviewed: 0,
      todayPending: 0,
      weekPassRate: 0,
      alertCount: 0,
    });
    expect(board.todayReviewed).toBe(0);
    expect(board.alertCount).toBe(0);
  });
});

describe("buildRealTimeStats 降序", () => {
  // 手算：[{action:'审核',count:10},{action:'退回',count:5},{action:'通过',count:15}]
  // 按 count 降序：15 > 10 > 5 → 通过15 / 审核10 / 退回5
  it("[{action:'审核',count:10},{action:'退回',count:5},{action:'通过',count:15}] → 按 count 降序：通过15/审核10/退回5", () => {
    const events: RealTimeEventV14[] = [
      { action: "审核", count: 10 },
      { action: "退回", count: 5 },
      { action: "通过", count: 15 },
    ];
    const sorted = buildRealTimeStats(events);
    expect(sorted[0]?.action).toBe("通过");
    expect(sorted[0]?.count).toBe(15);
    expect(sorted[2]?.action).toBe("退回");
    expect(sorted[2]?.count).toBe(5);
  });
});

describe("buildRealTimeStats 空数组", () => {
  // 手算：空数组 → 返回空数组
  it("空数组 → 返回空数组", () => {
    expect(buildRealTimeStats([])).toEqual([]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-monitor-board auth:true", () => {
    const def = (emrQcMonitorBoardV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-monitor-board");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
