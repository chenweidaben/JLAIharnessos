/**
 * 健澜科技 jlmedaios - 员工净流失率 V13 单测（M330-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNetTurnoverRateV13,
  countNewHiresV13,
  countResignationsV13,
  type TurnoverRecordV13,
} from "../../src/bff/aggregators/staffTurnoverNetV13Aggregator";
import { staffTurnoverNetV13Routes } from "../../src/bff/routes/staffTurnoverNetV13";

const records: TurnoverRecordV13[] = [
  { eventType: "resignation" },
  { eventType: "resignation" },
  { eventType: "resignation" },
  { eventType: "new_hire" },
];

describe("countResignationsV13", () => {
  // 算式：3 个离职
  it("离职人数 = 3", () => {
    expect(countResignationsV13(records)).toBe(3);
  });
  it("空态 → 0", () => {
    expect(countResignationsV13([])).toBe(0);
  });
});

describe("countNewHiresV13", () => {
  // 算式：1 个入职
  it("入职人数 = 1", () => {
    expect(countNewHiresV13(records)).toBe(1);
  });
});

describe("computeNetTurnoverRateV13", () => {
  // 算式：(1-3)/100×100 = -2
  it("净流失率 = -2%", () => {
    expect(computeNetTurnoverRateV13(3, 1, 100)).toBe(-2);
  });
});

describe("staffTurnoverNetV13Routes 读路由", () => {
  it("GET /api/v1/staff-turnover-net 路由存在且 auth:true", () => {
    const route = staffTurnoverNetV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/staff-turnover-net",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
