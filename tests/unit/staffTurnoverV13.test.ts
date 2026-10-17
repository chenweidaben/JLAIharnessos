/**
 * 健澜科技 jlmedaios - 人员流失率 V13 单测（M317-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMonthlyTurnoverRateV13,
  groupTurnoverByDeptV13,
  identifyHighTurnoverDeptsV13,
  type TurnoverRecordV13,
} from "../../src/bff/aggregators/staffTurnoverV13Aggregator";
import { staffTurnoverV13Routes } from "../../src/bff/routes/staffTurnoverV13";

const records: TurnoverRecordV13[] = [
  { dept: "cardio", headcountAtMonthStart: 20, resignationCount: 2 },
  { dept: "ortho", headcountAtMonthStart: 30, resignationCount: 1 },
  { dept: "icu", headcountAtMonthStart: 25, resignationCount: 1 },
  { dept: "ped", headcountAtMonthStart: 25, resignationCount: 1 },
];

describe("computeMonthlyTurnoverRateV13", () => {
  // 算式：月初总人数 = 20+30+25+25 = 100；本月离职 = 2+1+1+1 = 5
  // monthlyRate = 5/100×100 = 5
  it("monthlyRate = 5", () => {
    expect(computeMonthlyTurnoverRateV13(records)).toBe(5);
  });
  it("空态 → 0", () => {
    expect(computeMonthlyTurnoverRateV13([])).toBe(0);
  });
});

describe("groupTurnoverByDeptV13", () => {
  // 算式：cardio 2/20×100 = 10；ortho 1/30×100 = 3.3
  it("cardio=10, ortho=3.3", () => {
    const rates = groupTurnoverByDeptV13(records);
    expect(rates[0].dept).toBe("cardio");
    expect(rates[0].rate).toBe(10);
    expect(rates[1].dept).toBe("ortho");
    expect(rates[1].rate).toBe(3.3);
  });
});

describe("identifyHighTurnoverDeptsV13", () => {
  // 算式：阈值=8；cardio=10>8 → 预警；ortho=3.3<8 → 不预警
  it("高流失科室 = cardio", () => {
    const rates = groupTurnoverByDeptV13(records);
    const high = identifyHighTurnoverDeptsV13(rates, 8);
    expect(high.length).toBe(1);
    expect(high[0].dept).toBe("cardio");
  });
});

describe("staffTurnoverV13Routes 读路由", () => {
  it("GET /api/v1/staff-turnover 路由存在且 auth:true", () => {
    const route = staffTurnoverV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/staff-turnover",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
