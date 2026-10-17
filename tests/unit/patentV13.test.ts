/**
 * 健澜科技 jlmedaios - 专利授权 V13 单测（M343-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDesignCountV13,
  computeInventionCountV13,
  computeUtilityModelCountV13,
  type PatentRecordV13,
} from "../../src/bff/aggregators/patentV13Aggregator";
import { patentV13Routes } from "../../src/bff/routes/patentV13";

const records: PatentRecordV13[] = [
  { inventionCount: 2, utilityModelCount: 5, designCount: 3 },
  { inventionCount: 3, utilityModelCount: 5, designCount: 7 },
];

describe("computeInventionCountV13", () => {
  // 算式：2+3 = 5
  it("发明专利授权数 = 5", () => {
    expect(computeInventionCountV13(records)).toBe(5);
  });
  it("空态 → 0", () => {
    expect(computeInventionCountV13([])).toBe(0);
  });
});

describe("computeUtilityModelCountV13", () => {
  // 算式：5+5 = 10
  it("实用新型授权数 = 10", () => {
    expect(computeUtilityModelCountV13(records)).toBe(10);
  });
});

describe("computeDesignCountV13", () => {
  // 算式：3+7 = 10
  it("外观设计授权数 = 10", () => {
    expect(computeDesignCountV13(records)).toBe(10);
  });
});

describe("patentV13Routes 读路由", () => {
  it("GET /api/v1/patent 路由存在且 auth:true", () => {
    const route = patentV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patent",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
