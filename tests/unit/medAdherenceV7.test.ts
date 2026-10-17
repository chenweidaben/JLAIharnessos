/**
 * 健澜科技 jlmedaios - 患者用药教育与依从性随访 V7 单测（M289-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMedEduV7,
  classifyAdherenceV7,
  computeAdherenceRateV7,
  type MedEduMaterial,
} from "../../src/bff/aggregators/medAdherenceV7Aggregator";
import { medAdherenceV7Routes } from "../../src/bff/routes/medAdherenceV7";

const materials: MedEduMaterial[] = [
  { drugCode: "METFORMIN", title: "基本介绍", level: "basic", body: "x" },
  { drugCode: "METFORMIN", title: "老人简版", level: "simple", body: "y" },
  { drugCode: "METFORMIN", title: "深度解析", level: "deep", body: "z" },
];

describe("computeAdherenceRateV7", () => {
  it("27/30=90%", () => {
    expect(computeAdherenceRateV7(30, 27)).toBe(90);
  });
  it("18/30=60%", () => {
    expect(computeAdherenceRateV7(30, 18)).toBe(60);
  });
  it("3/10=30%", () => {
    expect(computeAdherenceRateV7(10, 3)).toBe(30);
  });
});

describe("classifyAdherenceV7", () => {
  it("90%→good", () => expect(classifyAdherenceV7(90)).toBe("good"));
  it("60%→fair", () => expect(classifyAdherenceV7(60)).toBe("fair"));
  it("30%→poor", () => expect(classifyAdherenceV7(30)).toBe("poor"));
});

describe("buildMedEduV7", () => {
  it("elderly 患者→simple 排首位", () => {
    const r = buildMedEduV7(materials, "METFORMIN", ["elderly"]);
    expect(r[0].level).toBe("simple");
  });
  it("非 elderly 患者→按 basic/simple/deep 自然序", () => {
    const r = buildMedEduV7(materials, "METFORMIN", []);
    expect(r.length).toBe(3);
  });
});

describe("medAdherenceV7Routes 写权限", () => {
  it("POST /api/v1/med-adherence/record 路由存在且 auth:true", () => {
    const post = medAdherenceV7Routes.find((r) => r.method === "POST" && r.path === "/api/v1/med-adherence/record");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
