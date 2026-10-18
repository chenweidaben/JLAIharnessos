/**
 * 健澜科技 jlmedaios - 质控系统参数配置 V14 单测（M498-A）
 *
 * 测试 buildSysParam 构建、validateSysParam 校验、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSysParam,
  validateSysParam,
  type SysParamV14,
} from "../../src/bff/aggregators/emrQcSysParamV14Aggregator";
import { emrQcSysParamV14Routes } from "../../src/bff/routes/emrQcSysParamV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildSysParam 阈值参数", () => {
  // 手算：key='maxDefectThreshold', value='5' → 正确构建
  it("key='maxDefectThreshold', value='5' → 正确构建", () => {
    const param: SysParamV14 = buildSysParam("maxDefectThreshold", "5");
    expect(param.key).toBe("maxDefectThreshold");
    expect(param.value).toBe("5");
  });
});

describe("validateSysParam 完整参数", () => {
  // 手算：完整参数 → valid=true, errors=[]
  it("完整参数 → valid=true, errors=[]", () => {
    const param = buildSysParam("maxDefectThreshold", "5");
    const result = validateSysParam(param);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe("validateSysParam 缺失key", () => {
  // 手算：缺失 key → valid=false, errors 包含'key 必填'
  it("缺失 key → valid=false, errors 包含'key 必填'", () => {
    const param = buildSysParam("", "5");
    const result = validateSysParam(param);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("key 必填");
  });
});

describe("validateSysParam 缺失value", () => {
  // 手算：缺失 value → valid=false, errors 包含'value 必填'
  it("缺失 value → valid=false, errors 包含'value 必填'", () => {
    const param = buildSysParam("maxDefectThreshold", "");
    const result = validateSysParam(param);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("value 必填");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-sys-param auth:true", () => {
    const def = (emrQcSysParamV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-sys-param");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
