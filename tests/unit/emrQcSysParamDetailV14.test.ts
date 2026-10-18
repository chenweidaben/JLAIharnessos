/**
 * 健澜科技 jlmedaios - 质控系统参数配置明细 V14 单测（M507-A，-detail 避让）
 *
 * 测试 buildParam 构建、setParam 设置、getParam 查询、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildParam,
  getParam,
  setParam,
  type SysParamDetailV14,
} from "../../src/bff/aggregators/emrQcSysParamDetailV14Aggregator";
import { emrQcSysParamDetailV14Routes } from "../../src/bff/routes/emrQcSysParamDetailV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildParam 自动质控", () => {
  // 手算：key='qc.autoCheck', value='true', desc='是否自动质控' → 正确构建
  it("key='qc.autoCheck', value='true', desc='是否自动质控' → 正确构建", () => {
    const param: SysParamDetailV14 = buildParam("qc.autoCheck", "true", "是否自动质控");
    expect(param.key).toBe("qc.autoCheck");
    expect(param.value).toBe("true");
    expect(param.desc).toBe("是否自动质控");
  });
});

describe("setParam 空列表新增", () => {
  // 手算：空列表+新参数 → 返回长度 1（0+1=1）
  it("空列表+新参数 → 返回长度 1", () => {
    const params: SysParamDetailV14[] = [];
    const param = buildParam("qc.autoCheck", "true", "是否自动质控");
    const result = setParam(params, param);
    expect(result.length).toBe(1);
  });
});

describe("getParam 按 key 查找", () => {
  // 手算：列表有 2 参数，key='qc.autoCheck' → 返回正确参数
  it("列表有 2 参数，key='qc.autoCheck' → 返回正确参数", () => {
    const params: SysParamDetailV14[] = [
      buildParam("qc.autoCheck", "true", "是否自动质控"),
      buildParam("qc.defectThreshold", "5", "缺陷告警阈值"),
    ];
    const result = getParam(params, "qc.autoCheck");
    expect(result).toBeDefined();
    expect(result?.value).toBe("true");
  });
});

describe("getParam 不存在", () => {
  // 手算：key='notExist' → 返回 undefined
  it("key='notExist' → 返回 undefined", () => {
    const params: SysParamDetailV14[] = [
      buildParam("qc.autoCheck", "true", "是否自动质控"),
      buildParam("qc.defectThreshold", "5", "缺陷告警阈值"),
    ];
    const result = getParam(params, "notExist");
    expect(result).toBeUndefined();
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-sys-param-detail auth:true", () => {
    const def = (emrQcSysParamDetailV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-sys-param-detail");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
