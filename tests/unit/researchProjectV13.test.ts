/**
 * 健澜科技 jlmedaios - 科研项目 V13 单测（M343-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMunicipalCountV13,
  computeNationalCountV13,
  computeProvincialCountV13,
  type ResearchProjectRecordV13,
} from "../../src/bff/aggregators/researchProjectV13Aggregator";
import { researchProjectV13Routes } from "../../src/bff/routes/researchProjectV13";

const records: ResearchProjectRecordV13[] = [
  { nationalCount: 2, provincialCount: 5, municipalCount: 10 },
  { nationalCount: 3, provincialCount: 5, municipalCount: 10 },
];

describe("computeNationalCountV13", () => {
  // 算式：2+3 = 5
  it("新立项国家级数 = 5", () => {
    expect(computeNationalCountV13(records)).toBe(5);
  });
  it("空态 → 0", () => {
    expect(computeNationalCountV13([])).toBe(0);
  });
});

describe("computeProvincialCountV13", () => {
  // 算式：5+5 = 10
  it("新立项省部级数 = 10", () => {
    expect(computeProvincialCountV13(records)).toBe(10);
  });
});

describe("computeMunicipalCountV13", () => {
  // 算式：10+10 = 20
  it("新立项市厅级数 = 20", () => {
    expect(computeMunicipalCountV13(records)).toBe(20);
  });
});

describe("researchProjectV13Routes 读路由", () => {
  it("GET /api/v1/research-project 路由存在且 auth:true", () => {
    const route = researchProjectV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/research-project",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
