/**
 * 健澜科技 jlmedaios - 病案首页质控 V14 单测（M480-C）
 *
 * 测试 checkFrontPageFields 校验、computeFrontPageScore 得分计算、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkFrontPageFields,
  computeFrontPageScore,
  type FrontPageFieldV14,
  type FrontPageQcResultV14,
} from "../../src/bff/aggregators/emrFrontPageQcV14Aggregator";
import { emrFrontPageQcV14Routes } from "../../src/bff/routes/emrFrontPageQcV14";
import type { RouteDef } from "../../src/bff/types";

describe("checkFrontPageFields 4填1缺", () => {
  // 手算：5 字段 4 填 1 缺 → missingFields 含 1 项
  it("5 字段 4 填 1 缺 → missingFields 含 1 项", () => {
    const fields: FrontPageFieldV14[] = [
      { name: "姓名", filled: true },
      { name: "性别", filled: true },
      { name: "年龄", filled: true },
      { name: "主诊断", filled: true },
      { name: "入院日期", filled: false },
    ];
    const result: FrontPageQcResultV14 = checkFrontPageFields(fields);
    expect(result.filledCount).toBe(4);
    expect(result.missingFields.length).toBe(1);
    expect(result.missingFields[0]).toBe("入院日期");
  });
});

describe("checkFrontPageFields 全填", () => {
  // 手算：5 字段全填 → missingFields=[]
  it("5 字段全填 → missingFields=[]", () => {
    const fields: FrontPageFieldV14[] = [
      { name: "姓名", filled: true },
      { name: "性别", filled: true },
      { name: "年龄", filled: true },
      { name: "主诊断", filled: true },
      { name: "入院日期", filled: true },
    ];
    const result: FrontPageQcResultV14 = checkFrontPageFields(fields);
    expect(result.missingFields).toEqual([]);
  });
});

describe("computeFrontPageScore 80", () => {
  // 手算：filledCount=4, total=5 → 4/5×100 = 80
  it("filledCount=4, total=5 → score=80", () => {
    const score = computeFrontPageScore({ filledCount: 4, total: 5 });
    expect(score).toBe(80);
  });
});

describe("computeFrontPageScore 100", () => {
  // 手算：filledCount=5, total=5 → 5/5×100 = 100
  it("filledCount=5, total=5 → score=100", () => {
    const score = computeFrontPageScore({ filledCount: 5, total: 5 });
    expect(score).toBe(100);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-front-page-qc auth:true", () => {
    const def = (emrFrontPageQcV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-front-page-qc");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
