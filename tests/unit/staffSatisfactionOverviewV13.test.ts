/**
 * 健澜科技 jlmedaios - 员工满意度总览 V13 单测（M332-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOverallStaffScoreV13,
  rankDepartmentsByScoreV13,
  type StaffSatisfactionSurveyV13,
} from "../../src/bff/aggregators/staffSatisfactionOverviewV13Aggregator";
import { staffSatisfactionOverviewV13Routes } from "../../src/bff/routes/staffSatisfactionOverviewV13";

const surveys: StaffSatisfactionSurveyV13[] = [
  { department: "心内科", score: 4.0 },
  { department: "骨科", score: 3.5 },
  { department: "神经内科", score: 4.5 },
];

describe("computeOverallStaffScoreV13", () => {
  // 算式：(4.0+3.5+4.5)/3 = 12/3 = 4.0
  it("全院均分 = 4.0", () => {
    expect(computeOverallStaffScoreV13(surveys)).toBe(4.0);
  });
  it("空态 → 0", () => {
    expect(computeOverallStaffScoreV13([])).toBe(0);
  });
});

describe("rankDepartmentsByScoreV13", () => {
  // 算式：4.5 > 4.0 > 3.5，首位 = 神经内科 4.5
  it("排名首位 = 神经内科 4.5", () => {
    const ranking = rankDepartmentsByScoreV13(surveys);
    expect(ranking.length).toBe(3);
    expect(ranking[0].department).toBe("神经内科");
    expect(ranking[0].score).toBe(4.5);
  });
});

describe("staffSatisfactionOverviewV13Routes 读路由", () => {
  it("GET /api/v1/staff-satisfaction-overview 路由存在且 auth:true", () => {
    const route = staffSatisfactionOverviewV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/staff-satisfaction-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
