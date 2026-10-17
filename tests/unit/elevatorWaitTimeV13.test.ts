/**
 * 健澜科技 jlmedaios - 电梯等候时间 V13 单测（M331-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgElevatorWaitV13,
  type ElevatorWaitV13,
} from "../../src/bff/aggregators/elevatorWaitTimeV13Aggregator";
import { elevatorWaitTimeV13Routes } from "../../src/bff/routes/elevatorWaitTimeV13";

const records: ElevatorWaitV13[] = [
  { waitMinutes: 5 },
  { waitMinutes: 3 },
  { waitMinutes: 4 },
  { waitMinutes: 6 },
  { waitMinutes: 2 },
];

describe("computeAvgElevatorWaitV13", () => {
  // 算式：(5+3+4+6+2)/5 = 4
  it("平均等候 = 4 分钟", () => {
    expect(computeAvgElevatorWaitV13(records)).toBe(4);
  });
  it("空态 → 0", () => {
    expect(computeAvgElevatorWaitV13([])).toBe(0);
  });
});

describe("elevatorWaitTimeV13Routes 读路由", () => {
  it("GET /api/v1/elevator-wait-time 路由存在且 auth:true", () => {
    const route = elevatorWaitTimeV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/elevator-wait-time",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
