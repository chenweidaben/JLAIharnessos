/**
 * 健澜科技 jlmedaios - 质控规范库管理 V14 单测（M505-A）
 *
 * 测试 buildNorm 构建、addNorm 添加、removeNorm 移除、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  addNorm,
  buildNorm,
  removeNorm,
  type NormLibraryV14,
} from "../../src/bff/aggregators/emrQcNormLibraryV14Aggregator";
import { emrQcNormLibraryV14Routes } from "../../src/bff/routes/emrQcNormLibraryV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildNorm 病历书写规范", () => {
  // 手算：title='病历书写规范', category='书写要求', version='V2.0' → 正确构建
  it("title='病历书写规范', category='书写要求', version='V2.0' → 正确构建", () => {
    const norm: NormLibraryV14 = buildNorm("病历书写规范", "书写要求", "V2.0");
    expect(norm.title).toBe("病历书写规范");
    expect(norm.category).toBe("书写要求");
    expect(norm.version).toBe("V2.0");
  });
});

describe("addNorm 空列表添加", () => {
  // 手算：空列表+新规范 → 返回长度 1（0+1=1）
  it("空列表+新规范 → 返回长度 1", () => {
    const norms: NormLibraryV14[] = [];
    const norm = buildNorm("病历书写规范", "书写要求", "V2.0");
    const result = addNorm(norms, norm);
    expect(result.length).toBe(1);
  });
});

describe("removeNorm 移除规范", () => {
  // 手算：列表有 2 规范，移除'病历书写规范' → 返回长度 1（2-1=1）
  it("列表有 2 规范，移除'病历书写规范' → 返回长度 1", () => {
    const norms: NormLibraryV14[] = [
      buildNorm("病历书写规范", "书写要求", "V2.0"),
      buildNorm("质控核心制度", "管理制度", "V1.5"),
    ];
    const result = removeNorm(norms, "病历书写规范");
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("质控核心制度");
  });
});

describe("buildNorm 质控核心制度", () => {
  // 手算：title='质控核心制度', category='管理制度', version='V1.5' → 正确构建
  it("title='质控核心制度', category='管理制度', version='V1.5' → 正确构建", () => {
    const norm: NormLibraryV14 = buildNorm("质控核心制度", "管理制度", "V1.5");
    expect(norm.title).toBe("质控核心制度");
    expect(norm.category).toBe("管理制度");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-norm-library auth:true", () => {
    const def = (emrQcNormLibraryV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-norm-library");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
