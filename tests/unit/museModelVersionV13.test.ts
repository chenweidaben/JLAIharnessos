/**
 * 健澜科技 jlmedaios - 模型版本迭代记录 V13 单测（M321-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeVersionImprovementV13,
  latestVersionV13,
  listModelVersionsV13,
  type ModelVersionV13,
} from "../../src/bff/aggregators/museModelVersionV13Aggregator";
import { museModelVersionV13Routes } from "../../src/bff/routes/museModelVersionV13";

const versions: ModelVersionV13[] = [
  { version: "v1", trainingSamples: 1000, releaseDate: "2026-01", hitRate: 75 },
  { version: "v2", trainingSamples: 2000, releaseDate: "2026-06", hitRate: 80 },
  { version: "v3", trainingSamples: 3000, releaseDate: "2026-10", hitRate: 85 },
];

describe("listModelVersionsV13", () => {
  it("返回 3 个版本", () => {
    expect(listModelVersionsV13(versions).length).toBe(3);
  });
  it("空态 → []", () => {
    expect(listModelVersionsV13([]).length).toBe(0);
  });
});

describe("computeVersionImprovementV13", () => {
  // 算式：v2.hitRate - v1.hitRate = 80 - 75 = 5
  it("v2-v1 improvement = +5pp", () => {
    expect(computeVersionImprovementV13(versions[0], versions[1])).toBe(5);
  });
  // 算式：v3.hitRate - v2.hitRate = 85 - 80 = 5
  it("v3-v2 improvement = +5pp", () => {
    expect(computeVersionImprovementV13(versions[1], versions[2])).toBe(5);
  });
});

describe("latestVersionV13", () => {
  // 算式：按 releaseDate 排序，最新 = v3 (2026-10)
  it("latestVersion = v3", () => {
    expect(latestVersionV13(versions)?.version).toBe("v3");
  });
  it("空态 → null", () => {
    expect(latestVersionV13([])).toBeNull();
  });
});

describe("museModelVersionV13Routes 读路由", () => {
  it("GET /api/v1/muse-model-version 路由存在且 auth:true", () => {
    const route = museModelVersionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/muse-model-version",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
