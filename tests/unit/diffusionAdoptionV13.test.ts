/**
 * 健澜科技 jlmedaios - 跨科室采纳反馈 V13 单测（M304-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDiffusionAdoptionRateV13,
  flagDiffusionFailureV13,
  trackDiffusionAdoptionV13,
  type DiffusionActionV13,
} from "../../src/bff/aggregators/diffusionAdoptionV13Aggregator";
import { diffusionAdoptionV13Routes } from "../../src/bff/routes/diffusionAdoptionV13";

const actions: DiffusionActionV13[] = [
  { experienceId: "e-1", deptId: "surgery", action: "adopted" },
  { experienceId: "e-1", deptId: "emergency", action: "adopted" },
  { experienceId: "e-1", deptId: "neurology", action: "adopted" },
  { experienceId: "e-1", deptId: "pediatrics", action: "rejected" },
];

describe("trackDiffusionAdoptionV13", () => {
  it("透传并标 tracked=true", () => {
    const t = trackDiffusionAdoptionV13(actions[0]);
    expect(t.tracked).toBe(true);
    expect(t.deptId).toBe("surgery");
  });
});

describe("computeDiffusionAdoptionRateV13", () => {
  // 算式：3 adopted + 1 rejected = 4 total → 3/4×100 = 75
  it("4条(3 adopted) → 75%", () => {
    expect(computeDiffusionAdoptionRateV13(actions)).toBe(75);
  });
  it("空态 → 0", () => {
    expect(computeDiffusionAdoptionRateV13([])).toBe(0);
  });
});

describe("flagDiffusionFailureV13", () => {
  // 算式：rate=75 ≥ 30 → 无失败
  it("rate=75 → 无失败", () => {
    expect(flagDiffusionFailureV13(75)).toBe("");
  });
  // 算式：rate=20 < 30 → 提示停止扩散
  it("rate=20 → '该经验外科室不适用'", () => {
    expect(flagDiffusionFailureV13(20)).toContain("外科室不适用");
  });
});

describe("diffusionAdoptionV13Routes 读路由", () => {
  it("GET /api/v1/diffusion-adoption 路由存在且 auth:true", () => {
    const route = diffusionAdoptionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/diffusion-adoption",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
