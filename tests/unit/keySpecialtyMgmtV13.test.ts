/**
 * 健澜科技 jlmedaios - 重点专科管理 V13 单测（M403-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNationalKeySpecialtyCountV13,
  computeProvincialKeySpecialtyCountV13,
  computeSpecialtyRadiationHospitalCountV13,
  type KeySpecialtyMgmtRecordV13,
} from "../../src/bff/aggregators/keySpecialtyMgmtV13Aggregator";
import { keySpecialtyMgmtV13Routes } from "../../src/bff/routes/keySpecialtyMgmtV13";

const records: KeySpecialtyMgmtRecordV13[] = [
  { nationalCount: 2, provincialCount: 5, radiationHospitals: 8 },
  { nationalCount: 2, provincialCount: 5, radiationHospitals: 8 },
];

describe("computeNationalKeySpecialtyCountV13", () => {
  // 算式：2+2 = 4
  it("国家级重点专科数 = 4 个", () => {
    expect(computeNationalKeySpecialtyCountV13(records)).toBe(4);
  });
  it("空态 → 0", () => {
    expect(computeNationalKeySpecialtyCountV13([])).toBe(0);
  });
});

describe("computeProvincialKeySpecialtyCountV13", () => {
  // 算式：5+5 = 10
  it("省级重点专科数 = 10 个", () => {
    expect(computeProvincialKeySpecialtyCountV13(records)).toBe(10);
  });
});

describe("computeSpecialtyRadiationHospitalCountV13", () => {
  // 算式：8+8 = 16
  it("专科辐射带动医院数 = 16 家", () => {
    expect(computeSpecialtyRadiationHospitalCountV13(records)).toBe(16);
  });
});

describe("keySpecialtyMgmtV13Routes 读路由", () => {
  it("GET /api/v1/key-specialty-mgmt 路由存在且 auth:true", () => {
    const route = keySpecialtyMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/key-specialty-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
