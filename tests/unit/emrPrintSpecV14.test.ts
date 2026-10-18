/**
 * 健澜科技 jlmedaios - 病历打印规范 V14 单测（M478-C）
 *
 * 测试 buildPrintSpec 构建、validatePrintLayout 版式校验、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPrintSpec,
  validatePrintLayout,
  type PrintSpecV14,
} from "../../src/bff/aggregators/emrPrintSpecV14Aggregator";
import { emrPrintSpecV14Routes } from "../../src/bff/routes/emrPrintSpecV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPrintSpec 构建", () => {
  // 手算：name='A4打印', paperSize='A4', hasWatermark=true → 正确构建
  it("name=A4打印, paperSize=A4, hasWatermark=true → 正确构建", () => {
    const spec = buildPrintSpec("A4打印", "A4", true);
    expect(spec.name).toBe("A4打印");
    expect(spec.paperSize).toBe("A4");
    expect(spec.hasWatermark).toBe(true);
  });
});

describe("validatePrintLayout A4+有水印", () => {
  // 手算：A4 + hasWatermark=true → valid=true, issues=[]
  it("A4+有水印 → valid=true, issues=[]", () => {
    const spec: PrintSpecV14 = { name: "A4打印", paperSize: "A4", hasWatermark: true };
    const result = validatePrintLayout(spec);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });
});

describe("validatePrintLayout A4+无水印", () => {
  // 手算：A4 + hasWatermark=false → valid=false, issues 含"缺少水印"
  it("A4+无水印 → valid=false, issues 含'缺少水印'", () => {
    const spec: PrintSpecV14 = { name: "A4草稿", paperSize: "A4", hasWatermark: false };
    const result = validatePrintLayout(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("缺少水印"))).toBe(true);
  });
});

describe("validatePrintLayout B5+有水印", () => {
  // 手算：B5 + hasWatermark=true → valid=false, issues 含"纸张规格"
  it("B5+有水印 → valid=false, issues 含'纸张规格'", () => {
    const spec: PrintSpecV14 = { name: "B5打印", paperSize: "B5", hasWatermark: true };
    const result = validatePrintLayout(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("纸张规格"))).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-print-spec auth:true", () => {
    const def = (emrPrintSpecV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-print-spec");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
