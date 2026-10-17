/**
 * 健澜科技 jlmedaios - 相似医生协同推荐 V13 单测（M303-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  borrowPreferenceV13,
  computeDoctorSimilarityV13,
  findLookAlikeDoctorsV13,
  type DoctorVectorV13,
} from "../../src/bff/aggregators/lookAlikeV13Aggregator";
import { lookAlikeV13Routes } from "../../src/bff/routes/lookAlikeV13";

const doctors: DoctorVectorV13[] = [
  { doctorId: "dr-wang", vector: [3, 3, 2, 3] },
  { doctorId: "dr-zhang", vector: [4, 4, 4, 4] },
  { doctorId: "dr-li", vector: [-2, -2, -2, -2] },
];

describe("computeDoctorSimilarityV13", () => {
  it("dr-wang vs dr-zhang = 0.99（同向高相似）", () => {
    const s = computeDoctorSimilarityV13(doctors[0], doctors[1]);
    expect(s).toBeCloseTo(0.99, 2);
  });
  it("dr-wang vs dr-li = -0.99（反向）", () => {
    const s = computeDoctorSimilarityV13(doctors[0], doctors[2]);
    expect(s).toBeCloseTo(-0.99, 2);
  });
});

describe("findLookAlikeDoctorsV13", () => {
  it("Top2：dr-zhang(0.99) 第一，dr-li(-0.99) 第二", () => {
    const top = findLookAlikeDoctorsV13(doctors[0], doctors, 2);
    expect(top.length).toBe(2);
    expect(top[0].doctorId).toBe("dr-zhang");
  });
  it("空态 → 0", () => {
    expect(findLookAlikeDoctorsV13(doctors[0], [], 2).length).toBe(0);
  });
});

describe("borrowPreferenceV13", () => {
  it("dr-zhang[4,4,4,4] + dr-li[-2,-2,-2,-2] 均值 = [1,1,1,1]", () => {
    const v = borrowPreferenceV13(doctors[0], [doctors[1], doctors[2]]);
    expect(v).toEqual([1, 1, 1, 1]);
  });
});

describe("lookAlikeV13Routes 读路由", () => {
  it("GET /api/v1/look-alike 路由存在且 auth:true", () => {
    const route = lookAlikeV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/look-alike",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
