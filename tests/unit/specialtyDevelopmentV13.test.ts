/**
 * 健澜科技 jlmedaios - 重点专科建设 V13 单测（M355-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMunicipalSpecialtyCountV13,
  computeNationalSpecialtyCountV13,
  computeProvincialSpecialtyCountV13,
  type SpecialtyDevelopmentRecordV13,
} from "../../src/bff/aggregators/specialtyDevelopmentV13Aggregator";
import { specialtyDevelopmentV13Routes } from "../../src/bff/routes/specialtyDevelopmentV13";

const records: SpecialtyDevelopmentRecordV13[] = [
  { nationalSpecialtyCount: 1, provincialSpecialtyCount: 2, municipalSpecialtyCount: 3 },
  { nationalSpecialtyCount: 2, provincialSpecialtyCount: 3, municipalSpecialtyCount: 4 },
];

describe("computeNationalSpecialtyCountV13", () => {
  // 算式：1+2 = 3
  it("国家级重点专科数 = 3 个", () => {
    expect(computeNationalSpecialtyCountV13(records)).toBe(3);
  });
  it("空态 → 0", () => {
    expect(computeNationalSpecialtyCountV13([])).toBe(0);
  });
});

describe("computeProvincialSpecialtyCountV13", () => {
  // 算式：2+3 = 5
  it("省级重点专科数 = 5 个", () => {
    expect(computeProvincialSpecialtyCountV13(records)).toBe(5);
  });
});

describe("computeMunicipalSpecialtyCountV13", () => {
  // 算式：3+4 = 7
  it("市级重点专科数 = 7 个", () => {
    expect(computeMunicipalSpecialtyCountV13(records)).toBe(7);
  });
});

describe("specialtyDevelopmentV13Routes 读路由", () => {
  it("GET /api/v1/specialty-development 路由存在且 auth:true", () => {
    const route = specialtyDevelopmentV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/specialty-development",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
