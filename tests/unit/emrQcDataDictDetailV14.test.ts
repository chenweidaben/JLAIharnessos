/**
 * 健澜科技 jlmedaios - 质控数据字典管理明细 V14 单测（M507-C，-detail 避让）
 *
 * 测试 buildDict 构建、addDict 添加、removeDict 移除、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  addDict,
  buildDict,
  removeDict,
  type DataDictDetailV14,
} from "../../src/bff/aggregators/emrQcDataDictDetailV14Aggregator";
import { emrQcDataDictDetailV14Routes } from "../../src/bff/routes/emrQcDataDictDetailV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDict 致命缺陷", () => {
  // 手算：type='缺陷等级', code='BLOCK', label='致命缺陷' → 正确构建
  it("type='缺陷等级', code='BLOCK', label='致命缺陷' → 正确构建", () => {
    const dict: DataDictDetailV14 = buildDict("缺陷等级", "BLOCK", "致命缺陷");
    expect(dict.type).toBe("缺陷等级");
    expect(dict.code).toBe("BLOCK");
    expect(dict.label).toBe("致命缺陷");
  });
});

describe("addDict 空列表添加", () => {
  // 手算：空列表+新字典 → 返回长度 1（0+1=1）
  it("空列表+新字典 → 返回长度 1", () => {
    const dicts: DataDictDetailV14[] = [];
    const dict = buildDict("缺陷等级", "BLOCK", "致命缺陷");
    const result = addDict(dicts, dict);
    expect(result.length).toBe(1);
  });
});

describe("removeDict 移除字典", () => {
  // 手算：列表有 2 字典，移除 code='BLOCK' → 返回长度 1（2-1=1）
  it("列表有 2 字典，code='BLOCK' → 返回长度 1", () => {
    const dicts: DataDictDetailV14[] = [
      buildDict("缺陷等级", "BLOCK", "致命缺陷"),
      buildDict("病历类型", "OUTPATIENT", "门诊病历"),
    ];
    const result = removeDict(dicts, "BLOCK");
    expect(result.length).toBe(1);
    expect(result[0].code).toBe("OUTPATIENT");
  });
});

describe("buildDict 门诊病历", () => {
  // 手算：type='病历类型', code='OUTPATIENT', label='门诊病历' → 正确构建
  it("type='病历类型', code='OUTPATIENT', label='门诊病历' → 正确构建", () => {
    const dict: DataDictDetailV14 = buildDict("病历类型", "OUTPATIENT", "门诊病历");
    expect(dict.type).toBe("病历类型");
    expect(dict.code).toBe("OUTPATIENT");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-data-dict-detail auth:true", () => {
    const def = (emrQcDataDictDetailV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-data-dict-detail");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
