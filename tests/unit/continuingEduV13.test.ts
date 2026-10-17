/**
 * 健澜科技 jlmedaios - 继续医学教育 V13 单测（M343-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgCreditV13,
  computeCategory1CountV13,
  computeCategory2CountV13,
  type ContinuingEduRecordV13,
} from "../../src/bff/aggregators/continuingEduV13Aggregator";
import { continuingEduV13Routes } from "../../src/bff/routes/continuingEduV13";

const records: ContinuingEduRecordV13[] = [
  { category1Count: 5, category2Count: 10, avgCredit: 20 },
  { category1Count: 3, category2Count: 7, avgCredit: 30 },
  { category1Count: 0, category2Count: 0, avgCredit: 40 },
];

describe("computeCategory1CountV13", () => {
  // 算式：5+3+0 = 8
  it("Ⅰ类学分项目数 = 8", () => {
    expect(computeCategory1CountV13(records)).toBe(8);
  });
  it("空态 → 0", () => {
    expect(computeCategory1CountV13([])).toBe(0);
  });
});

describe("computeCategory2CountV13", () => {
  // 算式：10+7+0 = 17
  it("Ⅱ类学分项目数 = 17", () => {
    expect(computeCategory2CountV13(records)).toBe(17);
  });
});

describe("computeAvgCreditV13", () => {
  // 算式：(20+30+40)/3 = 90/3 = 30.0
  it("人均学分数 = 30.0", () => {
    expect(computeAvgCreditV13(records)).toBe(30.0);
  });
});

describe("continuingEduV13Routes 读路由", () => {
  it("GET /api/v1/continuing-edu 路由存在且 auth:true", () => {
    const route = continuingEduV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/continuing-edu",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
