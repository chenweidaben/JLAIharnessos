/**
 * 健澜科技 jlmedaios - ICD 编码辅助与校对 V14 单测（M464-A）
 *
 * 测试 suggestIcdCodes 含肺炎→J18.9、含高血压+糖尿病→2个编码、无匹配→空数组、validateIcdCode 格式校验、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  suggestIcdCodes,
  validateIcdCode,
} from "../../src/bff/aggregators/emrIcdCodingV14Aggregator";
import { emrIcdCodingV14Routes } from "../../src/bff/routes/emrIcdCodingV14";
import type { RouteDef } from "../../src/bff/types";

describe("suggestIcdCodes 含肺炎", () => {
  // 手算：文本含"肺炎"→命中词表第一条→返回 J18.9
  it("文本含'肺炎' → 返回含 J18.9", () => {
    const result = suggestIcdCodes("患者因肺炎入院");
    expect(result.some((s) => s.code === "J18.9")).toBe(true);
  });
});

describe("suggestIcdCodes 含高血压+糖尿病", () => {
  // 手算：文本含"高血压"和"糖尿病"→命中 2 条词表→返回 2 个编码
  it("文本含'高血压 糖尿病' → 返回 2 个编码", () => {
    const result = suggestIcdCodes("患者有高血压和糖尿病史");
    expect(result.length).toBe(2);
  });
});

describe("suggestIcdCodes 无匹配", () => {
  // 手算：文本无任何关键词→返回空数组
  it("文本无匹配关键词 → 返回空数组", () => {
    const result = suggestIcdCodes("患者主诉头痛不适");
    expect(result).toEqual([]);
  });
});

describe("validateIcdCode 格式校验", () => {
  // 手算：J18.9 符合 字母+2数字+.小数 → true；XYZ99 不符合 → false
  it("'J18.9' → true；'XYZ99' → false", () => {
    expect(validateIcdCode("J18.9")).toBe(true);
    expect(validateIcdCode("XYZ99")).toBe(false);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-icd-coding/:noteId auth:true", () => {
    const def = (emrIcdCodingV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-icd-coding/:noteId");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
