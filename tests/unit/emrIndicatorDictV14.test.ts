/**
 * 健澜科技 jlmedaios - 病历质控指标字典管理 V14 单测（M472-A 新规格）
 *
 * 测试 buildIndicatorDict 创建、searchIndicators 关键词搜索、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildIndicatorDict,
  searchIndicators,
  type IndicatorDictV14,
} from "../../src/bff/aggregators/emrIndicatorDictV14Aggregator";
import { emrIndicatorDictV14Routes } from "../../src/bff/routes/emrIndicatorDictV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildIndicatorDict 通过率", () => {
  // 手算：name='通过率', unit='%', direction='higher' → 正确创建
  it("name='通过率', unit='%', direction='higher' → 正确", () => {
    const item = buildIndicatorDict("通过率", "%", "higher");
    expect(item.name).toBe("通过率");
    expect(item.unit).toBe("%");
    expect(item.direction).toBe("higher");
  });
});

describe("buildIndicatorDict 缺陷率", () => {
  // 手算：name='缺陷率', unit='‰', direction='lower' → 正确创建
  it("name='缺陷率', unit='‰', direction='lower' → 正确", () => {
    const item = buildIndicatorDict("缺陷率", "‰", "lower");
    expect(item.name).toBe("缺陷率");
    expect(item.unit).toBe("‰");
    expect(item.direction).toBe("lower");
  });
});

describe("searchIndicators 关键词匹配", () => {
  // 手算：[{name:'通过率'},{name:'缺陷率'}]，keyword='通过' → name includes '通过' → 返回 1 条
  it("[{name:'通过率'},{name:'缺陷率'}]，keyword='通过' → 返回 1 条", () => {
    const items: IndicatorDictV14[] = [
      { id: "I1", name: "通过率", unit: "%", direction: "higher" },
      { id: "I2", name: "缺陷率", unit: "‰", direction: "lower" },
    ];
    const results = searchIndicators(items, "通过");
    expect(results.length).toBe(1);
    expect(results[0]?.name).toBe("通过率");
  });
});

describe("searchIndicators 无匹配", () => {
  // 手算：keyword='不存在xyz' → 无匹配 → 返回空数组 []
  it("keyword='不存在xyz' → 返回空数组", () => {
    const items: IndicatorDictV14[] = [
      { id: "I1", name: "通过率", unit: "%", direction: "higher" },
    ];
    expect(searchIndicators(items, "不存在xyz")).toEqual([]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-indicator-dict auth:true", () => {
    const def = (emrIndicatorDictV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-indicator-dict");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
