/**
 * 健澜科技 jlmedaios - 科室运营画像 V5 单测（M287-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDeptProfileV5,
  classifyDeptV5,
  compareDeptV5,
  type DeptProfile,
} from "../../src/bff/aggregators/deptProfileV5Aggregator";
import { deptProfileV5Routes } from "../../src/bff/routes/deptProfileV5";

const cardio: DeptProfile = { deptName: "心内科", revenue: 1200, cost: 800, cmi: 2.1, avgStayDays: 6.5, satisfaction: 92, rankScore: 92, headcount: 45 };
const peds: DeptProfile = { deptName: "儿科", revenue: 500, cost: 480, cmi: 1.2, avgStayDays: 4.5, satisfaction: 78, rankScore: 55, headcount: 28 };

describe("buildDeptProfileV5", () => {
  it("心内科利润=400，利润率33.3%", () => {
    const p = buildDeptProfileV5(cardio);
    expect(p.profit).toBe(400);
    expect(p.profitMarginPct).toBeCloseTo(33.3, 1);
  });
  it("score=92→green", () => {
    expect(buildDeptProfileV5(cardio).health).toBe("green");
  });
  it("score=55→red", () => {
    expect(buildDeptProfileV5(peds).health).toBe("red");
  });
});

describe("compareDeptV5", () => {
  it("心内科vs儿科：利润差=400-20=380", () => {
    const c = compareDeptV5(cardio, peds);
    expect(c.deltaProfit).toBe(380);
    expect(c.higherRevenue).toBe("心内科");
    expect(c.higherSatisfaction).toBe("心内科");
  });
});

describe("classifyDeptV5", () => {
  it("边界值：80绿、60黄、59红", () => {
    expect(classifyDeptV5(80)).toBe("green");
    expect(classifyDeptV5(60)).toBe("yellow");
    expect(classifyDeptV5(59)).toBe("red");
  });
});

describe("deptProfileV5Routes 写权限", () => {
  it("POST /api/v1/dept-profile/snapshot 路由存在且 auth:true", () => {
    const post = deptProfileV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/dept-profile/snapshot");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
