/**
 * 健澜科技 jlmedaios - 病历隐私脱敏展示 V14 单测（M466-B）
 *
 * 测试 maskPatientInfo 手机号→138****5678、姓名→张**、maskByRole doctor 不脱敏、public 全脱敏、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  maskByRole,
  maskPatientInfo,
} from "../../src/bff/aggregators/emrMaskingV14Aggregator";
import { emrMaskingV14Routes } from "../../src/bff/routes/emrMaskingV14";
import type { RouteDef } from "../../src/bff/types";

describe("maskPatientInfo 手机号", () => {
  // 手算：138 1234 5678 → 138 **** 5678
  it("手机号'13812345678' → '138****5678'", () => {
    expect(maskPatientInfo("13812345678")).toBe("138****5678");
  });
});

describe("maskPatientInfo 姓名", () => {
  // 手算："张三丰" → 保留姓"张" + 2 个* = "张**"
  it("姓名'张三丰' → '张**'", () => {
    expect(maskPatientInfo("张三丰")).toBe("张**");
  });
});

describe("maskByRole doctor", () => {
  // 手算：doctor 全见不脱敏 → 原样返回
  it("doctor → 不脱敏，原样返回", () => {
    const text = "患者张三丰，手机号 13812345678";
    expect(maskByRole("doctor", text)).toBe(text);
  });
});

describe("maskByRole public", () => {
  // 手算：public 全部脱敏 → 手机号被脱敏，含 ****
  it("public → 手机号被脱敏（含 ****）", () => {
    const masked = maskByRole("public", "手机号 13812345678");
    expect(masked).toContain("****");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-masking/:noteId auth:true", () => {
    const def = (emrMaskingV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-masking/:noteId");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
