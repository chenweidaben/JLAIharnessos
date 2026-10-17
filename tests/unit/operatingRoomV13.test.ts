/**
 * 健澜科技 jlmedaios - 手术室利用率 V13 单测（M331-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOperatingRoomUtilizationV13,
  type OperatingRoomV13,
} from "../../src/bff/aggregators/operatingRoomV13Aggregator";
import { operatingRoomV13Routes } from "../../src/bff/routes/operatingRoomV13";

const rooms: OperatingRoomV13[] = [
  { roomName: "一号手术间", usedHours: 160, availableHours: 200 },
  { roomName: "二号手术间", usedHours: 180, availableHours: 200 },
  { roomName: "三号手术间", usedHours: 100, availableHours: 200 },
];

describe("computeOperatingRoomUtilizationV13", () => {
  // 算式：一号160/200=80% / 二号180/200=90% / 三号100/200=50%
  it("一号手术间 = 80%", () => {
    const result = computeOperatingRoomUtilizationV13(rooms);
    expect(result.length).toBe(3);
    expect(result[0].roomName).toBe("一号手术间");
    expect(result[0].utilizationRate).toBe(80);
  });
  it("空态 → []", () => {
    expect(computeOperatingRoomUtilizationV13([]).length).toBe(0);
  });
});

describe("operatingRoomV13Routes 读路由", () => {
  it("GET /api/v1/operating-room 路由存在且 auth:true", () => {
    const route = operatingRoomV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/operating-room",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
